
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import YahooFinanceProvider from '../services/YahooFinanceProvider';
import type { Quote } from '../services/YahooFinanceProvider';
import AuthService from '../services/AuthService';
import AutoScannerService from '../services/AutoScannerService';
import { WeatherService } from '../services/WeatherService';
import type { WeatherData } from '../services/WeatherService';
import './MonitorPage.css';

// Undefined categories
const CATEGORIES = {
    'My Watchlist': [],
    'Teknoloji & AI': ['NVDA', 'MSFT', 'GOOGL', 'AMD', 'TSM', 'PLTR', 'AAPL', 'META'],
    'Sağlık': ['JNJ', 'PFE', 'UNH', 'LLY'],
    'Sanayi & Çelik': ['X', 'NUE', 'BA', 'CAT'],
    'Enerji': ['XOM', 'CVX', 'CL=F', 'NG=F'],
    'Finans': ['JPM', 'BAC', 'V', 'AMZN'],
    '🥇 Emtia & Madenler': ['GC=F', 'SI=F', 'PL=F', 'PA=F', 'HG=F', 'CL=F', 'BZ=F', 'NG=F'],
    '₿ Kripto': ['BTC-USD', 'ETH-USD'],
    '📈 Endeksler': ['^GSPC', '^DJI', '^IXIC']
};

export default function MonitorPage() {
    const [activeCategory, setActiveCategory] = useState('My Watchlist');
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [autoScanActive, setAutoScanActive] = useState(AutoScannerService.isActive());
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const navigate = useNavigate();
    const user = AuthService.getCurrentUser();
    const settings = AuthService.getSettings();

    // Fetch Weather for Antalya
    useEffect(() => {
        async function loadWeather() {
            // Antalya Coordinates
            const data = await WeatherService.getWeather(36.8841, 30.7056);
            if (data) setWeather(data);
        }
        loadWeather();
        // Update every 30 mins
        const interval = setInterval(loadWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);

        let symbols: string[] = [];

        if (activeCategory === 'My Watchlist') {
            symbols = settings.watchlist;
        } else {
            // @ts-ignore
            symbols = CATEGORIES[activeCategory] || [];
        }

        const results: Quote[] = [];
        const promises = symbols.map(symbol =>
            YahooFinanceProvider.fetchQuote(symbol).catch(() => null)
        );

        const data = await Promise.all(promises);
        data.forEach(q => {
            if (q) results.push(q);
        });

        setQuotes(results);
        setLastUpdate(new Date().toLocaleTimeString());
        setLoading(false);
    }, [activeCategory, settings.watchlist]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        const unsubscribe = AutoScannerService.onScan(() => {
            setAutoScanActive(AutoScannerService.isActive());
        });
        return unsubscribe;
    }, []);

    const handleLogout = () => {
        AutoScannerService.stop();
        AuthService.logout();
        navigate('/auth');
    };

    const toggleAutoScan = () => {
        if (AutoScannerService.isActive()) {
            AutoScannerService.stop();
            AuthService.updateSettings({ autoScanEnabled: false });
        } else {
            AutoScannerService.start();
            AuthService.updateSettings({ autoScanEnabled: true });
        }
        setAutoScanActive(AutoScannerService.isActive());
    };

    return (
        <div className="monitor-page">
            <header className="header">
                <div className="header-top">
                    {weather && (
                        <div className="weather-widget">
                            <div className="weather-icon">
                                {WeatherService.getWeatherIcon(weather.weathercode, weather.is_day)}
                            </div>
                            <div className="weather-info">
                                <span className="city-name">📍 Antalya</span>
                                <span className="temperature">{weather.temperature}°C</span>
                                <span className="weather-desc">
                                    {WeatherService.getWeatherDescription(weather.weathercode)}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="user-info">
                        <span className="welcome">Welcome, <strong>{user?.username || 'Trader'}</strong></span>
                        <button onClick={handleLogout} className="logout-btn">Logout</button>
                    </div>
                </div>

                <h1>Argus Monitor</h1>
                <p>AI-Powered Stock Analysis</p>

                <div className="header-links">
                    <button onClick={fetchData} className="refresh-btn">
                        🔄 Yenile
                    </button>
                    <Link to="/trading" className="trading-link">🤖 AI Trading</Link>
                    <Link to="/ai-traders" className="trading-link">🏆 AI Arena</Link>
                    <Link to="/crypto-ai" className="trading-link">₿ Kripto AI</Link>
                    <Link to="/technical-analysis" className="trading-link">📊 Teknik Analiz</Link>
                    <Link to="/fundamental-analysis" className="trading-link">📰 Haber & Sentiment</Link>
                    <button
                        onClick={toggleAutoScan}
                        className={`auto-scan-btn ${autoScanActive ? 'active' : ''}`}
                    >
                        {autoScanActive ? '🟢 Auto-Scan: ON' : '⚪ Auto-Scan: OFF'}
                    </button>
                </div>

                {lastUpdate && <div className="last-update-container">
                    <span className="last-update">Last update: {lastUpdate}</span>
                    <span className="market-status-note">*Pazar günleri borsa kapalıdır (Hisse verileri sabit kalır)</span>
                </div>}

                <div className="categories">
                    {Object.keys(CATEGORIES).map(cat => (
                        <button
                            key={cat}
                            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </header>

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading {activeCategory} data...</p>
                </div>
            ) : (
                <div className="watchlist">
                    {quotes.map(q => (
                        <Link to={`/stock/${q.symbol}`} key={q.symbol} className="stock-card">
                            <div className="stock-header">
                                <span className="symbol">{q.symbol}</span>
                                {q.name && <span className="name">{q.name}</span>}
                            </div>
                            <div className="stock-price">
                                <span className="price">${q.price.toFixed(2)}</span>
                                <span className={`change ${q.change >= 0 ? 'positive' : 'negative'}`}>
                                    {q.change >= 0 ? '▲' : '▼'} {Math.abs(q.change).toFixed(2)} ({Math.abs(q.changePercent).toFixed(2)}%)
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
