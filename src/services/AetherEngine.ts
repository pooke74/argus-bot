// Aether Engine - Macro Analysis
// Ported from Swift implementation

import YahooFinanceProvider from './YahooFinanceProvider';

export type MarketRegime = 'Risk-On' | 'Risk-Off' | 'Neutral' | 'Caution';

export interface AetherResult {
    score: number;
    regime: MarketRegime;
    vixLevel: number | null;
    marketTrend: string;
    sectorRotation: string;
    details: string[];
}

class AetherEngine {
    private readonly defensiveSectors = ['XLU', 'XLP', 'XLV'];
    private readonly offensiveSectors = ['XLK', 'XLY', 'XLF'];

    async evaluateMacro(): Promise<AetherResult> {
        const details: string[] = [];
        let totalScore = 0;

        // 1. VIX Analysis (30%)
        const vixResult = await this.analyzeVIX();
        totalScore += vixResult.score * 0.30;
        if (vixResult.vixLevel !== null) {
            details.push(`VIX: ${vixResult.vixLevel.toFixed(1)}`);
        }

        // 2. Market Trend (35%)
        const marketResult = await this.analyzeMarketTrend();
        totalScore += marketResult.score * 0.35;
        details.push(`SPY: ${marketResult.trend}`);

        // 3. Sector Rotation (20%)
        const sectorResult = await this.analyzeSectorRotation();
        totalScore += sectorResult.score * 0.20;
        details.push(`Sektör: ${sectorResult.bias}`);

        // 4. Yield (15%) - Simplified placeholder
        totalScore += 50 * 0.15;

        const regime = this.determineRegime(totalScore, vixResult.vixLevel);

        return {
            score: Math.round(totalScore),
            regime,
            vixLevel: vixResult.vixLevel,
            marketTrend: marketResult.trend,
            sectorRotation: sectorResult.bias,
            details
        };
    }

    private async analyzeVIX(): Promise<{ score: number; vixLevel: number | null }> {
        try {
            const candles = await YahooFinanceProvider.fetchCandles('^VIX', '1mo');

            if (candles.length === 0) {
                return { score: 50, vixLevel: null };
            }

            const vixValue = candles[candles.length - 1].close;

            /*
             VIX Levels:
             < 15: Very low fear - Score: 80
             15-20: Normal - Score: 70
             20-25: Elevated - Score: 50
             25-30: High fear - Score: 30
             > 30: Panic - Score: 15
            */
            let score = 50;

            if (vixValue < 15) {
                score = 80;
            } else if (vixValue < 20) {
                score = 70;
            } else if (vixValue < 25) {
                score = 50;
            } else if (vixValue < 30) {
                score = 30;
            } else {
                score = 15;
            }

            return { score, vixLevel: vixValue };
        } catch {
            return { score: 50, vixLevel: null };
        }
    }

    private async analyzeMarketTrend(): Promise<{ score: number; trend: string }> {
        try {
            const candles = await YahooFinanceProvider.fetchCandles('SPY', '6mo');

            if (candles.length < 50) {
                return { score: 50, trend: 'Veri Yok' };
            }

            const closes = candles.map(c => c.close);
            const current = closes[closes.length - 1];

            const sma50 = this.calculateSMA(closes, 50);
            const sma200 = closes.length >= 200 ? this.calculateSMA(closes, 200) : sma50;

            let score = 50;
            let trend = 'Nötr';

            // Price vs SMAs
            if (current > sma50 && current > sma200) {
                score += 25;
                trend = 'Yükseliş';
            } else if (current < sma50 && current < sma200) {
                score -= 25;
                trend = 'Düşüş';
            }

            // SMA Alignment
            if (sma50 > sma200) {
                score += 15;
                trend += ' (Güçlü)';
            } else {
                score -= 15;
                trend += ' (Zayıf)';
            }

            // Recent momentum (last 20 days)
            const recent20 = closes.slice(-20);
            const first = recent20[0];
            const change = ((current - first) / first) * 100;

            if (change > 5) score += 10;
            else if (change < -5) score -= 10;

            return { score: Math.max(0, Math.min(100, score)), trend };
        } catch {
            return { score: 50, trend: 'Hesaplanamadı' };
        }
    }

    private async analyzeSectorRotation(): Promise<{ score: number; bias: string }> {
        try {
            let defPerf = 0;
            let offPerf = 0;

            // Calculate 1-month performance for defensive sectors
            for (const symbol of this.defensiveSectors) {
                const perf = await this.get1MPerformance(symbol);
                defPerf += perf;
            }
            defPerf /= this.defensiveSectors.length;

            // Calculate 1-month performance for offensive sectors
            for (const symbol of this.offensiveSectors) {
                const perf = await this.get1MPerformance(symbol);
                offPerf += perf;
            }
            offPerf /= this.offensiveSectors.length;

            const diff = offPerf - defPerf;

            let score = 50;
            let bias = 'Nötr';

            if (diff > 3) {
                score = 75;
                bias = 'Risk-On (Ofansif)';
            } else if (diff > 0) {
                score = 60;
                bias = 'Hafif Risk-On';
            } else if (diff > -3) {
                score = 40;
                bias = 'Hafif Risk-Off';
            } else {
                score = 25;
                bias = 'Risk-Off (Defansif)';
            }

            return { score, bias };
        } catch {
            return { score: 50, bias: 'Hesaplanamadı' };
        }
    }

    private async get1MPerformance(symbol: string): Promise<number> {
        try {
            const candles = await YahooFinanceProvider.fetchCandles(symbol, '1mo');

            if (candles.length < 2) return 0;

            const first = candles[0].close;
            const last = candles[candles.length - 1].close;

            return ((last - first) / first) * 100;
        } catch {
            return 0;
        }
    }

    private calculateSMA(data: number[], period: number): number {
        if (data.length < period) return data[data.length - 1] || 0;
        return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    private determineRegime(score: number, vix: number | null): MarketRegime {
        if (vix !== null && vix > 30) {
            return 'Risk-Off';
        }

        if (score >= 70) return 'Risk-On';
        if (score >= 50) return 'Neutral';
        if (score >= 35) return 'Caution';
        return 'Risk-Off';
    }
}

export default new AetherEngine();
