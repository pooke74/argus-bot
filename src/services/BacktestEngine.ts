// Backtest Engine - Strategy Backtesting
// Ported from Swift implementation

import OrionAnalysisService from './OrionAnalysisService';
import type { Candle } from './YahooFinanceProvider';

export type StrategyType = 'Orion V3' | 'Phoenix Channel' | 'Buy & Hold';

export interface BacktestConfig {
    symbol: string;
    strategy: StrategyType;
    initialCapital: number;
    startDate?: string;
    endDate?: string;
    positionSizePercent: number;
}

export interface BacktestTrade {
    id: string;
    entryDate: string;
    entryPrice: number;
    exitDate: string | null;
    exitPrice: number | null;
    shares: number;
    pnl: number;
    pnlPercent: number;
    reason: string;
    isWin: boolean;
}

export interface BacktestResult {
    config: BacktestConfig;
    trades: BacktestTrade[];
    finalCapital: number;
    totalReturn: number;
    maxDrawdown: number;
    winRate: number;
    sharpeRatio: number;
    equityCurve: { date: string; value: number }[];
}

class BacktestEngine {
    async runBacktest(
        symbol: string,
        candles: Candle[],
        config: Partial<BacktestConfig> = {}
    ): Promise<BacktestResult> {
        const fullConfig: BacktestConfig = {
            symbol,
            strategy: config.strategy ?? 'Orion V3',
            initialCapital: config.initialCapital ?? 10000,
            startDate: config.startDate,
            endDate: config.endDate,
            positionSizePercent: config.positionSizePercent ?? 100
        };

        // Filter by date range if specified
        let filteredCandles = candles;
        if (fullConfig.startDate) {
            filteredCandles = filteredCandles.filter(c => c.date >= fullConfig.startDate!);
        }
        if (fullConfig.endDate) {
            filteredCandles = filteredCandles.filter(c => c.date <= fullConfig.endDate!);
        }

        switch (fullConfig.strategy) {
            case 'Orion V3':
                return this.runOrionStrategy(filteredCandles, fullConfig);
            case 'Buy & Hold':
                return this.runBuyAndHold(filteredCandles, fullConfig);
            default:
                return this.runOrionStrategy(filteredCandles, fullConfig);
        }
    }

    private runOrionStrategy(candles: Candle[], config: BacktestConfig): BacktestResult {
        const trades: BacktestTrade[] = [];
        const equityCurve: { date: string; value: number }[] = [];

        let capital = config.initialCapital;
        let position: { shares: number; entryPrice: number; entryDate: string } | null = null;
        let peakCapital = capital;
        let maxDrawdown = 0;
        const returns: number[] = [];
        let tradeId = 0;

        // Minimum lookback for Orion
        const lookback = 50;

        for (let i = lookback; i < candles.length; i++) {
            const slice = candles.slice(0, i + 1);
            const current = candles[i];
            const prevCapital = position
                ? capital + position.shares * (current.close - position.entryPrice)
                : capital;

            // Track equity curve
            equityCurve.push({ date: current.date, value: prevCapital });

            // Calculate drawdown
            if (prevCapital > peakCapital) {
                peakCapital = prevCapital;
            }
            const drawdown = ((peakCapital - prevCapital) / peakCapital) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }

            // Get Orion signal
            const orion = OrionAnalysisService.calculateOrionScore(slice);
            const score = orion.score;

            // Trading logic
            if (!position && score >= 65) {
                // BUY signal
                const amount = capital * (config.positionSizePercent / 100);
                const shares = amount / current.close;
                position = {
                    shares,
                    entryPrice: current.close,
                    entryDate: current.date
                };
            } else if (position && (score < 45 || i === candles.length - 1)) {
                // SELL signal or end of backtest
                const pnl = position.shares * (current.close - position.entryPrice);
                const pnlPercent = ((current.close - position.entryPrice) / position.entryPrice) * 100;

                capital += pnl;
                returns.push(pnlPercent);

                trades.push({
                    id: `T${++tradeId}`,
                    entryDate: position.entryDate,
                    entryPrice: position.entryPrice,
                    exitDate: current.date,
                    exitPrice: current.close,
                    shares: position.shares,
                    pnl,
                    pnlPercent,
                    reason: i === candles.length - 1 ? 'End of Period' : 'Orion Sell Signal',
                    isWin: pnl > 0
                });

                position = null;
            }
        }

        // Calculate metrics
        const winningTrades = trades.filter(t => t.isWin).length;
        const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
        const totalReturn = ((capital - config.initialCapital) / config.initialCapital) * 100;
        const sharpeRatio = this.calculateSharpe(returns);

        return {
            config,
            trades,
            finalCapital: capital,
            totalReturn,
            maxDrawdown,
            winRate,
            sharpeRatio,
            equityCurve
        };
    }

    private runBuyAndHold(candles: Candle[], config: BacktestConfig): BacktestResult {
        if (candles.length < 2) {
            return {
                config,
                trades: [],
                finalCapital: config.initialCapital,
                totalReturn: 0,
                maxDrawdown: 0,
                winRate: 0,
                sharpeRatio: 0,
                equityCurve: []
            };
        }

        const firstPrice = candles[0].close;
        const lastPrice = candles[candles.length - 1].close;
        const shares = config.initialCapital / firstPrice;
        const finalValue = shares * lastPrice;
        const pnl = finalValue - config.initialCapital;
        const pnlPercent = ((lastPrice - firstPrice) / firstPrice) * 100;

        // Calculate max drawdown
        let peak = config.initialCapital;
        let maxDrawdown = 0;
        const equityCurve: { date: string; value: number }[] = [];

        for (const candle of candles) {
            const value = shares * candle.close;
            equityCurve.push({ date: candle.date, value });

            if (value > peak) peak = value;
            const dd = ((peak - value) / peak) * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }

        const trade: BacktestTrade = {
            id: 'BH1',
            entryDate: candles[0].date,
            entryPrice: firstPrice,
            exitDate: candles[candles.length - 1].date,
            exitPrice: lastPrice,
            shares,
            pnl,
            pnlPercent,
            reason: 'Buy & Hold',
            isWin: pnl > 0
        };

        return {
            config,
            trades: [trade],
            finalCapital: finalValue,
            totalReturn: pnlPercent,
            maxDrawdown,
            winRate: pnl > 0 ? 100 : 0,
            sharpeRatio: 0, // Not applicable for B&H
            equityCurve
        };
    }

    private calculateSharpe(returns: number[]): number {
        if (returns.length < 2) return 0;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) return 0;

        // Annualized (assuming roughly 12 trades per year)
        const annualizedReturn = mean * 12;
        const annualizedStdDev = stdDev * Math.sqrt(12);
        const riskFreeRate = 4; // 4% annual risk-free rate

        return (annualizedReturn - riskFreeRate) / annualizedStdDev;
    }
}

export default new BacktestEngine();
