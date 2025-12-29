// Phoenix Engine - Mean Reversion + Trend Hybrid Analysis
// Ported from Swift implementation

import type { Candle } from './YahooFinanceProvider';

export interface PhoenixResult {
    score: number;
    status: 'active' | 'inactive';
    mode: 'trend' | 'reversion';
    channelUpper: number;
    channelMid: number;
    channelLower: number;
    entryZoneLow: number;
    entryZoneHigh: number;
    targets: number[];
    reason: string;
    indicators: {
        slope: number;
        sigma: number;
        rsi: number;
        hasDivergence: boolean;
    };
}

export interface PhoenixConfig {
    lookback: number;
    regressionMultiplier: number;
    atrPeriod: number;
}

const DEFAULT_CONFIG: PhoenixConfig = {
    lookback: 50,
    regressionMultiplier: 2.0,
    atrPeriod: 14
};

class PhoenixEngine {
    analyze(candles: Candle[], config: PhoenixConfig = DEFAULT_CONFIG): PhoenixResult {
        const n = candles.length;
        const N = Math.min(config.lookback, n);

        if (n < 60) {
            return this.insufficientData();
        }

        const analysisSlice = candles.slice(-N);
        const closes = analysisSlice.map(c => c.close);

        // 1. Linear Regression Channel
        const { slope, sigma, mid, upper, lower } = this.calculateLinRegChannel(
            closes,
            config.regressionMultiplier
        );

        // 2. ATR
        const atr = this.calculateATR(analysisSlice, config.atrPeriod);

        // 3. Entry Zones
        const bufferBase = Math.max(0.15 * sigma, atr * 0.1);
        const entryZoneLow = lower - (0.10 * bufferBase);
        const entryZoneHigh = lower + (0.90 * bufferBase);

        // 4. Targets
        const t1 = mid;
        const isDowntrend = slope < -(mid * 0.0005);
        const t2 = isDowntrend ? mid + (upper - mid) * 0.5 : upper;

        // 5. Current State
        const latest = analysisSlice[analysisSlice.length - 1];
        const touchLowerBand = latest.low <= (lower + 0.10 * bufferBase);

        // RSI
        const rsiValues = this.calculateRSIArray(analysisSlice, 14);
        const currentRSI = rsiValues[rsiValues.length - 1] || 50;
        const prevRSI = rsiValues[rsiValues.length - 2] || 50;
        const rsiReversal = (currentRSI >= 40 && prevRSI < 40 && currentRSI > prevRSI);

        // Divergence
        const divergence = this.checkBullishDivergence(analysisSlice, rsiValues);

        // 6. DETECT MARKET MODE
        const isUptrend = slope > 0 && latest.close > mid;
        const isPullback = isUptrend && latest.close < (mid + 0.3 * sigma) && currentRSI < 60;

        // 7. HYBRID SCORING
        let score = 50.0;

        if (isUptrend) {
            // === TREND MODE ===
            score += 10;  // Base uptrend bonus
            if (isPullback) score += 15;  // Pullback opportunity
            if (currentRSI < 50) score += 5;  // Not overbought
            if (slope > (mid * 0.001)) score += 10;  // Strong slope
        } else {
            // === MEAN REVERSION MODE ===
            if (touchLowerBand) score += 15;
            if (rsiReversal) score += 10;
            if (divergence) score += 15;
            if (slope > 0) score += 10;
        }

        // Volume Spike (both modes)
        const vol = latest.volume;
        const volSlice = analysisSlice.slice(-21, -1);
        const avgVol = volSlice.reduce((a, b) => a + b.volume, 0) / volSlice.length;
        if (avgVol > 0 && vol > 1.5 * avgVol) {
            score += 5;
        }

        // Penalties
        if (slope < -(mid * 0.0005)) score -= 15;  // Clear downtrend
        if ((sigma / mid) > 0.08) score -= 10;  // High volatility

        score = Math.min(Math.max(score, 0), 100);

        const reason = this.generateReason(score, isUptrend, isPullback, touchLowerBand, rsiReversal);

        return {
            score,
            status: score > 60 ? 'active' : 'inactive',
            mode: isUptrend ? 'trend' : 'reversion',
            channelUpper: upper,
            channelMid: mid,
            channelLower: lower,
            entryZoneLow,
            entryZoneHigh,
            targets: [t1, t2],
            reason,
            indicators: {
                slope,
                sigma,
                rsi: currentRSI,
                hasDivergence: divergence
            }
        };
    }

