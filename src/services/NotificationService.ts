
export interface ArgusNotification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    timestamp: Date;
    read: boolean;
    link?: string;
}

class NotificationService {
    private static instance: NotificationService;
    private notifications: ArgusNotification[] = [];
    private listeners: ((notifications: ArgusNotification[]) => void)[] = [];

    private constructor() {
        // Add welcome notification
        this.addNotification({
            title: 'Sisteme Hoşgeldiniz',
            message: 'Argus AI sistemi aktif. Analizlerinizi buradan takip edebilirsiniz.',
            type: 'INFO'
        });
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    getNotifications(): ArgusNotification[] {
        return [...this.notifications];
    }

    getUnreadCount(): number {
        return this.notifications.filter(n => !n.read).length;
    }

    addNotification(input: { title: string; message: string; type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'; link?: string }) {
        const notification: ArgusNotification = {
            id: Date.now().toString(),
            timestamp: new Date(),
            read: false,
            ...input
        };
        this.notifications.unshift(notification);
        this.notifyListeners();
        return notification;
    }

    markAsRead(id: string) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.notifyListeners();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.notifyListeners();
    }

    subscribe(listener: (notifications: ArgusNotification[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l([...this.notifications]));
    }
}

export default NotificationService.getInstance();
