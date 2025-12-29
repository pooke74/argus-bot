
import { Candle } from './YahooFinanceProvider';

export interface TechnicalPattern {
    name: string;
    description: string;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    reliability: 'HIGH' | 'MEDIUM' | 'LOW';
    timestamp: number;
}

export interface ChartAnnotation {
    date: string;
    price: number;
    text: string;
    type: 'BUY' | 'SELL' | 'INFO' | 'WARNING';
}

export interface TechnicalAnalysisResult {
    patterns: TechnicalPattern[];
    annotations: ChartAnnotation[];
    summary: string;
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    support: number;
    resistance: number;
}

export const TechnicalAnalysisService = {
    analyze(candles: Candle[]): TechnicalAnalysisResult {
        if (!candles || candles.length < 50) {
            return {
                patterns: [],
                annotations: [],
                summary: 'Yeterli veri yok.',
                trend: 'SIDEWAYS',
                support: 0,
                resistance: 0
            };
        }

        const closes = candles.map(c => c.close);
        const currentPrice = closes[closes.length - 1];
        const patterns: TechnicalPattern[] = [];
        const annotations: ChartAnnotation[] = [];

        // 1. Calculate Indicators
        const sma20 = this.calculateSMA(closes, 20);
        const sma50 = this.calculateSMA(closes, 50);
        const sma200 = this.calculateSMA(closes, 200);

        const rsi = this.calculateRSI(closes, 14);
        const currentRSI = rsi[rsi.length - 1];

        // 2. Trend Detection
        let trend: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
        if (currentPrice > sma50[sma50.length - 1] && sma50[sma50.length - 1] > sma200[sma200.length - 1]) {
            trend = 'UP';
        } else if (currentPrice < sma50[sma50.length - 1] && sma50[sma50.length - 1] < sma200[sma200.length - 1]) {
            trend = 'DOWN';
        }

        // 3. Pattern Detection

        // Golden Cross (SMA50 crosses above SMA200)
        // Check last 5 days
        for (let i = 1; i <= 5; i++) {
            const idx = sma50.length - i;
            const prevIdx = idx - 1;
            if (sma50[idx] > sma200[idx] && sma50[prevIdx] <= sma200[prevIdx]) {
                patterns.push({
                    name: 'Golden Cross',
                    description: '50 günlük ortalama 200 günlüğü yukarı kesti. Güçlü yükseliş sinyali.',
                    signal: 'BULLISH',
                    reliability: 'HIGH',
                    timestamp: Date.now()
                });
                annotations.push({
                    date: candles[candles.length - i].date,
                    price: candles[candles.length - i].close,
                    text: 'Golden Cross ✨',
                    type: 'BUY'
                });
            }
        }

        // RSI Conditions
        if (currentRSI < 30) {
            patterns.push({
                name: 'RSI Oversold',
                description: `RSI (${currentRSI.toFixed(1)}) aşırı satım bölgesinde (<30). Tepki yükselişi gelebilir.`,
                signal: 'BULLISH',
                reliability: 'MEDIUM',
                timestamp: Date.now()
            });
            annotations.push({
                date: candles[candles.length - 1].date,
                price: currentPrice,
                text: 'Aşırı Satım 📉',
                type: 'INFO'
            });
        } else if (currentRSI > 70) {
            patterns.push({
                name: 'RSI Overbought',
                description: `RSI (${currentRSI.toFixed(1)}) aşırı alım bölgesinde (>70). Düzeltme gelebilir.`,
                signal: 'BEARISH',
                reliability: 'MEDIUM',
                timestamp: Date.now()
            });
            annotations.push({
                date: candles[candles.length - 1].date,
                price: currentPrice,
                text: 'Aşırı Alım 📈',
                type: 'WARNING'
            });
        }

        // Support & Resistance (Simple: 20-day high/low)
        const last20 = closes.slice(-20);
        const support = Math.min(...last20);
        const resistance = Math.max(...last20);

        // Summary Generation
        let summary = `Fiyat şu anda ${trend === 'UP' ? 'YÜKSELİŞ' : trend === 'DOWN' ? 'DÜŞÜŞ' : 'YATAY'} trendinde. `;
        if (patterns.length > 0) {
            summary += `Tespit edilen formasyonlar: ${patterns.map(p => p.name).join(', ')}. `;
        } else {
            summary += "Önemli bir formasyon tespit edilmedi. ";
        }

        if (currentPrice > sma200[sma200.length - 1]) {
            summary += "Uzun vadeli ortalamanın (SMA200) üzerinde, görünüm pozitif.";
        } else {
            summary += "Uzun vadeli ortalamanın (SMA200) altında, görünüm negatif.";
        }

        return {
            patterns,
            annotations,
            summary,
            trend,
            support,
            resistance
        };
    },

    calculateSMA(data: number[], period: number): number[] {
        const sma: number[] = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma.push(0);
                continue;
            }
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    },

    calculateRSI(data: number[], period: number = 14): number[] {
        const rsi: number[] = [];
        const gains: number[] = [];
        const losses: number[] = [];

        for (let i = 1; i < data.length; i++) {
            const diff = data[i] - data[i - 1];
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? Math.abs(diff) : 0);
        }

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        // First RSI
        rsi.push(0); // Filler until period

        for (let i = period; i < data.length; i++) {
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));

            const currentGain = gains[i - 1]; // Offset index
            const currentLoss = losses[i - 1];

            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
        }

        // Padding to match length
        while (rsi.length < data.length) {
            rsi.unshift(0);
        }

        return rsi;
    }
};
