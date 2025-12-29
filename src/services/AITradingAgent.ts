// AI Trading Agent
// Makes automated buy/sell decisions based on Argus analysis

import YahooFinanceProvider from './YahooFinanceProvider';
import AtlasEngine from './AtlasEngine';
import OrionAnalysisService from './OrionAnalysisService';
import ArgusDecisionEngine from './ArgusDecisionEngine';
import PaperBrokerService from './PaperBrokerService';
import type { ArgusDecision } from './ArgusDecisionEngine';
import type { Trade } from './PaperBrokerService';

export interface TradingSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    reason: string;
    decision: ArgusDecision;
    executed: boolean;
    trade?: Trade;
}

// Trading thresholds
const BUY_THRESHOLD = 50;  // Lowered to 50 for more activity (was 55)
const SELL_THRESHOLD = 40; // Raised to 40 to take profit/cut loss sooner (was 35)
const MIN_CONFIDENCE_FOR_BUY = ['High', 'Medium', 'Low']; // Accept all confidence levels

class AITradingAgent {
    private static instance: AITradingAgent;
    private isAutoTrading: boolean = false;

    private constructor() {
        this.loadState();
    }

    public static getInstance(): AITradingAgent {
        if (!AITradingAgent.instance) {
            AITradingAgent.instance = new AITradingAgent();
        }
        return AITradingAgent.instance;
    }

