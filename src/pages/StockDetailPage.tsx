import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import YahooFinanceProvider from '../services/YahooFinanceProvider';
import type { Candle, Quote } from '../services/YahooFinanceProvider';
import AtlasEngine from '../services/AtlasEngine';
import type { AtlasResult } from '../services/AtlasEngine';
import OrionAnalysisService from '../services/OrionAnalysisService';
import type { OrionResult } from '../services/OrionAnalysisService';
import ArgusDecisionEngine from '../services/ArgusDecisionEngine';
import type { ArgusDecision } from '../services/ArgusDecisionEngine';
import NewsService from '../services/NewsService';
import type { NewsItem } from '../services/NewsService';
import CompanyProfileService from '../services/CompanyProfileService';
import type { CompanyProfile, UpcomingEvent } from '../services/CompanyProfileService';
// New Module Imports
import PhoenixEngine from '../services/PhoenixEngine';
import type { PhoenixResult } from '../services/PhoenixEngine';
import AetherEngine from '../services/AetherEngine';
import type { AetherResult } from '../services/AetherEngine';
import DemeterEngine from '../services/DemeterEngine';
import type { DemeterResult } from '../services/DemeterEngine';
import CronosEngine from '../services/CronosEngine';
import type { CronosResult } from '../services/CronosEngine';
import './StockDetailPage.css';

