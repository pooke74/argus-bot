
export interface SocialPost {
    id: string;
    author: string;
    handle: string;
    avatar: string; // Emoji
    content: string;
    timestamp: Date;
    likes: number;
    retweets: number;
    platform: 'twitter' | 'reddit' | 'telegram';
    sentiment: 'positive' | 'negative' | 'neutral';
}

export const SocialSentimentService = {
    getSentimentStream(symbol: string): SocialPost[] {
        // Generate mock social media feed
        const posts: SocialPost[] = [];
        const count = 5 + Math.floor(Math.random() * 5); // 5-10 posts

        const authors = [
            { name: 'Crypto King', handle: '@cryptoking', avatar: '👑' },
            { name: 'Wall St Wolf', handle: '@wolfofwallst', avatar: '🐺' },
            { name: 'Stock Master', handle: '@stockmaster', avatar: '📈' },
            { name: 'Diamond Hands', handle: '@diamondhands', avatar: '💎' },
            { name: 'Bear Trap', handle: '@beartrap', avatar: '🐻' },
            { name: 'Tech Insider', handle: '@techinsider', avatar: '💻' }
        ];

        const templates = {
            positive: [
                `${symbol} is looking unstoppable today! 🚀 #bullish`,
                `Just bought more $${symbol}. The chart looks prime. 💰`,
                `Huge news for ${symbol}! This change everything.`,
                `$${symbol} to the moon! 🌕`,
                `Don't sleep on ${symbol}, breakout imminent. ⚡`
            ],
            negative: [
                `Selling my $${symbol} position. Too risky right now. 📉`,
                `${symbol} looks weak compared to competitors. 😬`,
                `Shorting $${symbol}, support broken.`,
                `Bad earnings expected for ${symbol}. #bearish`,
                `Stay away from ${symbol} for now. 🛑`
            ],
            neutral: [
                `Watching $${symbol} closely at this level. 👀`,
                `Anyone else trading ${symbol} today?`,
                `Mixed signals on $${symbol} chart.`,
                `${symbol} volume is interesting...`,
                `Waiting for confirmation on ${symbol}.`
            ]
        };

        for (let i = 0; i < count; i++) {
            const author = authors[Math.floor(Math.random() * authors.length)];
            const sentiment = Math.random() > 0.5 ? 'positive' : (Math.random() > 0.5 ? 'negative' : 'neutral');
            const templateList = templates[sentiment];
            const content = templateList[Math.floor(Math.random() * templateList.length)];

            posts.push({
                id: `post_${i}_${Date.now()}`,
                author: author.name,
                handle: author.handle,
                avatar: author.avatar,
                content: content,
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)), // Last 24h
                likes: Math.floor(Math.random() * 500) + 10,
                retweets: Math.floor(Math.random() * 100),
                platform: Math.random() > 0.7 ? 'reddit' : 'twitter',
                sentiment: sentiment as any
            });
        }

        return posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
};
