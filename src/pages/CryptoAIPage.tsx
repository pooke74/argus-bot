import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CryptoAIService, { CRYPTO_PAIRS } from '../services/CryptoAIService';
import type { CryptoPosition, CryptoTrade, CryptoAIState } from '../services/CryptoAIService';
import './CryptoAIPage.css';

export default function CryptoAIPage() {
    const [state, setState] = useState<CryptoAIState | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'positions' | 'trades' | 'market'>('dashboard');

    useEffect(() => {
        loadState();
        setIsRunning(CryptoAIService.isRunning());

        // Refresh every 10 seconds
        const interval = setInterval(() => {
            loadState();
            setIsRunning(CryptoAIService.isRunning());
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const loadState = () => {
        const currentState = CryptoAIService.getState();
        setState(currentState);
    };

    const toggleRunning = () => {
        if (isRunning) {
            CryptoAIService.stop();
        } else {
            CryptoAIService.start();
        }
        setIsRunning(CryptoAIService.isRunning());
        loadState();
    };

    const handleReset = () => {
        if (confirm('Kripto AI\'yı sıfırlamak istediğinize emin misiniz? Tüm pozisyonlar ve geçmiş silinecek.')) {
            CryptoAIService.reset();
            loadState();
        }
    };

    if (!state) return <div className="loading">Yükleniyor...</div>;

    const positions = Array.from(state.positions.values());
    const trades = state.trades.slice(0, 50);

    return (
        <div className="crypto-ai-page">
            <header className="page-header">
                <Link to="/" className="back-btn">← Ana Sayfa</Link>
                <h1>₿ Kripto AI Trader</h1>
                <p>{CRYPTO_PAIRS.length} kripto para analiz ediliyor</p>
                <div className={`live-status ${isRunning ? 'active' : ''}`}>
                    <span className="live-dot"></span>
                    <span>{isRunning ? 'CANLI TRADİNG' : 'DURDURULDU'}</span>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <span className="stat-label">Toplam Değer</span>
                    <span className="stat-value">${state.totalValue.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Kâr/Zarar</span>
                    <span className={`stat-value ${state.totalPnL >= 0 ? 'positive' : 'negative'}`}>
                        ${state.totalPnL.toFixed(2)} ({state.totalPnLPercent >= 0 ? '+' : ''}{state.totalPnLPercent.toFixed(2)}%)
                    </span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Nakit</span>
                    <span className="stat-value">${state.currentCash.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Pozisyonlar</span>
                    <span className="stat-value">{state.positions.size}/20</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Kazanma Oranı</span>
                    <span className="stat-value">{state.winRate.toFixed(0)}%</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Toplam İşlem</span>
                    <span className="stat-value">{state.totalTrades}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="controls">
                <button
                    onClick={toggleRunning}
                    className={`control-btn ${isRunning ? 'stop' : 'start'}`}
                >
                    {isRunning ? '⏹️ Durdur' : '▶️ Başlat'}
                </button>
                <button onClick={handleReset} className="control-btn reset">
                    🔄 Sıfırla
                </button>
            </div>

            {/* AI Thought */}
            <div className="thought-bubble">
                <span className="thought-icon">🤖</span>
                <p>{state.lastThought}</p>
                {state.lastAnalysis && (
                    <span className="thought-time">
                        Son analiz: {new Date(state.lastAnalysis).toLocaleTimeString('tr-TR')}
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'positions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('positions')}
                >
                    💼 Pozisyonlar ({positions.length})
                </button>
                <button
                    className={`tab ${activeTab === 'trades' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trades')}
                >
                    📜 İşlemler ({trades.length})
                </button>
                <button
                    className={`tab ${activeTab === 'market' ? 'active' : ''}`}
                    onClick={() => setActiveTab('market')}
                >
                    🔥 Piyasa
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'dashboard' && (
                    <DashboardTab state={state} positions={positions} />
                )}
                {activeTab === 'positions' && (
                    <PositionsTab positions={positions} />
                )}
                {activeTab === 'trades' && (
                    <TradesTab trades={trades} />
                )}
                {activeTab === 'market' && (
                    <MarketTab state={state} />
                )}
            </div>
        </div>
    );
}

function DashboardTab({ state, positions }: { state: CryptoAIState; positions: CryptoPosition[] }) {
    return (
        <div className="dashboard-tab">
            {/* Scan Summary (Copied from Market Tab for visibility) */}
            {state.scanSummary && (
                <div className="market-section full-width" style={{ marginBottom: '1rem' }}>
                    <h3>🔍 Analiz Günlüğü (Neden İşlem Yok?)</h3>
                    <div className="scan-summary">
                        {state.scanSummary.verbalLog && (
                            <p className="scan-verbal-log" style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid #646cff' }}>
                                {state.scanSummary.verbalLog}
                            </p>
                        )}
                        <div className="scan-stat total">
                            <span className="scan-value">{state.scanSummary.totalScanned}</span>
                            <span className="scan-label">Taranan</span>
                        </div>
                        <div className="reason-item success">
                            <span className="reason-count">{state.scanSummary.qualified}</span>
                            <span className="reason-text">Uygun Aday</span>
                        </div>
                        <div className="scan-time">
                            Son: {state.lastAnalysis ? new Date(state.lastAnalysis).toLocaleTimeString() : '-'}
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                {/* Portfolio Pie */}
                <div className="dashboard-card">
                    <h3>📊 Portföy Dağılımı</h3>
                    <div className="portfolio-list">
                        <div className="portfolio-item cash">
                            <span className="coin-name">💵 Nakit</span>
                            <span className="coin-value">${state.currentCash.toFixed(2)}</span>
                            <span className="coin-percent">
                                {((state.currentCash / state.totalValue) * 100).toFixed(1)}%
                            </span>
                        </div>
                        {positions.slice(0, 5).map(pos => (
                            <div key={pos.symbol} className="portfolio-item">
                                <span className="coin-name">{pos.symbol.replace('-USD', '')}</span>
                                <span className="coin-value">${(pos.shares * pos.currentPrice).toFixed(2)}</span>
                                <span className={`coin-pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                                    {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                        {positions.length > 5 && (
                            <div className="portfolio-item more">
                                <span>+{positions.length - 5} daha...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="dashboard-card">
                    <h3>⚡ Son Aktivite</h3>
                    <div className="activity-list">
                        {state.trades.slice(0, 5).map(trade => (
                            <div key={trade.id} className={`activity-item ${trade.action.toLowerCase()}`}>
                                <span className="activity-action">
                                    {trade.action === 'BUY' ? '📈' : '📉'}
                                </span>
                                <span className="activity-symbol">{trade.symbol.replace('-USD', '')}</span>
                                <span className="activity-reason">{trade.reason}</span>
                            </div>
                        ))}
                        {state.trades.length === 0 && (
                            <p className="no-data">Henüz işlem yok</p>
                        )}
                    </div>
                </div>

                {/* Strategy Info */}
                <div className="dashboard-card strategy">
                    <h3>🎯 Strateji</h3>
                    <div className="strategy-list">
                        <div className="strategy-item">
                            <span>Max Pozisyon</span>
                            <span>20 coin</span>
                        </div>
                        <div className="strategy-item">
                            <span>Pozisyon Büyüklüğü</span>
                            <span>%5 / işlem</span>
                        </div>
                        <div className="strategy-item">
                            <span>Take Profit</span>
                            <span className="positive">+15%</span>
                        </div>
                        <div className="strategy-item">
                            <span>Stop Loss</span>
                            <span className="negative">-8%</span>
                        </div>
                        <div className="strategy-item">
                            <span>Max Tutma</span>
                            <span>7 gün</span>
                        </div>
                        <div className="strategy-item">
                            <span>RSI Al Sinyali</span>
                            <span>&lt; 30</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PositionsTab({ positions }: { positions: CryptoPosition[] }) {
    if (positions.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">💼</span>
                <p>Henüz açık pozisyon yok</p>
                <p className="empty-hint">AI trading başlatıldığında pozisyonlar burada görünecek</p>
            </div>
        );
    }

    return (
        <div className="positions-tab">
            <table className="positions-table">
                <thead>
                    <tr>
                        <th>Coin</th>
                        <th>Miktar</th>
                        <th>Maliyet</th>
                        <th>Şu An</th>
                        <th>K/Z</th>
                        <th>Süre</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.map(pos => (
                        <tr key={pos.symbol}>
                            <td className="coin-cell">
                                <span className="coin-symbol">{pos.symbol.replace('-USD', '')}</span>
                            </td>
                            <td>{pos.shares.toFixed(4)}</td>
                            <td>${pos.avgCost.toFixed(2)}</td>
                            <td>${pos.currentPrice.toFixed(2)}</td>
                            <td className={pos.pnl >= 0 ? 'positive' : 'negative'}>
                                ${pos.pnl.toFixed(2)} ({pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%)
                            </td>
                            <td>{pos.holdingTime.toFixed(1)}h</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TradesTab({ trades }: { trades: CryptoTrade[] }) {
    if (trades.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">📜</span>
                <p>Henüz işlem geçmişi yok</p>
            </div>
        );
    }

    return (
        <div className="trades-tab">
            {trades.map(trade => (
                <div key={trade.id} className={`trade-card ${trade.action.toLowerCase()}`}>
                    <div className="trade-header">
                        <span className={`trade-action ${trade.action.toLowerCase()}`}>
                            {trade.action === 'BUY' ? '📈 ALIŞ' : '📉 SATIŞ'}
                        </span>
                        <span className="trade-symbol">{trade.symbol.replace('-USD', '')}</span>
                        <span className="trade-time">
                            {new Date(trade.timestamp).toLocaleString('tr-TR')}
                        </span>
                    </div>
                    <div className="trade-details">
                        <div className="trade-detail">
                            <span>Fiyat</span>
                            <span>${trade.price.toFixed(4)}</span>
                        </div>
                        <div className="trade-detail">
                            <span>Miktar</span>
                            <span>{trade.amount.toFixed(4)}</span>
                        </div>
                        <div className="trade-detail">
                            <span>Değer</span>
                            <span>${trade.usdValue.toFixed(2)}</span>
                        </div>

                    </div>
                    <div className="trade-reason">
                        <span className="reason-label">Sebep:</span>
                        <span>{trade.reason}</span>
                    </div>

                </div>
            ))}
        </div>
    );
}

function MarketTab({ state }: { state: CryptoAIState }) {
    return (
        <div className="market-tab">
            <div className="market-section">
                <h3>🚀 En Çok Yükselenler (24h)</h3>
                <div className="coin-list">
                    {state.topGainers.length > 0 ? (
                        state.topGainers.map(symbol => (
                            <div key={symbol} className="coin-chip gainer">
                                {symbol.replace('-USD', '')}
                            </div>
                        ))
                    ) : (
                        <p className="no-data">Veri bekleniyor...</p>
                    )}
                </div>
            </div>

            <div className="market-section">
                <h3>📉 En Çok Düşenler (24h)</h3>
                <div className="coin-list">
                    {state.topLosers.length > 0 ? (
                        state.topLosers.map(symbol => (
                            <div key={symbol} className="coin-chip loser">
                                {symbol.replace('-USD', '')}
                            </div>
                        ))
                    ) : (
                        <p className="no-data">Veri bekleniyor...</p>
                    )}
                </div>
            </div>

            <div className="market-section full-width">
                <h3>🔍 Analiz Günlüğü (Neden İşlem Yok?)</h3>
                {state.scanSummary ? (
                    <div className="scan-summary">
                        {state.scanSummary.verbalLog && (
                            <p className="scan-verbal-log" style={{ width: '100%', marginBottom: '1rem', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid #646cff' }}>
                                {state.scanSummary.verbalLog}
                            </p>
                        )}
                        <div className="scan-stat total">
                            <span className="scan-value">{state.scanSummary.totalScanned}</span>
                            <span className="scan-label">Taranan</span>
                        </div>
                        <div className="scan-reasons">
                            <div className="reason-item success">
                                <span className="reason-count">{state.scanSummary.qualified}</span>
                                <span className="reason-text">Uygun Aday</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="no-data">Analiz bekleniyor...</p>
                )}
            </div>

            <div className="market-section">
                <h3>🔥 Hacim Patlaması</h3>
                <div className="coin-list">
                    {state.hotCoins.length > 0 ? (
                        state.hotCoins.map(symbol => (
                            <div key={symbol} className="coin-chip hot">
                                {symbol.replace('-USD', '')}
                            </div>
                        ))
                    ) : (
                        <p className="no-data">Veri bekleniyor...</p>
                    )}
                </div>
            </div>

            <div className="market-section crypto-list">
                <h3>₿ Taranan Kriptolar ({CRYPTO_PAIRS.length})</h3>
                <div className="crypto-grid">
                    {CRYPTO_PAIRS.slice(0, 50).map(symbol => (
                        <span key={symbol} className="crypto-tag">
                            {symbol.replace('-USD', '')}
                        </span>
                    ))}
                    <span className="crypto-tag more">+{CRYPTO_PAIRS.length - 50} daha</span>
                </div>
            </div>
        </div>
    );
}
