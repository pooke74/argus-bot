// Multi-AI Broker Service
// 3 distinct AI trading personalities with different risk profiles

import YahooFinanceProvider from './YahooFinanceProvider';
import AtlasEngine from './AtlasEngine';
import OrionAnalysisService from './OrionAnalysisService';
import PhoenixEngine from './PhoenixEngine';
import AetherEngine from './AetherEngine';
import ArgusDecisionEngine from './ArgusDecisionEngine';

// AI Trader Types
export type AIPersonality = 'aggressive' | 'balanced' | 'conservative' | 'high-frequency' | 'value';

export interface AITrade {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    shares: number;
    amount: number;
    timestamp: Date;
    reason: string;
    pnl?: number;
}

export interface AIPosition {
    symbol: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
}

export interface AITrader {
    id: AIPersonality;
    name: string;
    emoji: string;
    description: string;
    initialCapital: number;
    currentCash: number;
    positions: Map<string, AIPosition>;
    trades: AITrade[];
    lastThought: string;
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    tradeCount: number;
}

// Trading thresholds per personality - OPTIMIZED FOR PROFITABILITY
const THRESHOLDS = {
    aggressive: {
        // Higher entry threshold = fewer but better trades
        buyScore: 58,      // Was 45 - now requires stronger signals
        sellScore: 42,     // Was 55 - hold winners longer
        positionSize: 0.25, // Was 40% - less risk per trade
        maxPositions: 4,
        stopLoss: 0.06,    // 6% stop loss (was 15% - too loose!)
        takeProfit: 0.12,  // 12% take profit = 2:1 R/R ratio
        symbols: ['NVDA', 'AMD', 'TSLA', 'PLTR', 'META', 'MSFT'], // Quality + volatility
    },
    balanced: {
        buyScore: 62,      // Was 55 - higher quality entries
        sellScore: 38,     // Was 45 - hold winners longer
        positionSize: 0.20, // Was 25% - more diversified
        maxPositions: 5,
        stopLoss: 0.05,    // 5% stop loss (was 12% - too loose!)
        takeProfit: 0.10,  // 10% take profit = 2:1 R/R ratio
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'V', 'MA'],
    },
    conservative: {
        buyScore: 70,
        sellScore: 30,
        positionSize: 0.15,
        maxPositions: 6,
        stopLoss: 0.04,
        takeProfit: 0.08,
        symbols: ['JNJ', 'PG', 'XOM', 'V', 'GC=F', 'KO'],
    },
    'high-frequency': {
        buyScore: 50,      // Low threshold for volume
        sellScore: 50,     // Quick flips
        positionSize: 0.10, // Small positions
        maxPositions: 10,
        stopLoss: 0.015,    // Tight stop (1.5%)
        takeProfit: 0.03,   // Quick profit (3%)
        symbols: ['COIN', 'MSTR', 'RIOT', 'MARA', 'PLTR', 'AMD'], // High volatility
    },
    value: {
        buyScore: 75,      // Very selective
        sellScore: 25,     // Hold forever
        positionSize: 0.25, // Large conviction bets
        maxPositions: 4,
        stopLoss: 0.08,    // Wide stop for volatility
        takeProfit: 0.25,  // Huge upside target
        symbols: ['BRK-B', 'JPM', 'UNH', 'CVX', 'MCD', 'PEP'], // Fortresses
    }
};


const STORAGE_KEY = 'argus_multi_ai_traders';

class MultiAIBrokerService {
    private traders: Map<AIPersonality, AITrader> = new Map();
    private isRunning: boolean = false;

    constructor() {
        this.initializeTraders();
        this.loadState();
    }

    private initializeTraders(): void {
        // Aggressive (Risk-Taker)
        this.traders.set('aggressive', {
            id: 'aggressive',
            name: 'Aggressive Alex',
            emoji: '🔥',
            description: 'Yüksek risk, yüksek getiri. Volatil hisseleri tercih eder, hızlı al-sat yapar.',
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Piyasayı analiz ediyorum...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });

        // Balanced (Medium-Term)
        this.traders.set('balanced', {
            id: 'balanced',
            name: 'Balanced Bruce',
            emoji: '⚖️',
            description: 'Dengeli strateji. Orta vadeli düşünür, trend ve temel analizi birleştirir.',
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Fırsatları değerlendiriyorum...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });

        // Conservative (Long-Term)
        this.traders.set('conservative', {
            id: 'conservative',
            name: 'Conservative Carl',
            emoji: '🏦',
            description: 'Düşük risk, istikrarlı getiri. Defensive hisseleri sever, uzun vadeli düşünür.',
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Sabırla en iyi fırsatı bekliyorum...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });

        // High-Frequency (Neon)
        this.traders.set('high-frequency', {
            id: 'high-frequency',
            name: 'Neon HFT',
            emoji: '⚡',
            description: 'Saniyeler içinde işlem yapar. Scalping stratejisi ile küçük karları toplar.',
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Hız her şeydir...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });

        // Value (Titan)
        this.traders.set('value', {
            id: 'value',
            name: 'Titan Value',
            emoji: '🛡️',
            description: 'Warren Buffett tarzı. Gerçek değerin altındaki şirketleri bulur ve yıllarca tutar.',
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Değer yatırımı sabır işidir...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });
    }

