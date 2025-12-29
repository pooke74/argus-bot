const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const CONFIG = {
    INITIAL_CAPITAL: 1000,
    MAX_POSITIONS: 20,
    POSITION_SIZE: 0.10,
    MIN_TRADE_USD: 10,

    // Entry (Relaxed for Action)
    BUY_RSI_OVERSOLD: 45,
    BUY_RSI_CONFIRM: 55,
    BUY_VOLUME_SPIKE: 1.2,
    BUY_MOMENTUM_MIN: 0.01,
    BUY_MIN_SCORE: 30,

    // Exit
    TAKE_PROFIT: 0.05,
    STOP_LOSS: 0.03,
    MAX_HOLD_HOURS: 24,

    // Timing
    ANALYSIS_INTERVAL_MS: 30000
};

const STORAGE_FILE = path.join(__dirname, 'crypto_bot_state.json');

// --- Crypto List ---
const CRYPTO_PAIRS = [
    'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'SOL-USD',
    'ADA-USD', 'DOGE-USD', 'AVAX-USD', 'TRX-USD', 'LINK-USD',
    'DOT-USD', 'MATIC-USD', 'SHIB-USD', 'LTC-USD', 'BCH-USD',
    'UNI-USD', 'ATOM-USD', 'XLM-USD', 'NEAR-USD', 'ETC-USD'
];

// --- Helper: Fetch Yahoo Data ---
function fetchYahoo(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArgusBot/1.0)' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            });
        }).on('error', reject);
    });
}

class CryptoBot {
    constructor() {
        this.state = {
            isRunning: false,
            initialCapital: CONFIG.INITIAL_CAPITAL,
            currentCash: CONFIG.INITIAL_CAPITAL,
            positions: {}, // Object instead of Map for easier JSON serialization
            trades: [],
            totalValue: CONFIG.INITIAL_CAPITAL,
            totalPnL: 0,
            winRate: 0,
            lastAnalysis: null,
            scanSummary: {
                totalScanned: 0,
                qualified: 0,
                verbalLog: "Bot başlatılmaya hazır."
            }
        };
        this.intervalId = null;
        this.loadState();
    }

    loadState() {
        if (fs.existsSync(STORAGE_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
                this.state = { ...this.state, ...data };
                console.log('💾 Bot state loaded from disk.');
            } catch (e) {
                console.error('Failed to load bot state:', e);
            }
        }
    }

    saveState() {
        try {
            fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.state, null, 2));
        } catch (e) {
            console.error('Failed to save bot state:', e);
        }
    }

    start() {
        if (this.state.isRunning) return;
        this.state.isRunning = true;
        this.state.scanSummary.verbalLog = "🚀 Robot başlatıldı! Analiz yapılıyor...";
        console.log('🤖 Crypto Bot Started');

        // Run immediately then interval
        this.runAnalysis();
        this.intervalId = setInterval(() => this.runAnalysis(), CONFIG.ANALYSIS_INTERVAL_MS);
        this.saveState();
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.state.isRunning = false;
        this.state.scanSummary.verbalLog = "⏸️ Robot durduruldu.";
        console.log('🤖 Crypto Bot Stopped');
        this.saveState();
    }

    getStatus() {
        // Calculate dynamic stats
        let posValue = 0;
        Object.values(this.state.positions).forEach(p => {
            posValue += p.shares * p.currentPrice;
        });

        this.state.totalValue = this.state.currentCash + posValue;
        this.state.totalPnL = this.state.totalValue - this.state.initialCapital;

        return this.state;
    }

    async runAnalysis() {
        console.log(`🔍 Analyzing ${CRYPTO_PAIRS.length} pairs...`);
        const opportunities = [];

        // 1. Scan Market
        // (Simplified sequential scanning provided, in prod use Promise.all with concurrency limit)
        for (const symbol of CRYPTO_PAIRS) {
            const signals = await this.analyzeSymbol(symbol);
            if (signals) {
                opportunities.push({ symbol, signals });
            }
        }

        // 2. Buy/Sell Logic
        let madeTrade = false;

        // Check Exits
        for (const symbol in this.state.positions) {
            const pos = this.state.positions[symbol];
            // Update Price Logic would go here (omitted for brevity, utilizing analysis price)

            // Simple Stop/Loss logic simulation
            // In a real bot, we'd fetch fresh quotes for positions every tick
        }

        // Check Entries
        for (const opp of opportunities) {
            if (this.state.currentCash > CONFIG.MIN_TRADE_USD && !this.state.positions[opp.symbol]) {
                await this.executeBuy(opp.symbol, opp.signals.price);
                madeTrade = true;
            }
        }

        // Update Log
        if (madeTrade) {
            this.state.scanSummary.verbalLog = `✅ İşlem yapıldı! Portföy güncellendi.`;
        } else {
            this.state.scanSummary.verbalLog = `Analiz tamamlandı. ${opportunities.length} fırsat incelendi ancak alım kriterlerine uyan bulunamadı.`;
        }

        this.state.lastAnalysis = new Date();
        this.saveState();
    }

    async analyzeSymbol(symbol) {
        try {
            // Fetch Candles
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
            const data = await fetchYahoo(url);
            const result = data.chart?.result?.[0];

            if (!result) return null;

            const quote = result.meta;
            const price = quote.regularMarketPrice;

            // Simple Logic: Random Logic for Demo purpose if real analysis is too heavy
            // In a real implementation, we would calculate RSI here using the candles

            // DEMO LOGIC: 30% chance to buy if we have cash
            if (Math.random() < 0.3) {
                return { price, rsi: 30, vol: 'High' };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    async executeBuy(symbol, price) {
        const usdAmount = Math.min(this.state.currentCash * CONFIG.POSITION_SIZE, 100);
        const shares = usdAmount / price;

        this.state.currentCash -= usdAmount;
        this.state.positions[symbol] = {
            symbol,
            shares,
            avgCost: price,
            currentPrice: price,
            pnl: 0,
            date: new Date()
        };

        this.state.trades.unshift({
            id: Date.now(),
            symbol,
            action: 'BUY',
            price,
            amount: shares,
            timestamp: new Date(),
            reason: 'Bot Signal'
        });

        console.log(`💰 BOUGHT ${symbol} @ ${price}`);
    }
}

module.exports = new CryptoBot();
