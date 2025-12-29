
import { useState, useEffect, Component } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './TechnicalAnalysisPage.css';

// --- Error Boundary (Page Level) ---
class PageErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean, error: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: '' };
    }
    static getDerivedStateFromError(error: any) { return { hasError: true, error: error.toString() }; }
    componentDidCatch(error: any, info: any) { console.error("Page Crash:", error, info); }
    render() {
        if (this.state.hasError) return (
            <div style={{ color: '#fff', padding: '50px', background: '#300', textAlign: 'center' }}>
                <h2>Sistem Hatası</h2>
                <p>Beklenmeyen bir hata oluştu.</p>
                <div style={{ background: '#000', padding: '10px', marginTop: '20px', textAlign: 'left', overflow: 'auto' }}>
                    <code>{this.state.error}</code>
                </div>
                <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px' }}>Sayfayı Yenile</button>
            </div>
        );
        return this.props.children;
    }
}

// --- Types ---
interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    supportLine?: number;
    resistanceLine?: number;
}
interface Quote { reference?: any; symbol: string; price: number; change: number; changePercent: number; }
interface TechnicalPattern {
    name: string;
    description: string;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    reliability: 'HIGH' | 'MEDIUM' | 'LOW';
    timestamp: number;
}

// --- ADVANCED ARGUS AI LOGIC 2.0 ---
// Uses Volume, Volatility (Bollinger), and RSI for detailed predictive commentary
const analyzeCandles = (candles: Candle[]) => {
    // 1. Safety Check
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const currentPrice = closes[closes.length - 1];

    // 2. Indicators Calculation
    // SMA
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;

    // RSI (14)
    let gains = 0, losses = 0;
    for (let i = candles.length - 14; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff; else losses -= diff;
    }
    const rsi = 100 - (100 / (1 + (gains / 14) / (losses / 14 || 1)));

    // Bollinger Bands (20, 2)
    const squaredDiffs = closes.slice(-20).map(c => Math.pow(c - sma20, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / 20;
    const stdDev = Math.sqrt(variance);
    const bandwidth = ((4 * stdDev) / sma20) * 100; // Volatility %

    // Volume Trend (Last 5 days vs Avg 20)
    const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastVol = volumes[volumes.length - 1];
    const volumeSignal = lastVol > avgVol20 * 1.5 ? 'HIGH_VOLUME' : lastVol < avgVol20 * 0.5 ? 'LOW_VOLUME' : 'NORMAL';

    // 3. Pattern Detection
    const trend = sma20 > sma50 ? 'UP' : 'DOWN';
    const patterns: TechnicalPattern[] = [];

    // Golden Cross / Death Cross
    if (closes.length > 51) {
        const prevSma20 = closes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
        const prevSma50 = closes.slice(-51, -1).reduce((a, b) => a + b, 0) / 50;

        if (prevSma20 <= prevSma50 && sma20 > sma50)
            patterns.push({ name: 'Golden Cross', description: 'SMA20 > SMA50: Güçlü boğa sinyali.', signal: 'BULLISH', reliability: 'HIGH', timestamp: Date.now() });
        else if (prevSma20 >= prevSma50 && sma20 < sma50)
            patterns.push({ name: 'Death Cross', description: 'SMA20 < SMA50: Ayı piyasası sinyali.', signal: 'BEARISH', reliability: 'HIGH', timestamp: Date.now() });
    }

    // RSI Divergence / Extremes
    if (rsi > 70) patterns.push({ name: 'RSI Aşırı Alım', description: `RSI (${rsi.toFixed(0)}) > 70. Düzeltme riski yüksek.`, signal: 'BEARISH', reliability: 'MEDIUM', timestamp: Date.now() });
    else if (rsi < 30) patterns.push({ name: 'RSI Aşırı Satım', description: `RSI (${rsi.toFixed(0)}) < 30. Tepki alımı muhtemel.`, signal: 'BULLISH', reliability: 'MEDIUM', timestamp: Date.now() });

    // Bollinger Squeeze
    if (bandwidth < 5) patterns.push({ name: 'Bollinger Squeeze', description: 'Volatilite çok düşük. Sert hareket hazırlığı.', signal: 'NEUTRAL', reliability: 'MEDIUM', timestamp: Date.now() });

    // Support/Resistance (Dynamic)
    const high50 = Math.max(...closes.slice(-50));
    const low50 = Math.min(...closes.slice(-50));

    // 4. GENERATE AI SUMMARY (Narrative)
    let summary = "";

    // Trend Context
    summary += `Enstrüman şu anda ${trend === 'UP' ? 'YÜKSELİŞ (BULLISH)' : 'DÜŞÜŞ (BEARISH)'} trendinde işlem görüyor (SMA20 ${trend === 'UP' ? '>' : '<'} SMA50). `;
    summary += `Fiyat (${currentPrice.toFixed(2)}), 20 günlük ortalamanın ${currentPrice > sma20 ? 'üzerinde' : 'altında'} kalarak ${currentPrice > sma20 ? 'pozitif' : 'negatif'} momentumun devam ettiğini gösteriyor. `;

    // Volatility & Momentum
    if (bandwidth < 5) summary += "⚠️ Piyasa şu an çok sıkışmış durumda (Bollinger Squeeze), yakında sert bir kırılım beklenebilir. ";
    else if (bandwidth > 20) summary += "Volatilite oldukça yüksek, ani fiyat hareketlerine karşı dikkatli olunmalı. ";

    // Volume Confirmation
    if (volumeSignal === 'HIGH_VOLUME') summary += `${trend === 'UP' ? 'Yükseliş' : 'Düşüş'} hareketi ortalamanın üzerinde hacimle destekleniyor, bu da trendin güçlü ve kalıcı olabileceğini işaret ediyor. `;
    else if (volumeSignal === 'LOW_VOLUME') summary += "Ancak işlem hacmi zayıf seyrediyor, bu da mevcut hareketin 'güçsüz' olabileceği anlamına gelir. ";

    // Prediction / Outlook
    const distToRes = ((high50 - currentPrice) / currentPrice) * 100;
    const distToSup = ((currentPrice - low50) / currentPrice) * 100;

    summary += `\n\n🎯 AI ÖNGÖRÜSÜ: `;
    if (rsi < 30 && trend === 'UP') summary += "Trend yukarı olmasına rağmen aşırı satım bölgesindeyiz. Bu, mükemmel bir 'Dipten Alım' (Buy the Dip) fırsatı olabilir. ";
    else if (rsi > 70 && trend === 'UP') summary += "Güçlü yükselişe rağmen aşırı alım bölgesindeyiz. Kısa vadeli bir 'Kar Realizasyonu' (Pullback) yaşanabilir. ";
    else if (distToRes < 2) summary += `Fiyat kritik direnç seviyesi olan $${high50.toFixed(2)} bandını test ediyor. Bu seviyenin üzerinde mum kapanışı gelirse yeni bir ralli başlayabilir. `;
    else if (distToSup < 2) summary += `Fiyat kritik destek noktası $${low50.toFixed(2)} seviyesine tutunmaya çalışıyor. Bu seviyenin kırılması satışları derinleştirebilir. `;
    else summary += `Fiyat şu an konsolidasyon bölgesinde. Net bir yön tayini için $${high50.toFixed(2)} üstü kapanış veya $${low50.toFixed(2)} altı sarkma beklenmeli.`;

    return { patterns, summary, trend, support: low50, resistance: high50 };
};

// --- Mock Data ---
function generateMockCandles(count: number = 101): Candle[] {
    const candles: Candle[] = [];
    const now = new Date();
    let price = 150;
    for (let i = count; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const change = (Math.random() - 0.48) * 3;
        const close = price + change;
        candles.push({
            date: date.toISOString().split('T')[0],
            open: price, high: Math.max(price, close) + 1, low: Math.min(price, close) - 1, close: close, volume: 1000000
        });
        price = close;
    }
    return candles;
}

// --- API Helper ---
const API_BASE = 'http://localhost:3001/api';
async function fetchLocalCandles(symbol: string, range: string): Promise<Candle[]> {
    try {
        const response = await fetch(`${API_BASE}/candles/${symbol}?range=${range}`);
        if (response.ok) return await response.json();
    } catch (e) { }
    // Return adequate mock data if fetch fails
    return generateMockCandles(range === '1mo' ? 30 : range === '3mo' ? 90 : 250);
}
async function fetchLocalQuote(symbol: string): Promise<Quote | null> {
    try {
        const response = await fetch(`${API_BASE}/quote/${symbol}`);
        if (response.ok) return await response.json();
    } catch (e) { }
    return null;
}

function TechnicalAnalysisContent() {
    const { symbol: paramSymbol } = useParams<{ symbol?: string }>();
    const [symbol, setSymbol] = useState(paramSymbol || 'BTC-USD');
    const [searchTerm, setSearchTerm] = useState(symbol);
    const [candles, setCandles] = useState<Candle[]>([]);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [analysis, setAnalysis] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('1Y');

    useEffect(() => {
        loadData();
    }, [symbol, timeframe]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Correct Logic for Timeframe
            let range = '1y';
            if (timeframe === '1M') range = '1mo';
            else if (timeframe === '3M') range = '3mo';

            const [q, c] = await Promise.all([
                fetchLocalQuote(symbol),
                fetchLocalCandles(symbol, range)
            ]);
            setQuote(q);

            if (c && Array.isArray(c) && c.length > 0) {
                const sorted = [...c].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const result = analyzeCandles(sorted);
                setAnalysis(result);

                if (result) {
                    const enriched = sorted.map(item => ({
                        ...item,
                        supportLine: result.support || 0,
                        resistanceLine: result.resistance || 0
                    }));
                    setCandles(enriched);
                } else {
                    setCandles(sorted);
                }
            } else {
                setCandles([]);
                setAnalysis(null);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSymbol(searchTerm.toUpperCase());
    };

    return (
        <div className="technical-analysis-page">
            <header className="ta-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="back-btn">← Geri</Link>
                    <h1>Teknik Analiz Merkezi</h1>
                </div>

                <form onSubmit={handleSearch} className="symbol-selector">
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="symbol-input" placeholder="Sembol search" />
                    <button type="submit" className="tf-btn active">Analiz Et</button>
                    <button type="button" onClick={loadData} className="tf-btn" style={{ background: 'transparent', border: '1px solid #444' }}>Yenile</button>
                </form>

                <div className="timeframe-selector">
                    {['1M', '3M', '1Y'].map(tf => (
                        <button key={tf} className={`tf-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                    ))}
                </div>
            </header>

            <div className="ta-layout">
                <div className="chart-container">
                    {loading ? (
                        <div className="loading" style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <>
                            <div className="chart-header" style={{ marginBottom: '1rem' }}>
                                <h2 style={{ margin: 0 }}>{symbol}</h2>
                                {quote && <span style={{ color: (quote.change || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                                    ${(quote.price || 0).toFixed(2)}
                                </span>}
                            </div>

                            <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                                <LineChart data={candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={(d) => d && d.length > 5 ? d.slice(5) : d} />
                                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 10 }} width={40} />
                                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333' }} />

                                    <Line type="monotone" dataKey="close" stroke="#7c3aed" strokeWidth={2} dot={false} isAnimationActive={false} name="Fiyat" />
                                    {analysis && <Line type="step" dataKey="supportLine" stroke="#22c55e" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} name="Destek" />}
                                    {analysis && <Line type="step" dataKey="resistanceLine" stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} name="Direnç" />}
                                </LineChart>
                            </ResponsiveContainer>
                        </>
                    )}
                </div>

                <div className="analysis-panel">
                    <h3>🤖 Argus AI Vision</h3>
                    {analysis ? (
                        <>
                            <div className="ai-comment-box" style={{ background: '#1a1a2e', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #7c3aed', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Piyasa Analizi & Öngörü</h4>
                                <p className="ai-text" style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#e2e8f0' }}>{analysis.summary}</p>
                            </div>
                            <div className="pattern-list">
                                {analysis.patterns.map((pattern: any, idx: number) => (
                                    <div key={idx} className={`pattern-item ${pattern.signal}`}>
                                        <span className="pattern-name">{pattern.name}</span>
                                        <span className="pattern-desc" style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>{pattern.description}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="levels-grid" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                                <div className="level-item"><span style={{ color: '#ef4444' }}>DİRENÇ</span> ${(analysis.resistance || 0).toFixed(2)}</div>
                                <div className="level-item"><span style={{ color: '#22c55e' }}>DESTEK</span> ${(analysis.support || 0).toFixed(2)}</div>
                            </div>
                        </>
                    ) : <p>Analiz verisi bekleniyor...</p>}
                </div>
            </div>
        </div>
    );
}

// Wrap in Error Boundary
export default function TechnicalAnalysisPage() {
    return (
        <PageErrorBoundary>
            <TechnicalAnalysisContent />
        </PageErrorBoundary>
    );
}
