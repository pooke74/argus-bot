// Argus Decision Engine V2
// Combines all modules: Atlas, Orion, Phoenix, Aether, Demeter, Cronos, and News Sentiment
// Uses Chiron for dynamic weight optimization

import type { AtlasResult } from './AtlasEngine';
import type { OrionResult } from './OrionAnalysisService';
import type { PhoenixResult } from './PhoenixEngine';
import type { AetherResult, MarketRegime } from './AetherEngine';
import type { DemeterResult } from './DemeterEngine';
import type { CronosResult } from './CronosEngine';
import ChironEngine, { type ChironContext } from './ChironEngine';

export interface ModuleScores {
    atlas?: number;
    orion?: number;
    phoenix?: number;
    aether?: number;
    demeter?: number;
    cronos?: number;
    news?: number;
}

export interface ArgusDecision {
    coreScore: number;      // Long-term investment score
    pulseScore: number;     // Short-term trading score
    newsScore: number;      // News sentiment (-100 to 100)
    compositeScore: number; // Weighted combination
    coreSignal: string;
    pulseSignal: string;
    finalSignal: string;
    confidence: 'High' | 'Medium' | 'Low';
    explanation: string;
    actionItems: string[];
    newsImpact?: string;
    marketRegime?: MarketRegime;
    moduleScores: ModuleScores;
    warnings: string[];
}

export interface ModuleInputs {
    atlas?: AtlasResult | null;
    orion?: OrionResult | null;
    phoenix?: PhoenixResult | null;
    aether?: AetherResult | null;
    demeter?: DemeterResult | null;
    cronos?: CronosResult | null;
    newsSentiment?: { score: number; summary: string };
    symbol: string;
}

class ArgusDecisionEngine {
    makeDecision(inputs: ModuleInputs): ArgusDecision {
        const warnings: string[] = [];

        // Collect all module scores
        const moduleScores: ModuleScores = {
            atlas: inputs.atlas?.score,
            orion: inputs.orion?.score,
            phoenix: inputs.phoenix?.score,
            aether: inputs.aether?.score,
            demeter: inputs.demeter?.score,
            cronos: inputs.cronos?.score,
            news: inputs.newsSentiment ? Math.round(inputs.newsSentiment.score * 100) : undefined
        };

        // Build Chiron context for dynamic weights
        const chironContext: ChironContext = {
            atlasScore: moduleScores.atlas,
            orionScore: moduleScores.orion,
            phoenixScore: moduleScores.phoenix,
            aetherScore: moduleScores.aether,
            demeterScore: moduleScores.demeter,
            cronosScore: moduleScores.cronos,
            symbol: inputs.symbol,
            isHermesAvailable: inputs.newsSentiment !== undefined
        };

        // Get dynamic weights from Chiron
        const chiron = ChironEngine.evaluate(chironContext);

        // Calculate Core Score (Investment - Long Term)
        const coreScore = this.calculateWeightedScore(moduleScores, chiron.coreWeights);

        // Calculate Pulse Score (Trading - Short Term)
        const pulseScore = this.calculateWeightedScore(moduleScores, chiron.pulseWeights);

        // News score
        const newsScore = moduleScores.news ?? 0;

        // Normalize news for composite
        const normalizedNewsScore = Math.max(0, Math.min(100, 50 + newsScore / 2));

        // Composite score (average of core and pulse with news influence)
        const compositeScore = Math.round(
            coreScore * 0.4 +
            pulseScore * 0.45 +
            normalizedNewsScore * 0.15
        );

        // Signals
        const coreSignal = this.getSignal(coreScore);
        const pulseSignal = this.getSignal(pulseScore);
        const finalSignal = this.getSignal(compositeScore);

        // Confidence
        const confidence = this.calculateConfidence(coreScore, pulseScore, newsScore, moduleScores);

        // Collect warnings
        if (inputs.cronos?.warnings) {
            warnings.push(...inputs.cronos.warnings);
        }
        if (inputs.aether?.regime === 'Risk-Off') {
            warnings.push('⚠️ Makro: Risk-Off ortamı');
        }
        if (inputs.phoenix?.status === 'inactive') {
            warnings.push('Phoenix sinyali pasif');
        }

        // Generate insights
        const { explanation, actionItems, newsImpact } = this.generateInsights(
            coreScore, pulseScore, newsScore, compositeScore,
            inputs, confidence, chiron.regime
        );

        return {
            coreScore: Math.round(coreScore),
            pulseScore: Math.round(pulseScore),
            newsScore,
            compositeScore,
            coreSignal,
            pulseSignal,
            finalSignal,
            confidence,
            explanation,
            actionItems,
            newsImpact,
            marketRegime: inputs.aether?.regime,
            moduleScores,
            warnings
        };
    }

    // Legacy method for backward compatibility
    makeDecisionLegacy(
        atlas: AtlasResult | null,
        orion: OrionResult | null,
        newsSentiment?: { score: number; summary: string }
    ): ArgusDecision {
        return this.makeDecision({
            atlas,
            orion,
            newsSentiment,
            symbol: 'UNKNOWN'
        });
    }

