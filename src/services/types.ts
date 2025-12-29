export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Quote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
}

export interface Fundamentals {
    peRatio?: number;
    roe?: number;
    profitMargin?: number;
    debtToEquity?: number;
    sector: string;
}

export interface ArgusDecision {
    coreScore: number;
    pulseScore: number;
    coreSignal: string;
    pulseSignal: string;
    explanation: string;
}
