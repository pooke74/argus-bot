// Demeter Engine - Sector Rotation Analysis
// Ported from Swift implementation

import YahooFinanceProvider from './YahooFinanceProvider';

export type RotationType = 'Risk-On (Ofansif)' | 'Risk-Off (Defansif)' | 'Karışık';

export interface SectorInfo {
    etf: string;
    name: string;
    performance1M: number;
    performance3M: number;
    relativeStrength: number;
}

export interface DemeterResult {
    score: number;
    stockSector: string;
    sectorPerformance: number;
    vsMarket: number;
    topSectors: SectorInfo[];
    bottomSectors: SectorInfo[];
    rotation: RotationType;
}

const SECTOR_ETFS: { etf: string; name: string }[] = [
    { etf: 'XLK', name: 'Teknoloji' },
    { etf: 'XLF', name: 'Finans' },
    { etf: 'XLE', name: 'Enerji' },
    { etf: 'XLV', name: 'Sağlık' },
    { etf: 'XLY', name: 'Tüketici Disc.' },
    { etf: 'XLP', name: 'Tüketici Staples' },
    { etf: 'XLI', name: 'Endüstriyel' },
    { etf: 'XLB', name: 'Malzeme' },
    { etf: 'XLU', name: 'Kamu Hizm.' },
    { etf: 'XLRE', name: 'Gayrimenkul' },
    { etf: 'XLC', name: 'İletişim' }
];

const DEFENSIVE = ['XLU', 'XLP', 'XLV'];
const OFFENSIVE = ['XLK', 'XLY', 'XLF', 'XLB'];

class DemeterEngine {
    async analyze(stockSector: string = 'Teknoloji'): Promise<DemeterResult> {
        // Fetch all sector performances
        const sectors: SectorInfo[] = [];

        for (const { etf, name } of SECTOR_ETFS) {
            try {
                const info = await this.fetchSectorPerformance(etf, name);
                sectors.push(info);
            } catch {
                // Skip sectors that fail to load
            }
        }

        // Sort by 1M performance
        sectors.sort((a, b) => b.performance1M - a.performance1M);

        const topSectors = sectors.slice(0, 3);
        const bottomSectors = sectors.slice(-3).reverse();

        // Determine rotation type
        const rotation = this.determineRotation(sectors);

        // Find stock's sector performance
        const stockSectorInfo = sectors.find(s => s.name === stockSector);
        const sectorPerf = stockSectorInfo?.performance1M ?? 0;

        // Compare to SPY
        let spyPerf = 0;
        try {
            const spyInfo = await this.fetchSectorPerformance('SPY', 'Market');
            spyPerf = spyInfo.performance1M;
        } catch {
            // Use 0 if SPY fails
        }

        const vsMarket = sectorPerf - spyPerf;

        // Calculate score
        let score = 50;

        // Sector outperforming market
        if (vsMarket > 3) score += 20;
        else if (vsMarket > 0) score += 10;
        else if (vsMarket > -3) score -= 5;
        else score -= 15;

        // Sector in top 3
        if (topSectors.some(s => s.name === stockSector)) {
            score += 15;
        }

        // Rotation alignment
        if (rotation === 'Risk-On (Ofansif)' && OFFENSIVE.includes(sectors[0]?.etf)) {
            score += 10;
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            stockSector,
            sectorPerformance: sectorPerf,
            vsMarket,
            topSectors,
            bottomSectors,
            rotation
        };
    }

    private async fetchSectorPerformance(etf: string, name: string): Promise<SectorInfo> {
        const candles = await YahooFinanceProvider.fetchCandles(etf, '3mo');

        if (candles.length < 20) {
            throw new Error('Insufficient data');
        }

        const closes = candles.map(c => c.close);
        const current = closes[closes.length - 1];

        // 1M performance (last ~21 trading days)
        const monthIdx = Math.max(0, closes.length - 21);
        const month = closes[monthIdx];
        const perf1M = ((current - month) / month) * 100;

        // 3M performance
        const perf3M = ((current - closes[0]) / closes[0]) * 100;

        return {
            etf,
            name,
            performance1M: perf1M,
            performance3M: perf3M,
            relativeStrength: perf1M // Simplified
        };
    }

    private determineRotation(sectors: SectorInfo[]): RotationType {
        if (sectors.length < 3) return 'Karışık';

        const top3 = sectors.slice(0, 3).map(s => s.etf);

        const offensiveCount = top3.filter(etf => OFFENSIVE.includes(etf)).length;
        const defensiveCount = top3.filter(etf => DEFENSIVE.includes(etf)).length;

        if (offensiveCount >= 2) return 'Risk-On (Ofansif)';
        if (defensiveCount >= 2) return 'Risk-Off (Defansif)';
        return 'Karışık';
    }
}

export default new DemeterEngine();