    private calculateWeightedScore(
        scores: ModuleScores,
        weights: { atlas: number; orion: number; aether: number; demeter: number; phoenix: number; hermes: number; athena: number; cronos: number }
    ): number {
        let totalWeight = 0;
        let weightedSum = 0;

        if (scores.atlas !== undefined) {
            weightedSum += scores.atlas * weights.atlas;
            totalWeight += weights.atlas;
        }
        if (scores.orion !== undefined) {
            weightedSum += scores.orion * weights.orion;
            totalWeight += weights.orion;
        }
        if (scores.phoenix !== undefined) {
            weightedSum += scores.phoenix * weights.phoenix;
            totalWeight += weights.phoenix;
        }
        if (scores.aether !== undefined) {
            weightedSum += scores.aether * weights.aether;
            totalWeight += weights.aether;
        }
        if (scores.demeter !== undefined) {
            weightedSum += scores.demeter * weights.demeter;
            totalWeight += weights.demeter;
        }
        if (scores.cronos !== undefined) {
            weightedSum += scores.cronos * weights.cronos;
            totalWeight += weights.cronos;
        }
        if (scores.news !== undefined) {
            const normalizedNews = Math.max(0, Math.min(100, 50 + scores.news / 2));
            weightedSum += normalizedNews * weights.hermes;
            totalWeight += weights.hermes;
        }

        if (totalWeight === 0) return 50;
        return weightedSum / totalWeight;
    }

    private getSignal(score: number): string {
        if (score >= 80) return 'Güçlü Al';
        if (score >= 65) return 'Al';
        if (score >= 50) return 'Tut';
        if (score >= 35) return 'Sat';
        return 'Güçlü Sat';
    }

    private calculateConfidence(
        coreScore: number,
        pulseScore: number,
        newsScore: number,
        scores: ModuleScores
    ): 'High' | 'Medium' | 'Low' {
        // Count available modules
        const availableModules = Object.values(scores).filter(s => s !== undefined).length;

        // Need at least 3 modules for high confidence
        if (availableModules < 3) return 'Low';

        const scoreDiff = Math.abs(coreScore - pulseScore);

        if (scoreDiff < 15) {
            if ((coreScore >= 65 && pulseScore >= 65 && newsScore > 20) ||
                (coreScore <= 35 && pulseScore <= 35 && newsScore < -20)) {
                return 'High';
            }
            return 'Medium';
        } else if (scoreDiff < 30) {
            return 'Medium';
        }
        return 'Low';
    }

    private generateInsights(
        coreScore: number,
        pulseScore: number,
        newsScore: number,
        _compositeScore: number,
        inputs: ModuleInputs,
        confidence: 'High' | 'Medium' | 'Low',
        chironRegime: string
    ): { explanation: string; actionItems: string[]; newsImpact?: string } {
        const actionItems: string[] = [];
        let explanation = '';
        let newsImpact: string | undefined;

        // Main explanation based on scores
        if (coreScore >= 65 && pulseScore >= 65) {
            explanation = 'Güçlü uyum: Hem temel hem teknik göstergeler olumlu. Pozisyon oluşturmak için ideal.';
            actionItems.push('Pozisyon açmayı veya artırmayı düşünün');
        } else if (coreScore >= 65 && pulseScore < 50) {
            explanation = 'Temel analizde güçlü ama teknik zayıf. Değerli ama zamanlama optimal değil.';
            actionItems.push('Teknik onay bekleyin');
        } else if (pulseScore >= 65 && coreScore < 50) {
            explanation = 'Momentum oyunu: Teknik güçlü ama temeller zayıf. Riskli trade.';
            actionItems.push('Sıkı stop-loss kullanın');
        } else if (coreScore < 35 && pulseScore < 35) {
            explanation = 'Uyarı: Hem temel hem teknik göstergeler negatif. Uzak durun.';
            actionItems.push('Mevcut pozisyonlardan çıkışı düşünün');
        } else {
            explanation = 'Karışık sinyaller: Net bir yön yok. Gelişmeleri izleyin.';
            actionItems.push('Şu an için aksiyon önerilmiyor');
        }

        // Phoenix insights
        if (inputs.phoenix?.status === 'active') {
            if (inputs.phoenix.mode === 'trend') {
                actionItems.push('🔥 Phoenix: Trend pullback fırsatı');
            } else {
                actionItems.push('🔥 Phoenix: Mean reversion sinyali');
            }
        }

        // Aether insights
        if (inputs.aether) {
            explanation += ` Makro: ${inputs.aether.regime}.`;
            if (inputs.aether.vixLevel && inputs.aether.vixLevel > 25) {
                actionItems.push('⚠️ VIX yüksek - volatilite riski');
            }
        }

        // Demeter insights
        if (inputs.demeter) {
            if (inputs.demeter.vsMarket > 3) {
                actionItems.push(`📈 Sektör piyasadan güçlü (+${inputs.demeter.vsMarket.toFixed(1)}%)`);
            } else if (inputs.demeter.vsMarket < -3) {
                actionItems.push(`📉 Sektör piyasadan zayıf (${inputs.demeter.vsMarket.toFixed(1)}%)`);
            }
        }

        // News impact
        if (inputs.newsSentiment) {
            if (newsScore > 30) {
                newsImpact = `📰 Haberler OLUMLU (${inputs.newsSentiment.summary}). Fiyatı yukarı destekleyebilir.`;
                actionItems.push('Pozitif haberler trade\'i destekliyor');
            } else if (newsScore < -30) {
                newsImpact = `📰 Haberler OLUMSUZ (${inputs.newsSentiment.summary}). Dikkatli olun!`;
                actionItems.push('⚠️ Negatif haberler risk oluşturuyor');
            } else {
                newsImpact = '📰 Haberler NÖTR. Belirgin etki beklenmez.';
            }
        }

        // Chiron regime
        explanation += ` Chiron Rejimi: ${chironRegime}.`;

        if (confidence === 'Low') {
            actionItems.push('⚠️ Düşük güven - ekstra dikkatli olun');
        }

        return { explanation, actionItems, newsImpact };
    }
}

export default new ArgusDecisionEngine();
