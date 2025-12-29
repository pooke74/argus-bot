// User Authentication Service
// Simple localStorage-based auth (no backend needed)

export interface User {
    id: string;
    username: string;
    email: string;
    createdAt: Date;
    settings: UserSettings;
}

export interface UserSettings {
    autoScanEnabled: boolean;
    autoScanInterval: number; // minutes
    notificationsEnabled: boolean;
    watchlist: string[];
}

const DEFAULT_SETTINGS: UserSettings = {
    autoScanEnabled: true,
    autoScanInterval: 5, // 5 minutes
    notificationsEnabled: true,
    watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMD', 'META', 'AMZN']
};

class AuthService {
    private static instance: AuthService;
    private currentUser: User | null = null;

    private constructor() {
        this.loadUser();
        this.ensureDemoAccount();
    }

    private ensureDemoAccount(): void {
        const users = this.getAllUsers();
        const demoExists = users.some(u => u.email === 'demo@argus.com');

        if (!demoExists) {
            // Create demo user
            const demoUser: User = {
                id: 'demo_user_001',
                username: 'demo',
                email: 'demo@argus.com',
                createdAt: new Date(),
                settings: { ...DEFAULT_SETTINGS }
            };

            // Store password (demo123)
            const passwordStore = JSON.parse(localStorage.getItem('argus_passwords') || '{}');
            passwordStore[demoUser.id] = btoa('demo123');
            localStorage.setItem('argus_passwords', JSON.stringify(passwordStore));

            // Add to users list
            users.push(demoUser);
            localStorage.setItem('argus_users', JSON.stringify(users));

            console.log('✅ Demo account created: demo@argus.com / demo123');
        }
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    private loadUser(): void {
        try {
            const saved = localStorage.getItem('argus_user');
            if (saved) {
                const user = JSON.parse(saved);
                this.currentUser = {
                    ...user,
                    createdAt: new Date(user.createdAt)
                };
            }
        } catch (e) {
            console.warn('Failed to load user:', e);
        }
    }

    private saveUser(): void {
        if (this.currentUser) {
            localStorage.setItem('argus_user', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('argus_user');
        }
    }

    register(username: string, email: string, password: string): { success: boolean; error?: string } {
        // Check if user exists
        const existingUsers = this.getAllUsers();
        if (existingUsers.some(u => u.email === email)) {
            return { success: false, error: 'Email already registered' };
        }
        if (existingUsers.some(u => u.username === username)) {
            return { success: false, error: 'Username already taken' };
        }

        // Create new user
        const user: User = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            username,
            email,
            createdAt: new Date(),
            settings: { ...DEFAULT_SETTINGS }
        };

        // Store password hash (simple base64 for demo - use proper hashing in production!)
        const passwordStore = JSON.parse(localStorage.getItem('argus_passwords') || '{}');
        passwordStore[user.id] = btoa(password);
        localStorage.setItem('argus_passwords', JSON.stringify(passwordStore));

        // Store user in users list
        existingUsers.push(user);
        localStorage.setItem('argus_users', JSON.stringify(existingUsers));

        // Auto login
        this.currentUser = user;
        this.saveUser();

        return { success: true };
    }

    login(email: string, password: string): { success: boolean; error?: string } {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const passwordStore = JSON.parse(localStorage.getItem('argus_passwords') || '{}');
        const storedPassword = passwordStore[user.id];

        if (!storedPassword || atob(storedPassword) !== password) {
            return { success: false, error: 'Invalid password' };
        }

        this.currentUser = user;
        this.saveUser();

        return { success: true };
    }

    logout(): void {
        this.currentUser = null;
        this.saveUser();
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    isLoggedIn(): boolean {
        return this.currentUser !== null;
    }

    updateSettings(settings: Partial<UserSettings>): void {
        if (this.currentUser) {
            this.currentUser.settings = { ...this.currentUser.settings, ...settings };
            this.saveUser();

            // Also update in users list
            const users = this.getAllUsers();
            const idx = users.findIndex(u => u.id === this.currentUser!.id);
            if (idx >= 0) {
                users[idx] = this.currentUser;
                localStorage.setItem('argus_users', JSON.stringify(users));
            }
        }
    }

    getSettings(): UserSettings {
        return this.currentUser?.settings || DEFAULT_SETTINGS;
    }

    private getAllUsers(): User[] {
        try {
            const saved = localStorage.getItem('argus_users');
            if (saved) {
                return JSON.parse(saved).map((u: User) => ({
                    ...u,
                    createdAt: new Date(u.createdAt)
                }));
            }
        } catch (e) {
            console.warn('Failed to load users:', e);
        }
        return [];
    }
}

export default AuthService.getInstance();
