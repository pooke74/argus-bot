// Simple Express Proxy Server for Yahoo Finance API
// Bypasses CORS restrictions by fetching data server-side

const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001; // Use env port for Cloud

// Enable CORS for all origins (or restrict in prod)
app.use(cors());

// Serve Static Frontend (Production)
app.use(express.static(path.join(__dirname, 'dist')));

// Helper function to fetch from Yahoo
function fetchYahoo(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
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

// Quote endpoint
app.get('/api/quote/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const data = await fetchYahoo(url);

        const result = data.chart?.result?.[0];
        if (!result?.meta?.regularMarketPrice) {
            return res.status(404).json({ error: 'No data found' });
        }

        const meta = result.meta;
        res.json({
            symbol,
            name: meta.shortName || symbol,
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose,
            change: meta.regularMarketPrice - meta.previousClose,
            changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
            volume: meta.regularMarketVolume,
            marketCap: meta.marketCap
        });
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Candles endpoint
app.get('/api/candles/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const range = req.query.range || '1y';
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`;
        const data = await fetchYahoo(url);

        const result = data.chart?.result?.[0];
        if (!result?.timestamp) {
            return res.status(404).json({ error: 'No data found' });
        }

        const timestamps = result.timestamp;
        const ohlc = result.indicators?.quote?.[0] || {};

        const candles = timestamps.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: ohlc.open?.[i] || 0,
            high: ohlc.high?.[i] || 0,
            low: ohlc.low?.[i] || 0,
            close: ohlc.close?.[i] || 0,
            volume: ohlc.volume?.[i] || 0
        })).filter(c => c.close > 0);

        res.json(candles);
    } catch (error) {
        console.error(`Error fetching candles for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Fundamentals endpoint
app.get('/api/fundamentals/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,financialData,summaryProfile,assetProfile,price`;
        const data = await fetchYahoo(url);

        const result = data.quoteSummary?.result?.[0];
        if (!result) {
            return res.status(404).json({ error: 'No data found' });
        }

        const stats = result.defaultKeyStatistics || {};
        const financial = result.financialData || {};
        const profile = result.summaryProfile || result.assetProfile || {};
        const price = result.price || {};

        res.json({
            peRatio: stats.forwardPE?.raw || stats.trailingPE?.raw,
            pbRatio: stats.priceToBook?.raw,
            roe: financial.returnOnEquity?.raw ? financial.returnOnEquity.raw * 100 : null,
            profitMargin: financial.profitMargins?.raw ? financial.profitMargins.raw * 100 : null,
            debtToEquity: financial.debtToEquity?.raw ? financial.debtToEquity.raw / 100 : null,
            currentRatio: financial.currentRatio?.raw,
            dividendYield: stats.yield?.raw ? stats.yield.raw * 100 : null,
            sector: profile.sector || 'Unknown',
            industry: profile.industry,
            description: profile.longBusinessSummary,
            website: profile.website,
            employees: profile.fullTimeEmployees,
            headquarters: `${profile.city || ''}, ${profile.country || ''}`.trim(),
            ceo: profile.companyOfficers?.[0]?.name,
            marketCap: price.marketCap?.raw,
            exchange: price.exchangeName
        });
    } catch (error) {
        console.error(`Error fetching fundamentals for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Consolidated Analysis endpoint (Quote + Candles + Fundamentals)
app.get('/api/analysis/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const candlesUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
        const fundUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,financialData,summaryProfile,assetProfile,price`;

        const [quoteData, candlesData, fundData] = await Promise.all([
            fetchYahoo(quoteUrl).catch(() => null),
            fetchYahoo(candlesUrl).catch(() => null),
            fetchYahoo(fundUrl).catch(() => null)
        ]);

        // Process Quote
        let quote = null;
        if (quoteData?.chart?.result?.[0]?.meta) {
            const meta = quoteData.chart.result[0].meta;
            quote = {
                symbol,
                name: meta.shortName || symbol,
                price: meta.regularMarketPrice,
                change: meta.regularMarketPrice - (meta.previousClose || meta.regularMarketPrice),
                changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.regularMarketPrice)) / (meta.previousClose || 1)) * 100,
                volume: meta.regularMarketVolume,
                marketCap: meta.marketCap
            };
        }

        // Process Candles
        let candles = [];
        if (candlesData?.chart?.result?.[0]?.timestamp) {
            const result = candlesData.chart.result[0];
            const timestamps = result.timestamp;
            const ohlc = result.indicators.quote[0];
            candles = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString().split('T')[0],
                open: ohlc.open[i] || 0,
                high: ohlc.high[i] || 0,
                low: ohlc.low[i] || 0,
                close: ohlc.close[i] || 0,
                volume: ohlc.volume[i] || 0
            })).filter(c => c.close > 0);
        }

        // Process Fundamentals
        let fundamentals = {};
        if (fundData?.quoteSummary?.result?.[0]) {
            const result = fundData.quoteSummary.result[0];
            const stats = result.defaultKeyStatistics || {};
            const financial = result.financialData || {};
            const profile = result.summaryProfile || result.assetProfile || {};

            fundamentals = {
                peRatio: stats.forwardPE?.raw || stats.trailingPE?.raw,
                pbRatio: stats.priceToBook?.raw,
                roe: financial.returnOnEquity?.raw ? financial.returnOnEquity.raw * 100 : null,
                profitMargin: financial.profitMargins?.raw ? financial.profitMargins.raw * 100 : null,
                debtToEquity: financial.debtToEquity?.raw ? financial.debtToEquity.raw / 100 : null,
                currentRatio: financial.currentRatio?.raw,
                dividendYield: stats.yield?.raw ? stats.yield.raw * 100 : null,
                sector: profile.sector || 'Unknown',
                industry: profile.industry,
                // Add profile data here to save another call
                profile: {
                    description: profile.longBusinessSummary,
                    website: profile.website,
                    employees: profile.fullTimeEmployees,
                    headquarters: `${profile.city || ''}, ${profile.country || ''}`.trim(),
                    ceo: profile.companyOfficers?.[0]?.name,
                }
            };
        }

        res.json({
            quote,
            candles,
            fundamentals
        });

    } catch (error) {
        console.error(`Error fetching analysis for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// News endpoint (Yahoo RSS)
app.get('/api/news/:symbol', async (req, res) => {
    const { symbol } = req.params;
    try {
        const https = require('https');
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`;

        const text = await new Promise((resolve, reject) => {
            https.get(url, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // Parse RSS (simple regex parsing)
        const items = [];
        const itemMatches = text.match(/<item>[\s\S]*?<\/item>/g) || [];

        itemMatches.slice(0, 10).forEach((item, index) => {
            const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                item.match(/<title>(.*?)<\/title>/)?.[1] || '';
            const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
            const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
            const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                item.match(/<description>(.*?)<\/description>/)?.[1] || '';

            items.push({
                id: `${symbol}_${index}`,
                title,
                link,
                pubDate,
                description: description.replace(/<[^>]*>/g, '').slice(0, 200)
            });
        });

        res.json(items);
    } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const CryptoBot = require('./CryptoBot.cjs');

// --- BOT API ENDPOINTS ---

app.post('/api/bot/start', (req, res) => {
    CryptoBot.start();
    res.json({ message: 'Bot started', status: CryptoBot.getStatus() });
});

app.post('/api/bot/stop', (req, res) => {
    CryptoBot.stop();
    res.json({ message: 'Bot stopped', status: CryptoBot.getStatus() });
});

app.get('/api/bot/status', (req, res) => {
    res.json(CryptoBot.getStatus());
});

app.post('/api/bot/reset', (req, res) => {
    CryptoBot.stop();
    CryptoBot.state = {
        isRunning: false,
        initialCapital: 1000,
        currentCash: 1000,
        positions: {},
        trades: [],
        totalValue: 1000,
        totalPnL: 0,
        winRate: 0,
        lastAnalysis: null,
        scanSummary: { totalScanned: 0, qualified: 0, verbalLog: "Sıfırlandı." }
    };
    CryptoBot.saveState();
    res.json({ message: 'Bot reset', status: CryptoBot.getStatus() });
});



// Handle React Routing (SPA) - Serve index.html for all other routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║     ARGUS PROXY SERVER                           ║
║     Running on http://localhost:${PORT}             ║
║     Ready to fetch real market data!             ║
╚══════════════════════════════════════════════════╝
  `);
});
