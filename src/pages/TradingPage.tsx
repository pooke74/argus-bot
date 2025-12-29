import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PaperBrokerService from '../services/PaperBrokerService';
import type { Portfolio, Trade } from '../services/PaperBrokerService';
import AITradingAgent from '../services/AITradingAgent';
import type { TradingSignal } from '../services/AITradingAgent';
import YahooFinanceProvider from '../services/YahooFinanceProvider';
import './TradingPage.css';

const WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMD', 'META', 'AMZN'];

export default function TradingPage() {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [signals, setSignals] = useState<TradingSignal[]>([]);
    const [autoTrading, setAutoTrading] = useState(AITradingAgent.isAutoTradingEnabled());
    const [scanning, setScanning] = useState(false);
    const [lastScan, setLastScan] = useState<string>('');

    const updatePortfolio = useCallback(async () => {
        const prices = new Map<string, number>();
        for (const symbol of WATCHLIST) {
            try {
                const quote = await YahooFinanceProvider.fetchQuote(symbol);
                prices.set(symbol, quote.price);
            } catch (e) {
                console.error(e);
            }
        }
        const p = PaperBrokerService.getPortfolio(prices);
        setPortfolio(p);
        setTrades(PaperBrokerService.getRecentTrades(20));
    }, []);

    const runScan = useCallback(async () => {
        setScanning(true);
        try {
            const results = await AITradingAgent.scanWatchlist(WATCHLIST);
            setSignals(results);
            setLastScan(new Date().toLocaleTimeString());
            await updatePortfolio();
        } catch (e) {
            console.error(e);
        }
        setScanning(false);
    }, [updatePortfolio]);

    useEffect(() => {
        updatePortfolio();
    }, [updatePortfolio]);

    const toggleAutoTrading = () => {
        const newState = !autoTrading;
        setAutoTrading(newState);
        AITradingAgent.setAutoTrading(newState);
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset your portfolio? All trades will be lost.')) {
            PaperBrokerService.reset();
            updatePortfolio();
            setSignals([]);
        }
    };

    return (
        <div className="trading-page">
            <header className="trading-header">
                <Link to="/" className="back-btn">← Monitor</Link>
                <h1>AI Trading Agent</h1>
                <div className="controls">
                    <button
                        className={`auto-toggle ${autoTrading ? 'active' : ''}`}
                        onClick={toggleAutoTrading}
                    >
                        {autoTrading ? '🤖 Auto: ON' : '🤖 Auto: OFF'}
                    </button>
                    <button
                        className="scan-btn"
                        onClick={runScan}
                        disabled={scanning}
                    >
                        {scanning ? 'Scanning...' : '🔍 Scan Market'}
                    </button>
                </div>
            </header>

            {/* Portfolio Summary */}
            {portfolio && (
                <section className="portfolio-section">
                    <h2>Portfolio</h2>
                    <div className="portfolio-cards">
                        <div className="stat-card">
                            <span className="label">Total Value</span>
                            <span className="value">${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">Cash</span>
                            <span className="value">${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">P&L</span>
                            <span className={`value ${portfolio.totalPL >= 0 ? 'positive' : 'negative'}`}>
                                {portfolio.totalPL >= 0 ? '+' : ''}${portfolio.totalPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                <span className="percent">({portfolio.totalPLPercent >= 0 ? '+' : ''}{portfolio.totalPLPercent.toFixed(2)}%)</span>
                            </span>
                        </div>
                    </div>

                    {portfolio.positions.length > 0 && (
                        <div className="positions">
                            <h3>Open Positions</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Shares</th>
                                        <th>Avg Cost</th>
                                        <th>Current</th>
                                        <th>Value</th>
                                        <th>P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.positions.map(pos => (
                                        <tr key={pos.symbol}>
                                            <td className="symbol">{pos.symbol}</td>
                                            <td>{pos.shares}</td>
                                            <td>${pos.avgCost.toFixed(2)}</td>
                                            <td>${pos.currentPrice.toFixed(2)}</td>
                                            <td>${pos.marketValue.toFixed(2)}</td>
                                            <td className={pos.unrealizedPL >= 0 ? 'positive' : 'negative'}>
                                                {pos.unrealizedPL >= 0 ? '+' : ''}${pos.unrealizedPL.toFixed(2)}
                                                <span className="percent">({pos.unrealizedPLPercent.toFixed(1)}%)</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* AI Signals */}
            {signals.length > 0 && (
                <section className="signals-section">
                    <h2>AI Signals {lastScan && <span className="time">({lastScan})</span>}</h2>
                    <div className="signals-grid">
                        {signals.map(sig => (
                            <div key={sig.symbol} className={`signal-card ${sig.action.toLowerCase()}`}>
                                <div className="signal-header">
                                    <span className="symbol">{sig.symbol}</span>
                                    <span className={`action ${sig.action.toLowerCase()}`}>{sig.action}</span>
                                    {sig.executed && <span className="executed">✓ Executed</span>}
                                </div>
                                <div className="scores">
                                    <span>Core: {sig.decision.coreScore}</span>
                                    <span>Pulse: {sig.decision.pulseScore}</span>
                                    <span>Combined: {sig.decision.compositeScore}</span>
                                </div>
                                <div className="reason">{sig.reason.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Trade History */}
            <section className="history-section">
                <h2>Trade History</h2>
                {trades.length === 0 ? (
                    <p className="empty">No trades yet. Enable auto-trading and scan the market to start!</p>
                ) : (
                    <div className="trades-list">
                        {trades.map(trade => (
                            <div key={trade.id} className={`trade-card ${trade.action.toLowerCase()}`}>
                                <div className="trade-header">
                                    <span className={`action ${trade.action.toLowerCase()}`}>{trade.action}</span>
                                    <span className="symbol">{trade.symbol}</span>
                                    <span className="time">{new Date(trade.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="trade-details">
                                    <span>{trade.shares} shares @ ${trade.price.toFixed(2)}</span>
                                    <span className="total">${trade.total.toFixed(2)}</span>
                                </div>
                                <div className="trade-reason">
                                    <span className="score">Argus Score: {trade.argusScore}</span>
                                    <p>{trade.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <footer className="trading-footer">
                <button className="reset-btn" onClick={handleReset}>Reset Portfolio</button>
                <p className="disclaimer">⚠️ Paper trading only. Not real money.</p>
            </footer>
        </div>
    );
}
