import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MultiAIBrokerService from '../services/MultiAIBrokerService';
import type { AITrader, AITrade } from '../services/MultiAIBrokerService';
import './AITradersPage.css';

export default function AITradersPage() {
    const [traders, setTraders] = useState<AITrader[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expandedTrader, setExpandedTrader] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<string>('');

    useEffect(() => {
        loadTraders();
        setIsRunning(MultiAIBrokerService.isAutonomousRunning());

        // 🔄 AUTO REFRESH every 30 seconds to keep data live
        const interval = setInterval(() => {
            loadTraders();
            setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadTraders = () => {
        const data = MultiAIBrokerService.getTraders();
        setTraders([...data]);
        setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
    };

    const runAnalysis = async () => {
        setLoading(true);
        await MultiAIBrokerService.runAnalysis();
        loadTraders();
        setLoading(false);
    };

    const toggleAutonomous = () => {
        if (isRunning) {
            MultiAIBrokerService.stopAutonomous();
        } else {
            MultiAIBrokerService.startAutonomous(5);
        }
        setIsRunning(MultiAIBrokerService.isAutonomousRunning());
    };

    const resetAll = () => {
        if (confirm('Tüm AI trader\'ları sıfırlamak istediğinize emin misiniz?')) {
            MultiAIBrokerService.resetAll();
            loadTraders();
        }
    };

    const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
    const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

    return (
        <div className="ai-traders-page">
            <header className="page-header">
                <Link to="/" className="back-btn">← Ana Sayfa</Link>
                <h1>🤖 AI Traders Arena</h1>
                <p>3 Farklı Strateji, 3 Farklı Yapay Zeka</p>
                <div className="live-status">
                    <span className="live-dot"></span>
                    <span>CANLI • Son güncelleme: {lastUpdate}</span>
                </div>
            </header>

            <div className="controls">
                <button onClick={runAnalysis} disabled={loading} className="analyze-btn">
                    {loading ? '⏳ Analiz Ediliyor...' : '🔍 Şimdi Analiz Et'}
                </button>
                <button onClick={toggleAutonomous} className={`auto-btn ${isRunning ? 'active' : ''}`}>
                    {isRunning ? '🟢 Otonom: AÇIK' : '⚪ Otonom: KAPALI'}
                </button>
                <button onClick={resetAll} className="reset-btn">
                    🔄 Hepsini Sıfırla
                </button>
            </div>

            <div className="traders-grid">
                {traders.map(trader => (
                    <div
                        key={trader.id}
                        className={`trader-card ${trader.id} ${expandedTrader === trader.id ? 'expanded' : ''}`}
                        onClick={() => setExpandedTrader(expandedTrader === trader.id ? null : trader.id)}
                    >
                        <div className="trader-header">
                            <span className="trader-emoji">{trader.emoji}</span>
                            <div className="trader-info">
                                <h2>{trader.name}</h2>
                                <p className="trader-desc">{trader.description}</p>
                            </div>
                        </div>

                        <div className="stats-grid">
                            <div className="stat">
                                <span className="stat-label">Toplam Değer</span>
                                <span className="stat-value">{formatCurrency(trader.totalValue)}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Kâr/Zarar</span>
                                <span className={`stat-value ${trader.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(trader.totalPnL)} ({formatPercent(trader.totalPnLPercent)})
                                </span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Nakit</span>
                                <span className="stat-value">{formatCurrency(trader.currentCash)}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Kazanma Oranı</span>
                                <span className="stat-value">{trader.winRate.toFixed(0)}%</span>
                            </div>
                        </div>

                        <div className="thought-bubble">
                            <span className="thought-icon">💭</span>
                            <p>{trader.lastThought}</p>
                        </div>

                        {/* Positions */}
                        {trader.positions.size > 0 && (
                            <div className="positions-section">
                                <h4>📊 Açık Pozisyonlar</h4>
                                <div className="positions-list">
                                    {Array.from(trader.positions.values()).map(pos => (
                                        <div key={pos.symbol} className="position-item">
                                            <span className="pos-symbol">{pos.symbol}</span>
                                            <span className="pos-shares">{pos.shares.toFixed(2)} adet</span>
                                            <span className={`pos-pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                                                {formatCurrency(pos.pnl)} ({formatPercent(pos.pnlPercent)})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Trades */}
                        {trader.trades.length > 0 && (
                            <div className="trades-section">
                                <h4>📜 Son İşlemler</h4>
                                <div className="trades-list">
                                    {trader.trades.slice(0, 5).map(trade => (
                                        <TradeItem key={trade.id} trade={trade} />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="expand-hint">
                            {expandedTrader === trader.id ? '▲ Daralt' : '▼ Detaylar'}
                        </div>
                    </div>
                ))}
            </div>

            <div className="leaderboard">
                <h3>🏆 Liderlik Tablosu</h3>
                <div className="leaderboard-list">
                    {[...traders]
                        .sort((a, b) => b.totalPnLPercent - a.totalPnLPercent)
                        .map((trader, idx) => (
                            <div key={trader.id} className={`leaderboard-item ${idx === 0 ? 'leader' : ''}`}>
                                <span className="rank">{idx + 1}.</span>
                                <span className="emoji">{trader.emoji}</span>
                                <span className="name">{trader.name}</span>
                                <span className={`pnl ${trader.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                                    {formatPercent(trader.totalPnLPercent)}
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}

function TradeItem({ trade }: { trade: AITrade }) {
    const isBuy = trade.action === 'BUY';
    return (
        <div className={`trade-item ${trade.action.toLowerCase()}`}>
            <div className="trade-header">
                <span className={`trade-action ${isBuy ? 'buy' : 'sell'}`}>
                    {isBuy ? '📈 ALIŞ' : '📉 SATIŞ'}
                </span>
                <span className="trade-symbol">{trade.symbol}</span>
                <span className="trade-time">
                    {new Date(trade.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div className="trade-details">
                <span>{trade.shares.toFixed(2)} adet @ ${trade.price.toFixed(2)}</span>
                {trade.pnl !== undefined && (
                    <span className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                        P&L: ${trade.pnl.toFixed(2)}
                    </span>
                )}
            </div>
            <p className="trade-reason">{trade.reason}</p>
        </div>
    );
}
