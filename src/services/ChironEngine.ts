// Chiron Engine - Meta-Optimizer
// Ported from Swift implementation

export type ChironMarketRegime = 'Neutral' | 'Trend' | 'Chop' | 'Risk-Off' | 'News Shock';

export interface ModuleWeights {
    atlas: number;
    orion: number;
    aether: number;
    demeter: number;
    phoenix: number;
    hermes: number;
    athena: number;
    cronos: number;
}

export interface ChironContext {
    atlasScore?: number;
    orionScore?: number;
    aetherScore?: number;
    phoenixScore?: number;
    hermesScore?: number;
    demeterScore?: number;
    athenaScore?: number;
    cronosScore?: number;
    symbol: string;
    orionTrendStrength?: number;
    chopIndex?: number;
    volatilityHint?: number;
    isHermesAvailable: boolean;
}

export interface ChironResult {
    regime: ChironMarketRegime;
    coreWeights: ModuleWeights;
    pulseWeights: ModuleWeights;
    learningNotes?: string[];
}

interface StoredWeights {
    coreWeights: ModuleWeights;
    pulseWeights: ModuleWeights;
    learningNotes: string[];
    timestamp: number;
}

const STORAGE_KEY = 'chiron_learned_weights';

class ChironEngine {
    private dynamicConfig: StoredWeights | null = null;

    constructor() {
        this.loadFromStorage();
    }

    evaluate(context: ChironContext): ChironResult {
        const regime = this.detectRegime(context);
        let weights = this.getBaseWeights(regime);

        // Apply learned adjustments if available
        if (this.dynamicConfig) {
            weights = this.blendWeights(weights, this.dynamicConfig, 0.6);
        }

        return {
            regime,
            coreWeights: this.normalizeWeights(weights.core),
            pulseWeights: this.normalizeWeights(weights.pulse),
            learningNotes: this.dynamicConfig?.learningNotes
        };
    }

    private detectRegime(context: ChironContext): ChironMarketRegime {
        const orion = context.orionScore ?? 50;
        const aether = context.aetherScore ?? 50;
        const chop = context.chopIndex ?? 50;

        if (aether < 40) return 'Risk-Off';
        if (orion >= 60 && chop < 45) return 'Trend';
        if (chop > 60) return 'Chop';

        return 'Neutral';
    }

    private getBaseWeights(regime: ChironMarketRegime): { core: ModuleWeights; pulse: ModuleWeights } {
        switch (regime) {
            case 'Trend':
                return {
                    core: {
                        atlas: 0.20, orion: 0.25, aether: 0.20,
                        demeter: 0.15, phoenix: 0.10, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    },
                    pulse: {
                        atlas: 0.10, orion: 0.35, aether: 0.15,
                        demeter: 0.10, phoenix: 0.20, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    }
                };

            case 'Chop':
                return {
                    core: {
                        atlas: 0.30, orion: 0.15, aether: 0.25,
                        demeter: 0.15, phoenix: 0.05, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    },
                    pulse: {
                        atlas: 0.20, orion: 0.20, aether: 0.20,
                        demeter: 0.15, phoenix: 0.15, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    }
                };

            case 'Risk-Off':
                return {
                    core: {
                        atlas: 0.35, orion: 0.10, aether: 0.30,
                        demeter: 0.15, phoenix: 0.0, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    },
                    pulse: {
                        atlas: 0.25, orion: 0.15, aether: 0.30,
                        demeter: 0.15, phoenix: 0.05, hermes: 0.05,
                        athena: 0.05, cronos: 0.0
                    }
                };

            default: // Neutral
                return {
                    core: {
                        atlas: 0.25, orion: 0.20, aether: 0.20,
                        demeter: 0.15, phoenix: 0.05, hermes: 0.05,
                        athena: 0.10, cronos: 0.0
                    },
                    pulse: {
                        atlas: 0.15, orion: 0.25, aether: 0.20,
                        demeter: 0.10, phoenix: 0.15, hermes: 0.10,
                        athena: 0.05, cronos: 0.0
                    }
                };
        }
    }

    private blendWeights(
        base: { core: ModuleWeights; pulse: ModuleWeights },
        learned: StoredWeights,
        factor: number
    ): { core: ModuleWeights; pulse: ModuleWeights } {
        const blendWeight = (baseW: ModuleWeights, learnedW: ModuleWeights): ModuleWeights => {
            return {
                atlas: baseW.atlas * (1 - factor) + learnedW.atlas * factor,
                orion: baseW.orion * (1 - factor) + learnedW.orion * factor,
                aether: baseW.aether * (1 - factor) + learnedW.aether * factor,
                demeter: baseW.demeter * (1 - factor) + learnedW.demeter * factor,
                phoenix: baseW.phoenix * (1 - factor) + learnedW.phoenix * factor,
                hermes: baseW.hermes * (1 - factor) + learnedW.hermes * factor,
                athena: baseW.athena * (1 - factor) + learnedW.athena * factor,
                cronos: baseW.cronos * (1 - factor) + learnedW.cronos * factor
            };
        };

        return {
            core: blendWeight(base.core, learned.coreWeights),
            pulse: blendWeight(base.pulse, learned.pulseWeights)
        };
    }

    private normalizeWeights(weights: ModuleWeights): ModuleWeights {
        const sum = weights.atlas + weights.orion + weights.aether +
            weights.demeter + weights.phoenix + weights.hermes +
            weights.athena + weights.cronos;

        if (sum === 0) return weights;

        return {
            atlas: weights.atlas / sum,
            orion: weights.orion / sum,
            aether: weights.aether / sum,
            demeter: weights.demeter / sum,
            phoenix: weights.phoenix / sum,
            hermes: weights.hermes / sum,
            athena: weights.athena / sum,
            cronos: weights.cronos / sum
        };
    }

    // Store learned weights from backtest feedback
    storeLearnings(coreWeights: ModuleWeights, pulseWeights: ModuleWeights, notes: string[]): void {
        this.dynamicConfig = {
            coreWeights,
            pulseWeights,
            learningNotes: notes,
            timestamp: Date.now()
        };
        this.saveToStorage();
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.dynamicConfig = JSON.parse(stored);
                console.log('💾 Chiron: Öğrenilmiş ağırlıklar yüklendi.');
            }
        } catch {
            console.log('Chiron: No stored weights found.');
        }
    }

    private saveToStorage(): void {
        if (this.dynamicConfig) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.dynamicConfig));
            } catch {
                console.error('Chiron: Failed to save weights.');
            }
        }
    }

    // Get currently active weights for debugging
    getActiveWeights(): { core: ModuleWeights; pulse: ModuleWeights } | null {
        if (!this.dynamicConfig) return null;
        return {
            core: this.dynamicConfig.coreWeights,
            pulse: this.dynamicConfig.pulseWeights
        };
    }

    // Clear learned weights
    clearLearnings(): void {
        this.dynamicConfig = null;
        localStorage.removeItem(STORAGE_KEY);
        console.log('Chiron: Learned weights cleared.');
    }
}

export default new ChironEngine();