    // Get all traders
    getTraders(): AITrader[] {
        return Array.from(this.traders.values());
    }

    getTrader(personality: AIPersonality): AITrader | undefined {
        return this.traders.get(personality);
    }

    // Run analysis for all AI traders
    async runAnalysis(): Promise<void> {
        const personalities: AIPersonality[] = ['aggressive', 'balanced', 'conservative', 'high-frequency', 'value'];

        for (const personality of personalities) {
            await this.analyzeAndTrade(personality);
        }

        this.saveState();
    }

    private async analyzeAndTrade(personality: AIPersonality): Promise<void> {
        const trader = this.traders.get(personality);
        if (!trader) return;

        const config = THRESHOLDS[personality];
        const thoughts: string[] = [];

        // Analyze each symbol for this personality
        for (const symbol of config.symbols) {
            try {
                // Fetch data
                const [quote, candles, fundamentals] = await Promise.all([
                    YahooFinanceProvider.fetchQuote(symbol),
                    YahooFinanceProvider.fetchCandles(symbol),
                    YahooFinanceProvider.fetchFundamentals(symbol).catch(() => null)
                ]);

                // Run analysis engines
                const atlas = fundamentals ? AtlasEngine.analyze(fundamentals) : null;
                const orion = OrionAnalysisService.calculateOrionScore(candles);
                const phoenix = PhoenixEngine.analyze(candles);

                let aether = null;
                try {
                    aether = await AetherEngine.evaluateMacro();
                } catch { /* optional */ }

                const decision = ArgusDecisionEngine.makeDecision({
                    atlas,
                    orion,
                    phoenix,
                    aether,
                    symbol
                });

                // Update position prices
                const position = trader.positions.get(symbol);
                if (position) {
                    position.currentPrice = quote.price;
                    position.pnl = (quote.price - position.avgCost) * position.shares;
                    position.pnlPercent = ((quote.price - position.avgCost) / position.avgCost) * 100;

                    // Check stop-loss
                    if (position.pnlPercent <= -(config.stopLoss * 100)) {
                        this.executeSell(trader, symbol, quote.price,
                            `🛑 STOP-LOSS! ${symbol} ${position.pnlPercent.toFixed(1)}% düştü. Zararı kesiyorum.`);
                        thoughts.push(`${symbol}: Stop-loss tetiklendi!`);
                        continue;
                    }

                    // Check take-profit
                    if (position.pnlPercent >= (config.takeProfit * 100)) {
                        this.executeSell(trader, symbol, quote.price,
                            `🎯 TAKE PROFIT! ${symbol} ${position.pnlPercent.toFixed(1)}% kazandı. Kârı realize ediyorum.`);
                        thoughts.push(`${symbol}: Kâr al sinyali!`);
                        continue;
                    }

                    // Sell signal
                    if (decision.compositeScore < config.sellScore) {
                        this.executeSell(trader, symbol, quote.price,
                            `📉 SATIŞ! ${symbol} skoru ${decision.compositeScore}'e düştü. ${decision.explanation}`);
                        thoughts.push(`${symbol}: Sat sinyali (${decision.compositeScore})`);
                    }
                } else {
                    // Buy signal
                    if (decision.compositeScore >= config.buyScore) {
                        const positionCount = trader.positions.size;
                        if (positionCount < config.maxPositions) {
                            const amount = trader.currentCash * config.positionSize;
                            if (amount >= 10 && trader.currentCash >= amount) {
                                this.executeBuy(trader, symbol, quote.price, amount,
                                    `📈 ALIŞ! ${symbol} skoru ${decision.compositeScore}. ${decision.explanation}`);
                                thoughts.push(`${symbol}: Al sinyali (${decision.compositeScore})`);
                            }
                        }
                    }
                }

            } catch (e) {
                console.error(`${personality} - ${symbol} analysis failed:`, e);
            }
        }

        // Update trader's thought
        if (thoughts.length > 0) {
            trader.lastThought = thoughts.join(' | ');
        } else {
            trader.lastThought = this.getIdleThought(personality);
        }

        // Update total value
        this.updateTraderStats(trader);
    }

    private executeBuy(trader: AITrader, symbol: string, price: number, amount: number, reason: string): void {
        const shares = amount / price;

        trader.currentCash -= amount;
        trader.positions.set(symbol, {
            symbol,
            shares,
            avgCost: price,
            currentPrice: price,
            pnl: 0,
            pnlPercent: 0
        });

        const trade: AITrade = {
            id: `${trader.id}-${Date.now()}`,
            symbol,
            action: 'BUY',
            price,
            shares,
            amount,
            timestamp: new Date(),
            reason
        };

        trader.trades.unshift(trade);
        trader.tradeCount++;

        console.log(`${trader.emoji} ${trader.name}: BOUGHT ${shares.toFixed(2)} ${symbol} @ $${price.toFixed(2)}`);
    }

