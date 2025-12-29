// Orion Engine - Technical Analysis
// Ported from Swift implementation

import type { Candle } from './YahooFinanceProvider';

export interface OrionResult {
    score: number;
    verdict: string;
    regime: 'Bull' | 'Bear' | 'Neutral';
    components: {
        trend: number;
        momentum: number;
        structure: number;
    };
    indicators: {
        sma20: number;
        sma50: number;
        sma200: number;
        rsi: number;
        priceVsSma50: number;
    };
    details: string[];
}

class OrionAnalysisService {
    calculateOrionScore(candles: Candle[]): OrionResult {
        const details: string[] = [];

        if (candles.length < 50) {
            return {
                score: 50,
                verdict: 'Insufficient Data',
                regime: 'Neutral',
                components: { trend: 15, momentum: 15, structure: 15 },
                indicators: { sma20: 0, sma50: 0, sma200: 0, rsi: 50, priceVsSma50: 0 },
                details: ['Not enough historical data for analysis']
            };
        }

        const closePrices = candles.map(c => c.close);
        const volumes = candles.map(c => c.volume);
        const currentPrice = closePrices[closePrices.length - 1];

        // Calculate indicators
        const sma20 = this.calculateSMA(closePrices, 20);
        const sma50 = this.calculateSMA(closePrices, 50);
        const sma200 = candles.length >= 200 ? this.calculateSMA(closePrices, 200) : sma50;
        const rsi = this.calculateRSI(closePrices, 14);
        const priceVsSma50 = ((currentPrice - sma50) / sma50) * 100;

        // === TREND SCORE (max 35 points) ===
        let trend = 0;

        // Price vs SMAs
        if (currentPrice > sma20) trend += 8;
        if (currentPrice > sma50) trend += 10;
        if (currentPrice > sma200) trend += 8;

        // SMA alignment (Golden Cross pattern)
        if (sma20 > sma50 && sma50 > sma200) {
            trend += 9;
            details.push('✅ Bullish SMA Alignment');
        } else if (sma20 < sma50 && sma50 < sma200) {
            trend -= 5;
            details.push('⚠️ Bearish SMA Alignment');
        }

        // === MOMENTUM SCORE (max 35 points) ===
        let momentum = 0;

        // RSI analysis
        if (rsi >= 50 && rsi < 70) {
            momentum += 15;
            details.push(`RSI in Bullish Zone: ${rsi.toFixed(1)}`);
        } else if (rsi >= 30 && rsi < 50) {
            momentum += 10;
        } else if (rsi >= 70) {
            momentum += 5;
            details.push('⚠️ RSI Overbought');
        } else if (rsi < 30) {
            momentum += 5;
            details.push('⚠️ RSI Oversold');
        }

        // Price momentum (recent performance)
        const priceChange5d = this.percentChange(closePrices, 5);
        const priceChange20d = this.percentChange(closePrices, 20);

        if (priceChange5d > 3) momentum += 10;
        else if (priceChange5d > 0) momentum += 5;
        else if (priceChange5d < -3) momentum -= 5;

        if (priceChange20d > 5) {
            momentum += 10;
            details.push(`Strong 20-Day Momentum: +${priceChange20d.toFixed(1)}%`);
        } else if (priceChange20d > 0) momentum += 5;

        // === STRUCTURE SCORE (max 30 points) ===
        let structure = 0;

        // Volume analysis
        const avgVolume = this.average(volumes.slice(-20));
        const recentVolume = this.average(volumes.slice(-5));
        const volumeRatio = recentVolume / avgVolume;

        if (volumeRatio > 1.3 && priceChange5d > 0) {
            structure += 15;
            details.push('Volume Confirms Uptrend');
        } else if (volumeRatio > 1) {
            structure += 10;
        } else {
            structure += 5;
        }

        // Volatility (lower is better for trend reliability)
        const volatility = this.calculateVolatility(closePrices, 20);
        if (volatility < 15) {
            structure += 15;
            details.push('Low Volatility Environment');
        } else if (volatility < 25) {
            structure += 10;
        } else {
            structure += 5;
            details.push('⚠️ High Volatility');
        }

        // Calculate total score
        const totalScore = Math.min(100, Math.max(0, trend + momentum + structure));

        // Determine market regime
        let regime: 'Bull' | 'Bear' | 'Neutral' = 'Neutral';
        if (currentPrice > sma50 && sma50 > sma200 && rsi > 50) {
            regime = 'Bull';
        } else if (currentPrice < sma50 && sma50 < sma200 && rsi < 50) {
            regime = 'Bear';
        }

        return {
            score: totalScore,
            verdict: this.getVerdict(totalScore),
            regime,
            components: {
                trend: Math.min(35, Math.max(0, trend)),
                momentum: Math.min(35, Math.max(0, momentum)),
                structure: Math.min(30, Math.max(0, structure))
            },
            indicators: {
                sma20,
                sma50,
                sma200,
                rsi,
                priceVsSma50
            },
            details
        };
    }

    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) return data[data.length - 1] || 0;
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    private calculateRSI(data: number[], period: number): number {
        if (data.length < period + 1) return 50;

        let gains = 0, losses = 0;
        for (let i = data.length - period; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
        }

        if (losses === 0) return 100;
        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    }

    private percentChange(data: number[], days: number): number {
        if (data.length < days + 1) return 0;
        const current = data[data.length - 1];
        const past = data[data.length - 1 - days];
        return ((current - past) / past) * 100;
    }

    private average(data: number[]): number {
        if (data.length === 0) return 0;
        return data.reduce((a, b) => a + b, 0) / data.length;
    }

    private calculateVolatility(data: number[], period: number): number {
        const slice = data.slice(-period);
        if (slice.length < 2) return 0;

        const returns: number[] = [];
        for (let i = 1; i < slice.length; i++) {
            returns.push(((slice[i] - slice[i - 1]) / slice[i - 1]) * 100);
        }

        const mean = this.average(returns);
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance) * Math.sqrt(252); // Annualized
    }

    private getVerdict(score: number): string {
        if (score >= 75) return 'Strongly Bullish';
        if (score >= 60) return 'Bullish';
        if (score >= 45) return 'Neutral';
        if (score >= 30) return 'Bearish';
        return 'Strongly Bearish';
    }
}

export default new OrionAnalysisService();
