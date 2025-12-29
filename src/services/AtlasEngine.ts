// Atlas Engine - Fundamental Analysis
// Ported from Swift implementation

import type { Fundamentals } from './YahooFinanceProvider';

export interface AtlasResult {
    score: number;
    verdict: string;
    components: {
        profitability: number;
        health: number;
        valuation: number;
    };
    details: string[];
}

class AtlasEngine {
    analyze(fundamentals: Fundamentals): AtlasResult {
        const details: string[] = [];

        // === PROFITABILITY (max 35 points) ===
        let profitability = 0;

        // Profit Margin
        const pm = fundamentals.profitMargin || 0;
        if (pm > 25) {
            profitability += 15;
            details.push(`Excellent Profit Margin: ${pm.toFixed(1)}%`);
        } else if (pm > 15) {
            profitability += 10;
            details.push(`Good Profit Margin: ${pm.toFixed(1)}%`);
        } else if (pm > 8) {
            profitability += 5;
        } else if (pm > 0) {
            profitability += 2;
        }

        // ROE (Return on Equity)
        const roe = fundamentals.roe || 0;
        if (roe > 25) {
            profitability += 20;
            details.push(`Outstanding ROE: ${roe.toFixed(1)}%`);
        } else if (roe > 15) {
            profitability += 15;
            details.push(`Strong ROE: ${roe.toFixed(1)}%`);
        } else if (roe > 10) {
            profitability += 10;
        } else if (roe > 5) {
            profitability += 5;
        }

        // === FINANCIAL HEALTH (max 30 points) ===
        let health = 0;

        // Debt to Equity
        const de = fundamentals.debtToEquity || 0;
        if (de < 0.3) {
            health += 15;
            details.push('Minimal Debt');
        } else if (de < 0.7) {
            health += 12;
            details.push('Low Debt');
        } else if (de < 1.5) {
            health += 8;
        } else if (de > 2.5) {
            health -= 5;
            details.push('⚠️ High Debt Risk');
        }

        // Current Ratio
        const cr = fundamentals.currentRatio || 1;
        if (cr > 2.5) {
            health += 15;
            details.push('Excellent Liquidity');
        } else if (cr > 1.5) {
            health += 12;
        } else if (cr > 1) {
            health += 8;
        } else {
            health -= 5;
            details.push('⚠️ Liquidity Concern');
        }

        // === VALUATION (max 35 points) ===
        let valuation = 0;

        // P/E Ratio
        const pe = fundamentals.peRatio || 0;
        if (pe > 0 && pe < 15) {
            valuation += 18;
            details.push(`Undervalued (P/E: ${pe.toFixed(1)})`);
        } else if (pe > 0 && pe < 25) {
            valuation += 12;
            details.push(`Fair Value (P/E: ${pe.toFixed(1)})`);
        } else if (pe > 0 && pe < 40) {
            valuation += 6;
        } else if (pe >= 40) {
            valuation -= 3;
            details.push('⚠️ Possibly Overvalued');
        }

        // P/B Ratio
        const pb = fundamentals.pbRatio || 0;
        if (pb > 0 && pb < 1.5) {
            valuation += 12;
            details.push('Trading Below Book Value');
        } else if (pb > 0 && pb < 3) {
            valuation += 8;
        } else if (pb > 0 && pb < 6) {
            valuation += 4;
        }

        // Dividend Yield Bonus
        const dy = fundamentals.dividendYield || 0;
        if (dy > 3) {
            valuation += 5;
            details.push(`Dividend Yield: ${dy.toFixed(1)}%`);
        }

        // Calculate total score (max 100)
        const totalScore = Math.min(100, Math.max(0, profitability + health + valuation));

        return {
            score: totalScore,
            verdict: this.getVerdict(totalScore),
            components: {
                profitability: Math.min(35, profitability),
                health: Math.min(30, health),
                valuation: Math.min(35, valuation)
            },
            details
        };
    }

    private getVerdict(score: number): string {
        if (score >= 80) return 'Excellent';
        if (score >= 65) return 'Good';
        if (score >= 50) return 'Fair';
        if (score >= 35) return 'Weak';
        return 'Poor';
    }
}

export default new AtlasEngine();