    private executeSell(trader: AITrader, symbol: string, price: number, reason: string): void {
        const position = trader.positions.get(symbol);
        if (!position) return;

        const amount = position.shares * price;
        const pnl = (price - position.avgCost) * position.shares;

        trader.currentCash += amount;
        trader.positions.delete(symbol);

        const trade: AITrade = {
            id: `${trader.id}-${Date.now()}`,
            symbol,
            action: 'SELL',
            price,
            shares: position.shares,
            amount,
            timestamp: new Date(),
            reason,
            pnl
        };

        trader.trades.unshift(trade);
        trader.tradeCount++;

        console.log(`${trader.emoji} ${trader.name}: SOLD ${position.shares.toFixed(2)} ${symbol} @ $${price.toFixed(2)} (P&L: $${pnl.toFixed(2)})`);
    }

    private updateTraderStats(trader: AITrader): void {
        let positionValue = 0;
        trader.positions.forEach(pos => {
            positionValue += pos.shares * pos.currentPrice;
        });

        trader.totalValue = trader.currentCash + positionValue;
        trader.totalPnL = trader.totalValue - trader.initialCapital;
        trader.totalPnLPercent = (trader.totalPnL / trader.initialCapital) * 100;

        // Calculate win rate
        const closedTrades = trader.trades.filter(t => t.action === 'SELL');
        const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
        trader.winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
    }

    private getIdleThought(personality: AIPersonality): string {
        const thoughts = {
            aggressive: [
                'Yüksek volatilite arıyorum...',
                'Momentum fırsatları taranıyor...',
                'Hızlı hareket hazırlığı...',
                'Risk/ödül oranı hesaplanıyor...'
            ],
            balanced: [
                'Trend ve temelleri değerlendiriyorum...',
                'Dengeli portföy yapısı korunuyor...',
                'Piyasa koşulları analiz ediliyor...',
                'Orta vadeli fırsatlar araştırılıyor...'
            ],
            conservative: [
                'Güvenli liman hisseleri izleniyor...',
                'Uzun vadeli değer aranıyor...',
                'Sabırla en iyi fırsatı bekliyorum...',
                'Dividend aristocrats taranıyor...'
            ],
            'high-frequency': [
                'Spread analizi yapıyorum...',
                'Milisaniyelik fırsatlar...',
                'Likidite havuzlarını tarıyorum...',
                'Algo sinyalleri bekleniyor ⚡'
            ],
            value: [
                'Bilançoları inceliyorum...',
                'İçsel değer hesabı yapıyorum...',
                'Piyasa irrasyonelliğini bekliyorum...',
                'Hisse geri alımları kontrol ediliyor...'
            ]
        };

        const list = thoughts[personality];
        return list[Math.floor(Math.random() * list.length)];
    }

    // Reset all traders
    resetAll(): void {
        this.initializeTraders();
        this.saveState();
    }

    // Reset single trader
    resetTrader(personality: AIPersonality): void {
        const name = this.traders.get(personality)?.name || '';
        const emoji = this.traders.get(personality)?.emoji || '';
        const desc = this.traders.get(personality)?.description || '';

        this.traders.set(personality, {
            id: personality,
            name,
            emoji,
            description: desc,
            initialCapital: 1000,
            currentCash: 1000,
            positions: new Map(),
            trades: [],
            lastThought: 'Yeniden başlıyorum...',
            totalValue: 1000,
            totalPnL: 0,
            totalPnLPercent: 0,
            winRate: 0,
            tradeCount: 0
        });
        this.saveState();
    }

    // Persistence
    private saveState(): void {
        try {
            const state: Record<string, object> = {};
            this.traders.forEach((trader, key) => {
                state[key] = {
                    ...trader,
                    positions: Array.from(trader.positions.entries())
                };
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save AI traders state:', e);
        }
    }

    private loadState(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                Object.keys(state).forEach(key => {
                    const data = state[key];
                    const trader = this.traders.get(key as AIPersonality);
                    if (trader) {
                        Object.assign(trader, {
                            ...data,
                            positions: new Map(data.positions || []),
                            trades: data.trades || []
                        });
                    }
                });
                console.log('💾 Loaded AI traders state');
            }
        } catch (e) {
            console.error('Failed to load AI traders state:', e);
        }
    }

    // Start autonomous trading
    startAutonomous(intervalMinutes: number = 5): void {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('🤖 Multi-AI Trading started');

        // Run immediately
        this.runAnalysis();

        // Then run every interval
        setInterval(() => {
            if (this.isRunning) {
                this.runAnalysis();
            }
        }, intervalMinutes * 60 * 1000);
    }

    stopAutonomous(): void {
        this.isRunning = false;
        console.log('🛑 Multi-AI Trading stopped');
    }

    isAutonomousRunning(): boolean {
        return this.isRunning;
    }
}

export default new MultiAIBrokerService();