    private loadState(): void {
        try {
            const saved = localStorage.getItem('argus_autotrading');
            if (saved) {
                this.isAutoTrading = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load auto-trading state');
        }
    }

    private saveState(): void {
        try {
            localStorage.setItem('argus_autotrading', JSON.stringify(this.isAutoTrading));
        } catch (e) {
            console.warn('Failed to save auto-trading state');
        }
    }

    setAutoTrading(enabled: boolean): void {
        this.isAutoTrading = enabled;
        this.saveState();
    }

    isAutoTradingEnabled(): boolean {
        return this.isAutoTrading;
    }

    async analyzeAndTrade(symbol: string): Promise<TradingSignal> {
        // Fetch data and run analysis
        const [quote, candles, fundamentals] = await Promise.all([
            YahooFinanceProvider.fetchQuote(symbol),
            YahooFinanceProvider.fetchCandles(symbol),
            YahooFinanceProvider.fetchFundamentals(symbol)
        ]);

        const atlasResult = AtlasEngine.analyze(fundamentals);
        const orionResult = OrionAnalysisService.calculateOrionScore(candles);

        // Get news sentiment (import NewsService at top)
        let newsSentiment: { score: number; summary: string } | undefined;
        try {
            const NewsService = (await import('./NewsService')).default;
            newsSentiment = await NewsService.getNewsBasedSentiment(symbol);
        } catch { /* News optional */ }

        const decision = ArgusDecisionEngine.makeDecision({
            atlas: atlasResult,
            orion: orionResult,
            newsSentiment,
            symbol
        });

        // Determine action
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = '';

        const currentPosition = PaperBrokerService.getPosition(symbol);
        const hasPosition = currentPosition !== null && currentPosition.shares > 0;

        // Check for stop-loss first
        if (hasPosition && PaperBrokerService.shouldStopLoss(symbol, quote.price)) {
            action = 'SELL';
            reason = `🛑 STOP-LOSS triggered! Price dropped more than 10% from entry. Cutting losses to protect capital. Entry: $${currentPosition.avgCost.toFixed(2)}, Current: $${quote.price.toFixed(2)}`;
        }
        // Check for sell signal
        else if (hasPosition && decision.compositeScore < SELL_THRESHOLD) {
            action = 'SELL';
            reason = this.generateSellReason(decision, quote.price, currentPosition.avgCost);
        }
        // Check for buy signal (Entry or Adding to position)
        else if (decision.compositeScore >= BUY_THRESHOLD && MIN_CONFIDENCE_FOR_BUY.includes(decision.confidence)) {
            // Check if we can add more (max 3 adds per position usually, or max allocation)
            if (!hasPosition) {
                action = 'BUY';
                reason = this.generateBuyReason(decision, symbol);
            } else if (decision.compositeScore >= 65) { // Only add if score is very strong
                action = 'BUY';
                reason = `🚀 Adding to winner! Strong signal (${decision.compositeScore}) justifies increasing position. ${decision.explanation}`;
            } else {
                action = 'HOLD';
                reason = this.generateHoldReason(decision, hasPosition);
            }
        }
        // Hold
        else {
            action = 'HOLD';
            reason = this.generateHoldReason(decision, hasPosition);
        }

        // Execute trade if auto-trading is enabled
        let trade: Trade | undefined;
        let executed = false;

        if (this.isAutoTrading && action !== 'HOLD') {
            if (action === 'BUY') {
                const result = PaperBrokerService.buy(symbol, quote.price, reason, decision.compositeScore);
                if (result) {
                    trade = result;
                    executed = true;
                } else {
                    // Could not buy (insufficient funds or max position size)
                    console.log(`Could not execute BUY for ${symbol}: Insufficient funds or max size reached.`);
                }
            } else if (action === 'SELL') {
                const result = PaperBrokerService.sell(symbol, quote.price, reason, decision.compositeScore);
                if (result) {
                    trade = result;
                    executed = true;
                }
            }
        }

        return {
            symbol,
            action,
            reason,
            decision,
            executed,
            trade
        };
    }

    private generateBuyReason(decision: ArgusDecision, symbol: string): string {
        const reasons: string[] = [];

        reasons.push(`📈 AI detects strong opportunity for ${symbol}!`);
        reasons.push(`Composite Score: ${decision.compositeScore}/100 (above ${BUY_THRESHOLD} threshold)`);

        if (decision.coreScore >= 70) {
            reasons.push(`✅ Fundamentals are solid (Core: ${decision.coreScore})`);
        }
        if (decision.pulseScore >= 70) {
            reasons.push(`✅ Technicals show momentum (Pulse: ${decision.pulseScore})`);
        }

        reasons.push(`Signal: ${decision.finalSignal} | Confidence: ${decision.confidence}`);
        reasons.push(decision.explanation);

        return reasons.join('\n');
    }

    private generateSellReason(decision: ArgusDecision, currentPrice: number, avgCost: number): string {
        const plPercent = ((currentPrice - avgCost) / avgCost) * 100;
        const plSign = plPercent >= 0 ? '+' : '';

        const reasons: string[] = [];

        reasons.push(`📉 AI recommends closing position`);
        reasons.push(`Composite Score dropped to ${decision.compositeScore}/100 (below ${SELL_THRESHOLD} threshold)`);
        reasons.push(`Position P&L: ${plSign}${plPercent.toFixed(2)}%`);

        if (decision.coreScore < 40) {
            reasons.push(`⚠️ Fundamentals weakening (Core: ${decision.coreScore})`);
        }
        if (decision.pulseScore < 40) {
            reasons.push(`⚠️ Technical breakdown (Pulse: ${decision.pulseScore})`);
        }

        reasons.push(`Signal: ${decision.finalSignal}`);
        reasons.push(decision.explanation);

        return reasons.join('\n');
    }

    private generateHoldReason(decision: ArgusDecision, hasPosition: boolean): string {
        if (hasPosition) {
            return `Maintaining position. Score: ${decision.compositeScore}/100. No clear exit signal yet. ${decision.explanation}`;
        }

        if (decision.compositeScore >= 50 && decision.compositeScore < BUY_THRESHOLD) {
            return `Watching ${decision.compositeScore}/100. Waiting for stronger signal (need ${BUY_THRESHOLD}+). ${decision.explanation}`;
        }

        return `Score too low for entry: ${decision.compositeScore}/100. ${decision.explanation}`;
    }

    async scanWatchlist(symbols: string[]): Promise<TradingSignal[]> {
        const signals: TradingSignal[] = [];

        for (const symbol of symbols) {
            try {
                const signal = await this.analyzeAndTrade(symbol);
                signals.push(signal);
            } catch (e) {
                console.error(`Failed to analyze ${symbol}:`, e);
            }
        }

        return signals;
    }
}

export default AITradingAgent.getInstance();
