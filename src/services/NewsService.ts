
// News Service - Functional Approach
// Removed Singleton pattern to avoid initialization issues

export interface NewsItem {
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

// Keywords for sentiment analysis
const POSITIVE_KEYWORDS = [
    'surge', 'jump', 'rally', 'gain', 'rise', 'soar', 'record', 'beat', 'exceed',
    'growth', 'profit', 'bullish', 'upgrade', 'buy', 'outperform', 'strong',
    'success', 'innovation', 'breakthrough', 'expansion', 'partnership'
];

const NEGATIVE_KEYWORDS = [
    'drop', 'fall', 'crash', 'plunge', 'decline', 'loss', 'miss', 'cut', 'layoff',
    'bearish', 'downgrade', 'sell', 'underperform', 'weak', 'warning', 'concern',
    'lawsuit', 'investigation', 'scandal', 'recall', 'bankruptcy', 'debt'
];

const CLEAN_HTML_REGEX = /<[^>]*>/g;

// Internal cache
const cache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

export const NewsService = {
    async fetchNewsForSymbol(symbol: string): Promise<NewsItem[]> {
        const cacheKey = `news_${symbol}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }

        try {
            console.log(`Fetching news for ${symbol}...`);
            // Attempt to fetch real news
            const news = await fetchYahooNews(symbol);

            // Check if we actually got items
            if (news.length > 0) {
                cache.set(cacheKey, { data: news, timestamp: Date.now() });
                return news;
            } else {
                console.warn('Real news returned 0 items, using mock.');
                return generateMockNews(symbol);
            }
        } catch (error) {
            console.warn(`Failed to fetch news for ${symbol}, falling back to mock:`, error);
            return generateMockNews(symbol);
        }
    },

    async getNewsBasedSentiment(symbol: string): Promise<{ score: number; summary: string; newsCount: number }> {
        const news = await this.fetchNewsForSymbol(symbol);

        if (news.length === 0) {
            return { score: 0, summary: 'Haber bulunamadı', newsCount: 0 };
        }

        const totalScore = news.reduce((sum, n) => sum + (n.sentimentScore || 0), 0);
        const avgScore = totalScore / news.length;

        let summary: string;
        if (avgScore > 0.3) {
            summary = `🟢 Haberler çoğunlukla olumlu (${news.filter(n => n.sentiment === 'positive').length}/${news.length})`;
        } else if (avgScore < -0.3) {
            summary = `🔴 Haberler çoğunlukla olumsuz (${news.filter(n => n.sentiment === 'negative').length}/${news.length})`;
        } else {
            summary = `🟡 Haberler karışık veya nötr`;
        }

        return { score: avgScore, summary, newsCount: news.length };
    }
};

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
    // Using a different proxy specifically for JSON/XML or direct if possible (CORS usually blocks direct)
    // trying a standard proxy list or fallback to logic
    const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/'
    ];

    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`;

    // Fast fail: just try one, if it fails, mock.
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(proxies[0] + encodeURIComponent(rssUrl), {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Network response was not ok');

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const news: NewsItem[] = [];
        items.forEach((item, index) => {
            if (index >= 10) return;

            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';

            const analysis = analyzeSentiment(title + ' ' + description);

            news.push({
                id: `${symbol}_${index}_${Date.now()}`,
                title,
                summary: description.replace(CLEAN_HTML_REGEX, '').trim().slice(0, 200),
                source: 'Yahoo Finance',
                url: link,
                publishedAt: new Date(pubDate),
                relatedSymbols: [symbol],
                sentiment: analysis.sentiment,
                sentimentScore: analysis.score,
                aiAnalysis: analysis.analysis
            });
        });

        return news;
    } catch (e) {
        console.warn('Proxy fetch failed:', e);
        throw e;
    }
}

function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; analysis: string } {
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    const foundPositive: string[] = [];
    const foundNegative: string[] = [];

    POSITIVE_KEYWORDS.forEach(keyword => {
        if (lowerText.includes(keyword)) {
            positiveCount++;
            foundPositive.push(keyword);
        }
    });

    NEGATIVE_KEYWORDS.forEach(keyword => {
        if (lowerText.includes(keyword)) {
            negativeCount++;
            foundNegative.push(keyword);
        }
    });

    const score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let analysis = `📊 Nötr haber: Belirgin bir yön sinyali yok.`;

    if (score > 0.2) {
        sentiment = 'positive';
        analysis = `📈 Olumlu: "${foundPositive.slice(0, 3).join(', ')}" tespiti.`;
    } else if (score < -0.2) {
        sentiment = 'negative';
        analysis = `📉 Olumsuz: "${foundNegative.slice(0, 3).join(', ')}" tespiti.`;
    }

    return { sentiment, score, analysis };
}

function generateMockNews(symbol: string): NewsItem[] {
    const hash = symbol.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const safeHash = Math.abs(hash);

    const templates = [
        { t: 'Reports Strong Q4 Results', s: 'Exceeded analyst expectations with robust revenue growth.', sent: 'positive', score: 0.8 },
        { t: 'Facing Supply Chain Headwinds', s: 'Warns of potential delays due to global shortages.', sent: 'negative', score: -0.6 },
        { t: 'Announces Strategic Partnership', s: 'Partners with key industry player to expand market reach.', sent: 'positive', score: 0.7 },
        { t: 'New Product Line Unveiled', s: 'Innovative features aim to capture market share.', sent: 'positive', score: 0.9 },
        { t: 'Analyst Downgrade', s: 'Rating cut citing valuation concerns.', sent: 'negative', score: -0.4 }
    ];

    const selectedNews = [];
    for (let i = 0; i < 5; i++) {
        const index = (safeHash + i) % templates.length;
        const item = templates[index];
        const hoursAgo = 1 + (i * 5);

        selectedNews.push({
            id: `${symbol}_mock_${i}_${Date.now()}`,
            title: `${symbol} ${item.t}`,
            summary: item.s,
            source: 'Argus AI News (Simulation)',
            url: '#',
            publishedAt: new Date(Date.now() - hoursAgo * 3600000),
            relatedSymbols: [symbol],
            sentiment: item.sent as any,
            sentimentScore: item.score,
            aiAnalysis: `🤖 AI Analizi: ${item.sent === 'positive' ? 'Pozitif algı.' : 'Negatif risk.'}`
        });
    }
    return selectedNews;
}

export default NewsService;
