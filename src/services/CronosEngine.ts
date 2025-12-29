// Cronos Engine - Timing Analysis
// Ported from Swift implementation

export type SeasonalitySignal = 'Yükseliş Döneminde' | 'Düşüş Döneminde' | 'Nötr';
export type TradingDay = 'Normal' | 'Pazartesi (Dikkat)' | 'Cuma (Pozisyon Kapat?)' | 'Piyasa Kapalı';

export interface CronosResult {
    score: number;
    isEarningsSoon: boolean;
    daysToEarnings: number | null;
    seasonality: SeasonalitySignal;
    tradingDay: TradingDay;
    warnings: string[];
}

// S&P 500 historical monthly returns
const MONTHLY_RETURNS: { [key: number]: number } = {
    1: 1.0,   // Ocak - January Effect
    2: -0.3,  // Şubat
    3: 1.2,   // Mart
    4: 1.5,   // Nisan - Strong
    5: 0.3,   // Mayıs - Sell in May?
    6: -0.1,  // Haziran
    7: 1.0,   // Temmuz
    8: -0.1,  // Ağustos
    9: -0.5,  // Eylül - Worst month
    10: 0.8,  // Ekim - Volatil ama genelde pozitif
    11: 1.5,  // Kasım - Strong
    12: 1.3   // Aralık - Santa Rally
};

class CronosEngine {
    async analyze(symbol: string): Promise<CronosResult> {
        let score = 50;
        const warnings: string[] = [];

        // 1. Earnings check
        const { isEarningsSoon, daysToEarnings } = await this.checkEarnings(symbol);
        if (isEarningsSoon) {
            warnings.push(`⚠️ Earnings yaklaşıyor (${daysToEarnings ?? 0} gün)`);
            score -= 10; // Risk factor
        }

        // 2. Seasonality
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const seasonality = this.getSeasonality(month);

        const monthReturn = MONTHLY_RETURNS[month];
        if (monthReturn !== undefined) {
            if (monthReturn > 1.0) {
                score += 15;
            } else if (monthReturn > 0) {
                score += 5;
            } else {
                score -= 10;
            }
        }

        // 3. Day of week
        const weekday = now.getDay(); // 0 = Sunday
        const tradingDay = this.getTradingDay(weekday);

        switch (tradingDay) {
            case 'Piyasa Kapalı':
                warnings.push('Piyasa kapalı');
                break;
            case 'Pazartesi (Dikkat)':
                warnings.push('Pazartesi - açılış volatil olabilir');
                break;
            case 'Cuma (Pozisyon Kapat?)':
                warnings.push('Cuma - hafta sonu riski');
                break;
        }

        // 4. Month-end effect (last 3 days typically bullish)
        const day = now.getDate();
        if (day >= 28) {
            score += 5;
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            isEarningsSoon,
            daysToEarnings,
            seasonality,
            tradingDay,
            warnings
        };
    }

    private async checkEarnings(_symbol: string): Promise<{ isEarningsSoon: boolean; daysToEarnings: number | null }> {
        // Note: Yahoo Finance fundamentals endpoint doesn't include earnings date
        // In a full implementation, you'd fetch from /v10/finance/quoteSummary/{symbol}?modules=calendarEvents
        // For now, we return false as we don't have this data readily available
        return { isEarningsSoon: false, daysToEarnings: null };
    }

    private getSeasonality(month: number): SeasonalitySignal {
        const returns = MONTHLY_RETURNS[month];
        if (returns === undefined) return 'Nötr';

        if (returns >= 1.0) return 'Yükseliş Döneminde';
        if (returns < 0) return 'Düşüş Döneminde';
        return 'Nötr';
    }

    private getTradingDay(weekday: number): TradingDay {
        switch (weekday) {
            case 0: return 'Piyasa Kapalı'; // Sunday
            case 1: return 'Pazartesi (Dikkat)';
            case 5: return 'Cuma (Pozisyon Kapat?)';
            case 6: return 'Piyasa Kapalı'; // Saturday
            default: return 'Normal';
        }
    }
}

export default new CronosEngine();
