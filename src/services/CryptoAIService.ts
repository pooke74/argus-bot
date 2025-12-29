// Crypto AI Service - CLIENT (Frontend)
// Communicates with the backend autonomous bot

export const CRYPTO_PAIRS = [
    'BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'AVAX-USD' // Visual list only
];

export interface CryptoPosition {
    symbol: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    holdingTime: number;
}

export interface CryptoTrade {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    price: number;
    amount: number;
    usdValue: number;
    timestamp: Date;
    reason: string;
}

export interface CryptoAIState {
    isRunning: boolean;
    initialCapital: number;
    currentCash: number;
    positions: Map<string, CryptoPosition>;
    trades: CryptoTrade[];
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    totalTrades: number;
    lastAnalysis: Date | null;
    topGainers: string[];
    topLosers: string[];
    hotCoins: string[];
    lastThought: string;
    scanSummary?: {
        totalScanned: number;
        qualified: number;
        verbalLog?: string;
    };
}

const API_Base = 'http://localhost:3001/api/bot';

class CryptoAIService {
    private state: CryptoAIState | null = null;

    constructor() {
        this.fetchState();
        // Poll backend every 2 seconds for UI updates
        setInterval(() => this.fetchState(), 2000);
    }

    async fetchState() {
        try {
            const res = await fetch(`${API_Base}/status`);
            if (res.ok) {
                const data = await res.json();
                this.transformState(data);
            }
        } catch (e) {
            console.error('Bot connection failed', e);
        }
    }

    // Convert Backend JSON -> Frontend Interface
    transformState(data: any) {
        // Map object positions to Map
        const positions = new Map<string, CryptoPosition>();
        if (data.positions) {
            Object.values(data.positions).forEach((p: any) => {
                positions.set(p.symbol, {
                    ...p,
                    pnlPercent: ((p.currentPrice - p.avgCost) / p.avgCost) * 100 // Recalculate if needed
                });
            });
        }

        this.state = {
            ...data,
            positions,
            trades: data.trades || [],
            lastAnalysis: data.lastAnalysis ? new Date(data.lastAnalysis) : null,
            // Default visual data if missing
            topGainers: [],
            topLosers: [],
            hotCoins: [],
            lastThought: data.scanSummary?.verbalLog || 'Bağlanıyor...',
            totalPnLPercent: ((data.totalValue - data.initialCapital) / data.initialCapital) * 100
        };
    }

    getState(): CryptoAIState | null {
        return this.state;
    }

    isRunning(): boolean {
        return this.state?.isRunning || false;
    }

    async start() {
        await fetch(`${API_Base}/start`, { method: 'POST' });
        this.fetchState();
    }

    async stop() {
        await fetch(`${API_Base}/stop`, { method: 'POST' });
        this.fetchState();
    }

    async reset() {
        await fetch(`${API_Base}/reset`, { method: 'POST' });
        this.fetchState();
    }
}

export default new CryptoAIService();
