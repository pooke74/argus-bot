// Company Profile Service
// Fetches company info, events, and upcoming announcements

export interface CompanyProfile {
    symbol: string;
    name: string;
    sector: string;
    industry: string;
    description: string;
    website: string;
    employees: number;
    headquarters: string;
    ceo: string;
    founded: string;
    marketCap: number;
    exchange: string;
}

export interface UpcomingEvent {
    id: string;
    type: 'earnings' | 'dividend' | 'split' | 'conference' | 'other';
    title: string;
    date: Date;
    description: string;
    importance: 'high' | 'medium' | 'low';
    notificationEnabled: boolean;
}

export interface EventNotification {
    eventId: string;
    symbol: string;
    eventType: string;
    date: Date;
    notifyBefore: number; // hours before
}

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

class CompanyProfileService {
    private static instance: CompanyProfileService;
    private cache = new Map<string, { data: unknown; timestamp: number }>();
    private CACHE_TTL = 3600000; // 1 hour for profile data
    private notifications: EventNotification[] = [];

    private constructor() {
        this.loadNotifications();
        this.startNotificationChecker();
    }

    public static getInstance(): CompanyProfileService {
        if (!CompanyProfileService.instance) {
            CompanyProfileService.instance = new CompanyProfileService();
        }
        return CompanyProfileService.instance;
    }

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data as T;
        }
        return null;
    }

    private setCache(key: string, data: unknown): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    async fetchCompanyProfile(symbol: string): Promise<CompanyProfile> {
        const cacheKey = `profile_${symbol}`;
        const cached = this.getCached<CompanyProfile>(cacheKey);
        if (cached) return cached;

        try {
            const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile,summaryProfile,price`;
            const response = await fetch(CORS_PROXY + encodeURIComponent(url));
            const data = await response.json();

            const result = data.quoteSummary?.result?.[0];
            if (!result) throw new Error('No data');

            const profile = result.assetProfile || result.summaryProfile || {};
            const price = result.price || {};

            const companyProfile: CompanyProfile = {
                symbol,
                name: price.shortName || price.longName || symbol,
                sector: profile.sector || 'Unknown',
                industry: profile.industry || 'Unknown',
                description: profile.longBusinessSummary || 'No description available.',
                website: profile.website || '',
                employees: profile.fullTimeEmployees || 0,
                headquarters: `${profile.city || ''}, ${profile.country || ''}`.trim(),
                ceo: profile.companyOfficers?.[0]?.name || 'Unknown',
                founded: profile.foundingDate || 'Unknown',
                marketCap: price.marketCap?.raw || 0,
                exchange: price.exchangeName || 'Unknown'
            };

            this.setCache(cacheKey, companyProfile);
            return companyProfile;
        } catch {
            return this.getMockProfile(symbol);
        }
    }

    async fetchUpcomingEvents(symbol: string): Promise<UpcomingEvent[]> {
        const cacheKey = `events_${symbol}`;
        const cached = this.getCached<UpcomingEvent[]>(cacheKey);
        if (cached) return cached;

        try {
            const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=calendarEvents,earningsHistory`;
            const response = await fetch(CORS_PROXY + encodeURIComponent(url));
            const data = await response.json();

            const result = data.quoteSummary?.result?.[0];
            const calendar = result?.calendarEvents || {};
            const events: UpcomingEvent[] = [];

            // Earnings date
            if (calendar.earnings?.earningsDate?.[0]) {
                const earningsDate = new Date(calendar.earnings.earningsDate[0].raw * 1000);
                events.push({
                    id: `${symbol}_earnings_${earningsDate.getTime()}`,
                    type: 'earnings',
                    title: `${symbol} Kazanç Raporu`,
                    date: earningsDate,
                    description: `Tahmini EPS: $${calendar.earnings.earningsEstimate?.raw?.toFixed(2) || 'N/A'}`,
                    importance: 'high',
                    notificationEnabled: this.isNotificationEnabled(`${symbol}_earnings_${earningsDate.getTime()}`)
                });
            }

            // Dividend date
            if (calendar.dividendDate?.raw) {
                const divDate = new Date(calendar.dividendDate.raw * 1000);
                events.push({
                    id: `${symbol}_dividend_${divDate.getTime()}`,
                    type: 'dividend',
                    title: `${symbol} Temettü Dağıtımı`,
                    date: divDate,
                    description: `Temettü tarihi`,
                    importance: 'medium',
                    notificationEnabled: this.isNotificationEnabled(`${symbol}_dividend_${divDate.getTime()}`)
                });
            }

            // Ex-dividend date
            if (calendar.exDividendDate?.raw) {
                const exDivDate = new Date(calendar.exDividendDate.raw * 1000);
                events.push({
                    id: `${symbol}_exdiv_${exDivDate.getTime()}`,
                    type: 'dividend',
                    title: `${symbol} Ex-Temettü Tarihi`,
                    date: exDivDate,
                    description: `Bu tarihten önce satın almanız gerekir`,
                    importance: 'medium',
                    notificationEnabled: this.isNotificationEnabled(`${symbol}_exdiv_${exDivDate.getTime()}`)
                });
            }

            // Sort by date
            events.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Filter future events only
            const now = new Date();
            const futureEvents = events.filter(e => e.date > now);

            this.setCache(cacheKey, futureEvents);
            return futureEvents.length > 0 ? futureEvents : this.getMockEvents(symbol);
        } catch {
            return this.getMockEvents(symbol);
        }
    }

    private getMockProfile(symbol: string): CompanyProfile {
        const mockData: Record<string, Partial<CompanyProfile>> = {
            'AAPL': { name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', ceo: 'Tim Cook' },
            'MSFT': { name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software', ceo: 'Satya Nadella' },
            'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services', ceo: 'Sundar Pichai' },
            'TSLA': { name: 'Tesla, Inc.', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', ceo: 'Elon Musk' },
            'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors', ceo: 'Jensen Huang' },
            'AMD': { name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors', ceo: 'Lisa Su' },
            'META': { name: 'Meta Platforms, Inc.', sector: 'Technology', industry: 'Social Media', ceo: 'Mark Zuckerberg' },
            'AMZN': { name: 'Amazon.com, Inc.', sector: 'Consumer Cyclical', industry: 'E-Commerce', ceo: 'Andy Jassy' }
        };

        const data = mockData[symbol] || {};

        return {
            symbol,
            name: data.name || symbol,
            sector: data.sector || 'Technology',
            industry: data.industry || 'Unknown',
            description: `${data.name || symbol} is a leading company in the ${data.industry || 'technology'} sector.`,
            website: `https://www.${symbol.toLowerCase()}.com`,
            employees: Math.floor(50000 + Math.random() * 100000),
            headquarters: 'United States',
            ceo: data.ceo || 'Unknown',
            founded: '1990',
            marketCap: Math.floor(100e9 + Math.random() * 2e12),
            exchange: 'NASDAQ'
        };
    }

    private getMockEvents(symbol: string): UpcomingEvent[] {
        const now = new Date();
        // Generate a pseudo-random number based on symbol to keep dates consistent for the same stock but different across stocks
        let hash = 0;
        for (let i = 0; i < symbol.length; i++) {
            hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
        }
        const safeHash = Math.abs(hash);

        // Randomize days (between 5 and 25 days for earnings, 20-50 for conference)
        const earningsDays = 5 + (safeHash % 20);
        const confDays = 20 + (safeHash % 30);

        return [
            {
                id: `${symbol}_earnings_mock`,
                type: 'earnings',
                title: `${symbol} Q4 Kazanç Raporu`,
                date: new Date(now.getTime() + earningsDays * 24 * 60 * 60 * 1000),
                description: 'Çeyreklik kazanç açıklaması bekleniyor',
                importance: 'high',
                notificationEnabled: false
            },
            {
                id: `${symbol}_conf_mock`,
                type: 'conference',
                title: `${symbol} Yatırımcı Günü`,
                date: new Date(now.getTime() + confDays * 24 * 60 * 60 * 1000),
                description: 'Yıllık yatırımcı konferansı',
                importance: 'medium',
                notificationEnabled: false
            },
            {
                id: `${symbol}_div_mock`,
                type: 'dividend',
                title: `${symbol} Temettü Ödemesi`,
                date: new Date(now.getTime() + (earningsDays + 15) * 24 * 60 * 60 * 1000),
                description: 'Hisse başına tahmini $0.45 ödeme',
                importance: 'medium',
                notificationEnabled: false
            }
        ];
    }

    // Notification Management
    private loadNotifications(): void {
        try {
            const saved = localStorage.getItem('argus_event_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved).map((n: EventNotification) => ({
                    ...n,
                    date: new Date(n.date)
                }));
            }
        } catch (e) {
            console.warn('Failed to load notifications:', e);
        }
    }

    private saveNotifications(): void {
        localStorage.setItem('argus_event_notifications', JSON.stringify(this.notifications));
    }

    isNotificationEnabled(eventId: string): boolean {
        return this.notifications.some(n => n.eventId === eventId);
    }

    enableNotification(event: UpcomingEvent, symbol: string, hoursBefore: number = 24): void {
        if (!this.isNotificationEnabled(event.id)) {
            this.notifications.push({
                eventId: event.id,
                symbol,
                eventType: event.type,
                date: event.date,
                notifyBefore: hoursBefore
            });
            this.saveNotifications();

            // Request permission
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
        }
    }

    disableNotification(eventId: string): void {
        this.notifications = this.notifications.filter(n => n.eventId !== eventId);
        this.saveNotifications();
    }

    toggleNotification(event: UpcomingEvent, symbol: string): boolean {
        if (this.isNotificationEnabled(event.id)) {
            this.disableNotification(event.id);
            return false;
        } else {
            this.enableNotification(event, symbol);
            return true;
        }
    }

    private startNotificationChecker(): void {
        // Check every minute
        setInterval(() => {
            this.checkAndSendNotifications();
        }, 60000);
    }

    private checkAndSendNotifications(): void {
        const now = new Date();

        this.notifications.forEach(notification => {
            const notifyTime = new Date(notification.date.getTime() - notification.notifyBefore * 60 * 60 * 1000);
            const timeDiff = notifyTime.getTime() - now.getTime();

            // Notify if within 1 minute of notification time
            if (timeDiff >= 0 && timeDiff < 60000) {
                this.sendNotification(notification);
            }
        });
    }

    private sendNotification(notification: EventNotification): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`📅 ${notification.symbol} - Yaklaşan Etkinlik`, {
                body: `${notification.eventType.toUpperCase()} ${notification.notifyBefore} saat sonra gerçekleşecek!`,
                icon: '/vite.svg',
                tag: notification.eventId
            });
        }
    }

    getActiveNotifications(): EventNotification[] {
        return this.notifications;
    }
}

export default CompanyProfileService.getInstance();