export default function StockDetailPage() {
    const { symbol } = useParams<{ symbol: string }>();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [candles, setCandles] = useState<Candle[]>([]);
    const [atlas, setAtlas] = useState<AtlasResult | null>(null);
    const [orion, setOrion] = useState<OrionResult | null>(null);
    const [decision, setDecision] = useState<ArgusDecision | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [events, setEvents] = useState<UpcomingEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'analysis' | 'company' | 'news' | 'events'>('analysis');

    // New module states
    const [phoenix, setPhoenix] = useState<PhoenixResult | null>(null);
    const [aether, setAether] = useState<AetherResult | null>(null);
    const [demeter, setDemeter] = useState<DemeterResult | null>(null);
    const [cronos, setCronos] = useState<CronosResult | null>(null);

    useEffect(() => {
        async function analyze() {
            if (!symbol) return;
            setLoading(true);

            try {
                // Parallel fetch via Aggregated Analysis Endpoint
                const analysisPromise = YahooFinanceProvider.fetchAnalysisData(symbol);
                const newsPromise = NewsService.fetchNewsForSymbol(symbol).catch(e => { console.error('News failed', e); return []; });
                const eventsPromise = CompanyProfileService.fetchUpcomingEvents(symbol).catch(e => { console.error('Events failed', e); return []; });

                const [analysis, newsData, eventsData] = await Promise.all([
                    analysisPromise,
                    newsPromise,
                    eventsPromise
                ]);

                // Destructure aggregated data
                let { quote, candles, fundamentals } = analysis;

                // Fallback to individual fetches if aggregated data is incomplete
                if (!quote) {
                    console.warn('Quote missing, fetching individually...');
                    quote = await YahooFinanceProvider.fetchQuote(symbol).catch(() => null);
                }
                if (!candles || candles.length === 0) {
                    console.warn('Candles missing, fetching individually...');
                    candles = await YahooFinanceProvider.fetchCandles(symbol).catch(() => []);
                }
                if (!fundamentals) {
                    console.warn('Fundamentals missing, fetching individually...');
                    fundamentals = await YahooFinanceProvider.fetchFundamentals(symbol).catch(() => null);
                }

                // Always fetch profile separately for reliability
                const profileData = await CompanyProfileService.fetchCompanyProfile(symbol).catch(() => null);

                if (quote) setQuote(quote);
                if (candles && candles.length > 0) setCandles(candles);
                if (profileData) setProfile(profileData);

                if (newsData) setNews(newsData);
                if (eventsData) setEvents(eventsData);

                // Run Analysis Engines
                let atlasResult: AtlasResult | null = null;
                let orionResult: OrionResult | null = null;
                let phoenixResult: PhoenixResult | null = null;
                let aetherResult: AetherResult | null = null;
                let demeterResult: DemeterResult | null = null;
                let cronosResult: CronosResult | null = null;

                if (fundamentals) {
                    try {
                        atlasResult = AtlasEngine.analyze(fundamentals);
                        setAtlas(atlasResult);
                    } catch (e) { console.error('Atlas analysis failed', e); }
                }

                if (candles && candles.length > 0) {
                    try {
                        orionResult = OrionAnalysisService.calculateOrionScore(candles);
                        setOrion(orionResult);
                    } catch (e) { console.error('Orion analysis failed', e); }

                    // Phoenix Analysis
                    try {
                        phoenixResult = PhoenixEngine.analyze(candles);
                        setPhoenix(phoenixResult);
                    } catch (e) { console.error('Phoenix analysis failed', e); }
                }

                // Aether (Macro) Analysis - Independent of symbol
                try {
                    aetherResult = await AetherEngine.evaluateMacro();
                    setAether(aetherResult);
                } catch (e) { console.error('Aether analysis failed', e); }

                // Demeter (Sector) Analysis
                try {
                    const sector = profileData?.sector || 'Teknoloji';
                    demeterResult = await DemeterEngine.analyze(sector);
                    setDemeter(demeterResult);
                } catch (e) { console.error('Demeter analysis failed', e); }

                // Cronos (Timing) Analysis
                try {
                    cronosResult = await CronosEngine.analyze(symbol);
                    setCronos(cronosResult);
                } catch (e) { console.error('Cronos analysis failed', e); }

                // Argus Decision - Now with all modules
                try {
                    const newsSentiment = await NewsService.getNewsBasedSentiment(symbol).catch(() => undefined);
                    const argusDecision = ArgusDecisionEngine.makeDecision({
                        atlas: atlasResult,
                        orion: orionResult,
                        phoenix: phoenixResult,
                        aether: aetherResult,
                        demeter: demeterResult,
                        cronos: cronosResult,
                        newsSentiment,
                        symbol
                    });
                    setDecision(argusDecision);
                } catch (e) { console.error('Decision Engine failed', e); }

            } catch (e) {
                console.error('Critical error in StockDetailPage', e);
            }
            setLoading(false);
        }
        analyze();
    }, [symbol]);

    const toggleEventNotification = (event: UpcomingEvent) => {
        if (symbol) {
            const newState = CompanyProfileService.toggleNotification(event, symbol);
            setEvents(events.map(e =>
                e.id === event.id ? { ...e, notificationEnabled: newState } : e
            ));
        }
    };

    const formatMarketCap = (cap: number): string => {
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
        if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
        return `$${cap.toLocaleString()}`;
    };

    return (
        <div className="detail-page">
            <header className="detail-header">
                <Link to="/" className="back-btn">← Geri</Link>
                <div className="title-section">
                    <h1>{symbol}</h1>
                    {profile?.name && <span className="company-name">{profile.name}</span>}
                </div>
                {quote && (
                    <div className="price-section">
                        <span className="price">${quote.price.toFixed(2)}</span>
                        <span className={`change ${quote.change >= 0 ? 'positive' : 'negative'}`}>
                            {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                        </span>
                        <div className="data-source-info" style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                            *Hisse verileri 15dk gecikmeli olabilir
                        </div>
                    </div>
                )}
            </header>

            {/* Tabs */}
            <div className="tabs">
                <button className={activeTab === 'analysis' ? 'active' : ''} onClick={() => setActiveTab('analysis')}>
                    📊 Analiz
                </button>
                <button className={activeTab === 'company' ? 'active' : ''} onClick={() => setActiveTab('company')}>
                    🏢 Firma
                </button>
                <button className={activeTab === 'news' ? 'active' : ''} onClick={() => setActiveTab('news')}>
                    📰 Haberler
                </button>
                <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
                    📅 Etkinlikler {events.length > 0 && <span className="badge">{events.length}</span>}
                </button>
            </div>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>{symbol} analiz ediliyor...</p>
                </div>
            ) : (
                <>
                    {/* Analysis Tab */}
                    {activeTab === 'analysis' && (
                        <>
                            {decision && (
                                <section className="decision-section">
                                    <h2>Argus AI Kararı</h2>
                                    <div className="final-signal" data-signal={decision.finalSignal.toLowerCase().replace(' ', '-')}>
                                        <span className="signal-label">Final Sinyal</span>
                                        <span className="signal-value">{decision.finalSignal}</span>
                                        <span className="confidence">Güven: {decision.confidence}</span>
                                    </div>

                                    <div className="scores">
                                        <div className="score-card">
                                            <span className="label">Core</span>
                                            <span className="sublabel">(Temel)</span>
                                            <div className="score-bar">
                                                <div className="score-fill" style={{ width: `${decision.coreScore}%` }}></div>
                                            </div>
                                            <span className="value">{decision.coreScore}</span>
                                        </div>
                                        <div className="score-card">
                                            <span className="label">Pulse</span>
                                            <span className="sublabel">(Teknik)</span>
                                            <div className="score-bar">
                                                <div className="score-fill pulse" style={{ width: `${decision.pulseScore}%` }}></div>
                                            </div>
                                            <span className="value">{decision.pulseScore}</span>
                                        </div>
                                        <div className="score-card">
                                            <span className="label">Haber</span>
                                            <span className="sublabel">(Sentiment)</span>
                                            <div className="score-bar">
                                                <div className={`score-fill ${decision.newsScore > 0 ? 'positive' : decision.newsScore < 0 ? 'negative' : ''}`}
                                                    style={{ width: `${50 + decision.newsScore / 2}%` }}></div>
                                            </div>
                                            <span className="value">{decision.newsScore > 0 ? '+' : ''}{decision.newsScore}</span>
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {decision.warnings && decision.warnings.length > 0 && (
                                        <div className="warnings-box">
                                            {decision.warnings.map((w, i) => <span key={i} className="warning">{w}</span>)}
                                        </div>
                                    )}

                                    {decision.newsImpact && <div className="news-impact">{decision.newsImpact}</div>}
                                    <div className="explanation">{decision.explanation}</div>

                                    {decision.actionItems.length > 0 && (
                                        <div className="action-items">
                                            <h4>Önerilen Aksiyonlar:</h4>
                                            <ul>{decision.actionItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                        </div>
                                    )}
                                </section>
                            )}

                            <section className="chart-section">
                                <h2>Fiyat Grafiği (1 Yıl)</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={candles}>
                                        <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                                        <YAxis domain={['auto', 'auto']} tick={{ fill: '#888' }} />
                                        <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} labelStyle={{ color: '#888' }} />
                                        {orion && <ReferenceLine y={orion.indicators.sma50} stroke="#f59e0b" strokeDasharray="5 5" />}
                                        {phoenix && phoenix.channelMid > 0 && (
                                            <>
                                                <ReferenceLine y={phoenix.channelUpper} stroke="#22c55e" strokeDasharray="3 3" />
                                                <ReferenceLine y={phoenix.channelMid} stroke="#3b82f6" strokeDasharray="3 3" />
                                                <ReferenceLine y={phoenix.channelLower} stroke="#ef4444" strokeDasharray="3 3" />
                                            </>
                                        )}
                                        <Line type="monotone" dataKey="close" stroke="#7c3aed" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                                <div className="chart-badges">
                                    {orion && (
                                        <span className="regime-badge" data-regime={orion.regime.toLowerCase()}>
                                            Piyasa: {orion.regime}
                                        </span>
                                    )}
                                    {aether && (
                                        <span className="regime-badge" data-regime={aether.regime.toLowerCase().replace('-', '')}>
                                            Makro: {aether.regime}
                                        </span>
                                    )}
                                </div>
                            </section>

                            {/* New Modules Section */}
                            <section className="modules-grid">
                                {/* Phoenix Card */}
                                {phoenix && (
                                    <div className={`module-card phoenix ${phoenix.status}`}>
                                        <div className="module-header">
                                            <span className="module-icon">🔥</span>
                                            <span className="module-name">Phoenix</span>
                                            <span className={`module-mode ${phoenix.mode}`}>
                                                {phoenix.mode === 'trend' ? 'TREND' : 'REVERSION'}
                                            </span>
                                        </div>
                                        <div className="module-score">
                                            <span className="score-value">{Math.round(phoenix.score)}</span>
                                            <span className="score-status">{phoenix.status === 'active' ? 'Aktif' : 'Pasif'}</span>
                                        </div>
                                        <p className="module-reason">{phoenix.reason}</p>
                                        <div className="module-indicators">
                                            <span>RSI: {phoenix.indicators.rsi.toFixed(0)}</span>
                                            <span>Divergence: {phoenix.indicators.hasDivergence ? '✓' : '-'}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Aether Card */}
                                {aether && (
                                    <div className={`module-card aether ${aether.regime.toLowerCase().replace('-', '')}`}>
                                        <div className="module-header">
                                            <span className="module-icon">🌌</span>
                                            <span className="module-name">Aether</span>
                                            <span className="module-regime">{aether.regime}</span>
                                        </div>
                                        <div className="module-score">
                                            <span className="score-value">{aether.score}</span>
                                            <span className="score-label">Makro Skor</span>
                                        </div>
                                        <div className="module-details">
                                            {aether.vixLevel && <span>VIX: {aether.vixLevel.toFixed(1)}</span>}
                                            <span>SPY: {aether.marketTrend}</span>
                                        </div>
                                        <p className="module-info">{aether.sectorRotation}</p>
                                    </div>
                                )}

                                {/* Demeter Card */}
                                {demeter && (
                                    <div className={`module-card demeter`}>
                                        <div className="module-header">
                                            <span className="module-icon">🌾</span>
                                            <span className="module-name">Demeter</span>
                                            <span className="module-rotation">{demeter.rotation}</span>
                                        </div>
                                        <div className="module-score">
                                            <span className="score-value">{Math.round(demeter.score)}</span>
                                            <span className="score-label">Sektör Skor</span>
                                        </div>
                                        <div className="module-details">
                                            <span>{demeter.stockSector}: {demeter.sectorPerformance > 0 ? '+' : ''}{demeter.sectorPerformance.toFixed(1)}%</span>
                                            <span className={demeter.vsMarket > 0 ? 'positive' : 'negative'}>
                                                vs SPY: {demeter.vsMarket > 0 ? '+' : ''}{demeter.vsMarket.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="top-sectors">
                                            <span className="label">Top:</span>
                                            {demeter.topSectors.slice(0, 2).map(s => (
                                                <span key={s.etf} className="sector-tag">{s.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cronos Card */}
                                {cronos && (
                                    <div className={`module-card cronos`}>
                                        <div className="module-header">
                                            <span className="module-icon">⏰</span>
                                            <span className="module-name">Cronos</span>
                                            <span className="module-day">{cronos.tradingDay}</span>
                                        </div>
                                        <div className="module-score">
                                            <span className="score-value">{Math.round(cronos.score)}</span>
                                            <span className="score-label">Zamanlama</span>
                                        </div>
                                        <div className="module-details">
                                            <span>{cronos.seasonality}</span>
                                            {cronos.isEarningsSoon && (
                                                <span className="earnings-warning">
                                                    📊 Earnings: {cronos.daysToEarnings} gün
                                                </span>
                                            )}
                                        </div>
                                        {cronos.warnings.length > 0 && (
                                            <div className="cronos-warnings">
                                                {cronos.warnings.map((w, i) => <span key={i}>{w}</span>)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            <section className="analysis-section">
                                <div className="analysis-card">
                                    <h3>Atlas (Temel Analiz)</h3>
                                    {atlas && (
                                        <>
                                            <div className="components">
                                                <div className="component"><span>Kârlılık</span><span>{atlas.components.profitability}/35</span></div>
                                                <div className="component"><span>Sağlık</span><span>{atlas.components.health}/30</span></div>
                                                <div className="component"><span>Değerleme</span><span>{atlas.components.valuation}/35</span></div>
                                            </div>
                                            <ul className="details-list">{atlas.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                                        </>
                                    )}
                                </div>

                                <div className="analysis-card">
                                    <h3>Orion (Teknik Analiz)</h3>
                                    {orion && (
                                        <>
                                            <div className="components">
                                                <div className="component"><span>Trend</span><span>{orion.components.trend}/35</span></div>
                                                <div className="component"><span>Momentum</span><span>{orion.components.momentum}/35</span></div>
                                                <div className="component"><span>Yapı</span><span>{orion.components.structure}/30</span></div>
                                            </div>
                                            <div className="indicators">
                                                <span>RSI: {orion.indicators.rsi.toFixed(1)}</span>
                                                <span>SMA50: {orion.indicators.priceVsSma50.toFixed(1)}%</span>
                                            </div>
                                            <ul className="details-list">{orion.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
                                        </>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {/* Company Tab */}
                    {activeTab === 'company' && profile && (
                        <section className="company-section">
                            <div className="company-header">
                                <h2>{profile.name}</h2>
                                <span className="sector-badge">{profile.sector} • {profile.industry}</span>
                            </div>

                            <div className="company-stats">
                                <div className="stat"><span className="label">Piyasa Değeri</span><span className="value">{formatMarketCap(profile.marketCap)}</span></div>
                                <div className="stat"><span className="label">Borsa</span><span className="value">{profile.exchange}</span></div>
                                <div className="stat"><span className="label">Çalışan</span><span className="value">{profile.employees.toLocaleString()}</span></div>
                                <div className="stat"><span className="label">CEO</span><span className="value">{profile.ceo}</span></div>
                                <div className="stat"><span className="label">Merkez</span><span className="value">{profile.headquarters}</span></div>
                                {profile.website && (
                                    <div className="stat">
                                        <span className="label">Website</span>
                                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="value link">{profile.website}</a>
                                    </div>
                                )}
                            </div>

                            <div className="company-description">
                                <h3>Hakkında</h3>
                                <p>{profile.description}</p>
                            </div>
                        </section>
                    )}

                    {/* News Tab */}
                    {activeTab === 'news' && (
                        <section className="news-section">
                            <h2>📰 Son Haberler & AI Yorumu</h2>
                            {news.length === 0 ? (
                                <p className="no-news">Haber bulunamadı.</p>
                            ) : (
                                <div className="news-list">
                                    {news.map(item => (
                                        <div key={item.id} className={`news-card ${item.sentiment}`}>
                                            <div className="news-header">
                                                <span className={`sentiment-badge ${item.sentiment}`}>
                                                    {item.sentiment === 'positive' ? '📈 Olumlu' :
                                                        item.sentiment === 'negative' ? '📉 Olumsuz' : '📊 Nötr'}
                                                </span>
                                                <span className="news-source">{item.source}</span>
                                                <span className="news-time">{new Date(item.publishedAt).toLocaleDateString('tr-TR')}</span>
                                            </div>
                                            <h3 className="news-title">{item.title}</h3>
                                            <p className="news-summary">{item.summary}</p>
                                            {item.aiAnalysis && (
                                                <div className="ai-analysis">
                                                    <strong>🤖 AI Yorumu:</strong> {item.aiAnalysis}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Events Tab */}
                    {activeTab === 'events' && (
                        <section className="events-section">
                            <h2>📅 Yaklaşan Etkinlikler</h2>
                            {events.length === 0 ? (
                                <p className="no-events">Yaklaşan etkinlik bulunamadı.</p>
                            ) : (
                                <div className="events-list">
                                    {events.map(event => (
                                        <div key={event.id} className={`event-card ${event.importance}`}>
                                            <div className="event-header">
                                                <span className={`event-type ${event.type}`}>
                                                    {event.type === 'earnings' ? '💰 Kazanç' :
                                                        event.type === 'dividend' ? '💵 Temettü' :
                                                            event.type === 'conference' ? '🎤 Konferans' : '📌 Diğer'}
                                                </span>
                                                <span className="event-date">
                                                    {new Date(event.date).toLocaleDateString('tr-TR', {
                                                        day: 'numeric', month: 'long', year: 'numeric'
                                                    })}
                                                </span>
                                                <button
                                                    className={`notify-btn ${event.notificationEnabled ? 'active' : ''}`}
                                                    onClick={() => toggleEventNotification(event)}
                                                    title={event.notificationEnabled ? 'Bildirimi kapat' : 'Bildirim al'}
                                                >
                                                    {event.notificationEnabled ? '🔔' : '🔕'}
                                                </button>
                                            </div>
                                            <h3 className="event-title">{event.title}</h3>
                                            <p className="event-description">{event.description}</p>
                                            <div className="event-countdown">
                                                ⏰ {Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} gün kaldı
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="events-info">
                                <p>🔔 Bildirim açık etkinlikler için 24 saat önce hatırlatma alacaksınız.</p>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
