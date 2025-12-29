// Paper Broker Service - Virtual Trading System
// Manages portfolio, executes trades, tracks history

export interface Position {
    symbol: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
}

export interface Trade {
    id: string;
    timestamp: Date;
    symbol: string;
    action: 'BUY' | 'SELL';
    shares: number;
    price: number;
    total: number;
    reason: string;
    argusScore: number;
}

export interface Portfolio {
    cash: number;
    positions: Position[];
    totalValue: number;
    totalPL: number;
    totalPLPercent: number;
}

const INITIAL_CAPITAL = 100000;
const MAX_POSITION_SIZE = 0.20; // 20% max per position
const STOP_LOSS_PERCENT = -10;

class PaperBrokerService {
    private static instance: PaperBrokerService;
    private cash: number = INITIAL_CAPITAL;
    private positions: Map<string, { shares: number; avgCost: number }> = new Map();
    private trades: Trade[] = [];
    private startingCapital: number = INITIAL_CAPITAL;

    private constructor() {
        this.loadState();
    }

    public static getInstance(): PaperBrokerService {
        if (!PaperBrokerService.instance) {
            PaperBrokerService.instance = new PaperBrokerService();
        }
        return PaperBrokerService.instance;
    }

    private loadState(): void {
        try {
            const saved = localStorage.getItem('argus_portfolio');
            if (saved) {
                const state = JSON.parse(saved);
                this.cash = state.cash;
                this.positions = new Map(state.positions);
                this.trades = state.trades.map((t: Trade) => ({
                    ...t,
                    timestamp: new Date(t.timestamp)
                }));
                this.startingCapital = state.startingCapital || INITIAL_CAPITAL;
            }
        } catch (e) {
            console.warn('Failed to load portfolio state:', e);
        }
    }

    private saveState(): void {
        try {
            const state = {
                cash: this.cash,
                positions: Array.from(this.positions.entries()),
                trades: this.trades,
                startingCapital: this.startingCapital
            };
            localStorage.setItem('argus_portfolio', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save portfolio state:', e);
        }
    }

    buy(symbol: string, price: number, reason: string, argusScore: number): Trade | null {
        // Calculate position size (max 20% of portfolio)
        const maxInvestment = this.getTotalValue(new Map([[symbol, price]])) * MAX_POSITION_SIZE;
        const investment = Math.min(maxInvestment, this.cash * 0.9); // Keep 10% cash buffer

        if (investment < 100) {
            console.warn('Insufficient funds for trade');
            return null;
        }

        const shares = Math.floor(investment / price);
        if (shares < 1) return null;

        const total = shares * price;
        this.cash -= total;

        // Update position
        const existing = this.positions.get(symbol);
        if (existing) {
            const totalShares = existing.shares + shares;
            const totalCost = (existing.shares * existing.avgCost) + total;
            this.positions.set(symbol, {
                shares: totalShares,
                avgCost: totalCost / totalShares
            });
        } else {
            this.positions.set(symbol, { shares, avgCost: price });
        }

        const trade: Trade = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            symbol,
            action: 'BUY',
            shares,
            price,
            total,
            reason,
            argusScore
        };

        this.trades.unshift(trade);
        this.saveState();
        return trade;
    }

    sell(symbol: string, price: number, reason: string, argusScore: number, sellAll: boolean = true): Trade | null {
        const position = this.positions.get(symbol);
        if (!position || position.shares <= 0) {
            return null;
        }

        const sharesToSell = sellAll ? position.shares : Math.ceil(position.shares / 2);
        const total = sharesToSell * price;

        this.cash += total;

        if (sellAll) {
            this.positions.delete(symbol);
        } else {
            this.positions.set(symbol, {
                shares: position.shares - sharesToSell,
                avgCost: position.avgCost
            });
        }

        const trade: Trade = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            symbol,
            action: 'SELL',
            shares: sharesToSell,
            price,
            total,
            reason,
            argusScore
        };

        this.trades.unshift(trade);
        this.saveState();
        return trade;
    }

    getPortfolio(currentPrices: Map<string, number>): Portfolio {
        const positions: Position[] = [];
        let totalValue = this.cash;

        this.positions.forEach((pos, symbol) => {
            const currentPrice = currentPrices.get(symbol) || pos.avgCost;
            const marketValue = pos.shares * currentPrice;
            const costBasis = pos.shares * pos.avgCost;
            const unrealizedPL = marketValue - costBasis;

            positions.push({
                symbol,
                shares: pos.shares,
                avgCost: pos.avgCost,
                currentPrice,
                marketValue,
                unrealizedPL,
                unrealizedPLPercent: (unrealizedPL / costBasis) * 100
            });

            totalValue += marketValue;
        });

        const totalPL = totalValue - this.startingCapital;

        return {
            cash: this.cash,
            positions,
            totalValue,
            totalPL,
            totalPLPercent: (totalPL / this.startingCapital) * 100
        };
    }

    getPosition(symbol: string): { shares: number; avgCost: number } | null {
        return this.positions.get(symbol) || null;
    }

    getTrades(): Trade[] {
        return this.trades;
    }

    getRecentTrades(count: number = 10): Trade[] {
        return this.trades.slice(0, count);
    }

    private getTotalValue(prices: Map<string, number>): number {
        let total = this.cash;
        this.positions.forEach((pos, symbol) => {
            const price = prices.get(symbol) || pos.avgCost;
            total += pos.shares * price;
        });
        return total;
    }

    reset(): void {
        this.cash = INITIAL_CAPITAL;
        this.positions.clear();
        this.trades = [];
        this.startingCapital = INITIAL_CAPITAL;
        this.saveState();
    }

    shouldStopLoss(symbol: string, currentPrice: number): boolean {
        const position = this.positions.get(symbol);
        if (!position) return false;

        const plPercent = ((currentPrice - position.avgCost) / position.avgCost) * 100;
        return plPercent <= STOP_LOSS_PERCENT;
    }
}

export default PaperBrokerService.getInstance();
