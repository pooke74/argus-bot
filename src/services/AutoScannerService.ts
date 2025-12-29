// Auto Scanner Service
// Autonomous market monitoring that runs in background

import AuthService from './AuthService';
import AITradingAgent from './AITradingAgent';
import type { TradingSignal } from './AITradingAgent';

export interface ScanResult {
    timestamp: Date;
    signals: TradingSignal[];
    executedTrades: number;
}

class AutoScannerService {
    private static instance: AutoScannerService;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isRunning: boolean = false;
    private lastScan: ScanResult | null = null;
    private scanHistory: ScanResult[] = [];
    private onScanCallbacks: ((result: ScanResult) => void)[] = [];

    private constructor() {
        // Auto-start if user has it enabled
        this.checkAndStart();
    }

    public static getInstance(): AutoScannerService {
        if (!AutoScannerService.instance) {
            AutoScannerService.instance = new AutoScannerService();
        }
        return AutoScannerService.instance;
    }

    private checkAndStart(): void {
        const settings = AuthService.getSettings();
        if (settings.autoScanEnabled) {
            this.start();
        }
    }

    start(): void {
        if (this.isRunning) return;

        const settings = AuthService.getSettings();
        const intervalMs = settings.autoScanInterval * 60 * 1000; // Convert to ms

        console.log(`🤖 Auto-Scanner started. Interval: ${settings.autoScanInterval} minutes`);

        // Run immediately
        this.runScan();

        // Then set interval
        this.intervalId = setInterval(() => {
            this.runScan();
        }, intervalMs);

        this.isRunning = true;
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Auto-Scanner stopped');
    }

    restart(): void {
        this.stop();
        this.start();
    }

    isActive(): boolean {
        return this.isRunning;
    }

    async runScan(): Promise<ScanResult> {
        const settings = AuthService.getSettings();
        const watchlist = settings.watchlist;

        console.log(`🔍 Scanning ${watchlist.length} stocks...`);

        try {
            // Enable auto-trading for the scan
            AITradingAgent.setAutoTrading(true);

            const signals = await AITradingAgent.scanWatchlist(watchlist);
            const executedTrades = signals.filter(s => s.executed).length;

            const result: ScanResult = {
                timestamp: new Date(),
                signals,
                executedTrades
            };

            this.lastScan = result;
            this.scanHistory.unshift(result);

            // Keep only last 100 scans
            if (this.scanHistory.length > 100) {
                this.scanHistory = this.scanHistory.slice(0, 100);
            }

            // Notify listeners
            this.onScanCallbacks.forEach(cb => cb(result));

            // Show notification for trades
            if (executedTrades > 0 && settings.notificationsEnabled) {
                this.showNotification(`Argus executed ${executedTrades} trade(s)!`);
            }

            console.log(`✅ Scan complete. Trades executed: ${executedTrades}`);
            return result;
        } catch (error) {
            console.error('Scan failed:', error);
            throw error;
        }
    }

    getLastScan(): ScanResult | null {
        return this.lastScan;
    }

    getScanHistory(): ScanResult[] {
        return this.scanHistory;
    }

    onScan(callback: (result: ScanResult) => void): () => void {
        this.onScanCallbacks.push(callback);
        return () => {
            this.onScanCallbacks = this.onScanCallbacks.filter(cb => cb !== callback);
        };
    }

    private showNotification(message: string): void {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Argus Trading', { body: message, icon: '/vite.svg' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Argus Trading', { body: message, icon: '/vite.svg' });
                }
            });
        }
    }

    // Request notification permission
    requestNotificationPermission(): void {
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }
}

export default AutoScannerService.getInstance();