    private calculateLinRegChannel(closes: number[], k: number): {
        slope: number;
        sigma: number;
        mid: number;
        upper: number;
        lower: number;
    } {
        const n = closes.length;

        // Linear Regression: y = mx + b
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += closes[i];
            sumXY += i * closes[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Standard deviation from line
        const deviations: number[] = [];
        for (let i = 0; i < n; i++) {
            const predicted = intercept + slope * i;
            deviations.push(closes[i] - predicted);
        }
        const sigma = Math.sqrt(deviations.map(d => d * d).reduce((a, b) => a + b, 0) / n);

        // Channel levels at last bar
        const finalX = n - 1;
        const mid = intercept + slope * finalX;
        const upper = mid + (k * sigma);
        const lower = mid - (k * sigma);

        return { slope, sigma, mid, upper, lower };
    }

    private calculateATR(candles: Candle[], period: number): number {
        if (candles.length < period + 1) return 0;

        const trs: number[] = [];
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i - 1].close;
            const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
            trs.push(tr);
        }

        return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    private calculateRSIArray(candles: Candle[], period: number): number[] {
        const closes = candles.map(c => c.close);
        if (closes.length < period + 1) return [];

        const rsis: number[] = [];

        for (let i = period; i < closes.length; i++) {
            const slice = closes.slice(i - period, i + 1);
            let gains = 0, losses = 0;

            for (let j = 1; j < slice.length; j++) {
                const change = slice[j] - slice[j - 1];
                if (change > 0) gains += change;
                else losses -= change;
            }

            const avgGain = gains / period;
            const avgLoss = losses / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsis.push(rsi);
        }

        return rsis;
    }

    private checkBullishDivergence(candles: Candle[], rsi: number[]): boolean {
        if (rsi.length < 20) return false;

        const rsiSlice = rsi.slice(-20);
        const dips: { index: number; value: number }[] = [];

        for (let i = 1; i < rsiSlice.length - 1; i++) {
            if (rsiSlice[i] < rsiSlice[i - 1] && rsiSlice[i] < rsiSlice[i + 1]) {
                dips.push({ index: i, value: rsiSlice[i] });
            }
        }

        if (dips.length < 2) return false;

        const lastDip = dips[dips.length - 1];
        const priorDip = dips[dips.length - 2];

        const candleSlice = candles.slice(-20);
        const lastDipPrice = candleSlice[lastDip.index]?.low ?? 0;
        const priorDipPrice = candleSlice[priorDip.index]?.low ?? 0;

        // Price making lower lows but RSI making higher lows = Bullish Divergence
        return lastDipPrice < priorDipPrice && lastDip.value > priorDip.value;
    }

    private generateReason(
        score: number,
        isUptrend: boolean,
        isPullback: boolean,
        touch: boolean,
        _rsi: boolean
    ): string {
        if (score >= 70) {
            if (isUptrend && isPullback) {
                return 'Trend pullback fırsatı - RSI uygun.';
            } else if (touch) {
                return 'Kanal dibine yakın, dönüş sinyalleri var.';
            }
            return 'Güçlü sinyal.';
        } else if (score >= 50) {
            return 'Orta seviye sinyal, teyit bekle.';
        } else {
            return 'Zayıf koşullar, Phoenix aktif değil.';
        }
    }

    private insufficientData(): PhoenixResult {
        return {
            score: 0,
            status: 'inactive',
            mode: 'reversion',
            channelUpper: 0,
            channelMid: 0,
            channelLower: 0,
            entryZoneLow: 0,
            entryZoneHigh: 0,
            targets: [],
            reason: 'Yetersiz veri',
            indicators: {
                slope: 0,
                sigma: 0,
                rsi: 50,
                hasDivergence: false
            }
        };
    }
}

export default new PhoenixEngine();
