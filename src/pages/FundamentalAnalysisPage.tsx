
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { NewsService } from '../services/NewsService';
import { SocialSentimentService } from '../services/SocialSentimentService';

// STAGE 5: NO INTERFACE IMPORTS
// We suspect importing 'NewsItem' (which is a type) caused a runtime SyntaxError
// because the build tool didn't strip it out correctly or there was a resolution mismatch.

// defining local types to avoid import issues
interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: Date;
    relatedSymbols: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
    sentimentScore?: number;
    aiAnalysis?: string;
}

interface SocialPost {
    id: string;
    author: string;
    handle: string;
    avatar: string;
    content: string;
    timestamp: Date;
    likes: number;
    retweets: number;
    platform: 'twitter' | 'reddit' | 'telegram';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export default function FundamentalAnalysisPage() {
    const [symbol, setSymbol] = useState('NVDA');
    const [searchTerm, setSearchTerm] = useState('NVDA');
    const [news, setNews] = useState<NewsItem[]>([]);
    const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
    const [marketSentiment, setMarketSentiment] = useState<{ score: number, summary: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Loading Fundamental Data for:', symbol);

            // Parallel fetch
            const [newsData, sentimentData] = await Promise.all([
                NewsService.fetchNewsForSymbol(symbol),
                NewsService.getNewsBasedSentiment(symbol)
            ]);

            setNews(newsData as NewsItem[]);
            setMarketSentiment(sentimentData);

            // Social posts
            const posts = SocialSentimentService.getSentimentStream(symbol);
            setSocialPosts(posts as SocialPost[]);

        } catch (err: any) {
            console.error('FA Page Error:', err);
            setError(err.message || 'Veri yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setSymbol(searchTerm.toUpperCase());
        }
    };

    useEffect(() => {
        loadData();
    }, [symbol]);

    const getSentimentColor = (score: number) => {
        if (score > 0.2) return '#22c55e';
        if (score < -0.2) return '#ef4444';
        return '#f59e0b';
    };

    return (
        <div className="fundamental-page">
            <header className="fa-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="back-btn">← Geri</Link>
                    <h1>Temel Analiz & Sentiment</h1>
                </div>

                <form onSubmit={handleSearch} className="symbol-selector" style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="symbol-input"
                        placeholder="Sembol..."
                    />
                    <button type="submit" className="tf-btn active">Analiz Et</button>
                    <button type="button" onClick={() => loadData()} className="tf-btn">Yenile</button>
                </form>
            </header>

            {error && (
                <div style={{ padding: '20px', background: '#331111', color: '#ffaaaa', margin: '20px', borderRadius: '8px' }}>
                    Hata: {error}
                </div>
            )}

            <div className="fa-layout">
                {/* 1. News Panel */}
                <div className="panel-card">
                    <div className="panel-title">
                        <span>📰</span> Haber Akışı
                    </div>
                    <div className="feed-container">
                        {loading && news.length === 0 ? <p>Yükleniyor...</p> : news.length === 0 ? <p>Haber bulunamadı.</p> : news.map(item => (
                            <div key={item.id} className={`news-item-fa ${item.sentiment || 'neutral'}`}>
                                <div className="news-meta">
                                    <span>{item.source}</span>
                                    <span>{new Date(item.publishedAt).toLocaleTimeString()}</span>
                                </div>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-title">
                                    {item.title}
                                </a>
                                <div className="news-ai">
                                    {item.aiAnalysis}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Sentiment Metrics */}
                <div className="panel-card">
                    <div className="panel-title">
                        <span>🧠</span> Piyasa Psikolojisi
                    </div>

                    {marketSentiment ? (
                        <div className="sentiment-meter">
                            <div
                                className="meter-circle"
                                style={{
                                    borderColor: getSentimentColor(marketSentiment.score),
                                    color: getSentimentColor(marketSentiment.score)
                                }}
                            >
                                {marketSentiment.score > 0 ? '+' : ''}{marketSentiment.score.toFixed(2)}
                            </div>
                            <div className="meter-label">
                                {marketSentiment.summary}
                            </div>
                            <p style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
                                Yapay zeka, {news.length} haberi ve sosyal medya akışını analiz etti.
                            </p>
                        </div>
                    ) : (
                        <p>Analiz verisi yok.</p>
                    )}
                </div>

                {/* 3. Social Media Stream */}
                <div className="panel-card">
                    <div className="panel-title">
                        <span>🐦</span> Sosyal Medya Nabzı
                    </div>
                    <div className="feed-container">
                        {socialPosts.map(post => (
                            <div key={post.id} className="social-post">
                                <div className="post-header">
                                    <span className="post-avatar">{post.avatar}</span>
                                    <div>
                                        <div className="post-author">{post.author}</div>
                                        <div className="post-handle">{post.handle}</div>
                                    </div>
                                    <span className="post-platform">{post.platform}</span>
                                </div>
                                <div className="post-content">
                                    {post.content}
                                </div>
                                <div className="post-footer">
                                    <span>❤️ {post.likes}</span>
                                    <span>🔁 {post.retweets}</span>
                                    <span style={{
                                        color: post.sentiment === 'positive' ? '#22c55e' :
                                            post.sentiment === 'negative' ? '#ef4444' : '#888',
                                        marginLeft: 'auto'
                                    }}>
                                        {post.sentiment.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
