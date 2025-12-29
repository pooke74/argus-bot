
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotificationPage.css';

// EVENT BUS ARCHITECTURE (FINAL)
// Zero-dependency implementation for maximum stability.

export interface ArgusNotification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    timestamp: number;
    read: boolean;
    link?: string;
}

export default function NotificationPage() {
    const [notifications, setNotifications] = useState<ArgusNotification[]>([]);

    useEffect(() => {
        // 1. Load Persistence
        const saved = localStorage.getItem('argus_notifications');
        if (saved) {
            try {
                setNotifications(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse notifications", e);
            }
        } else {
            // Default Welcome
            const welcome: ArgusNotification = {
                id: 'init-1',
                title: 'Sisteme Hoşgeldiniz',
                message: 'Bildirim Merkezi aktif. Tüm analiz ve işlem bildirimleri burada toplanır.',
                type: 'INFO',
                timestamp: Date.now(),
                read: false
            };
            setNotifications([welcome]);
            localStorage.setItem('argus_notifications', JSON.stringify([welcome]));
        }

        // 2. Event Listener
        const handleNotification = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                const newNotif: ArgusNotification = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 6),
                    timestamp: Date.now(),
                    read: false,
                    title: customEvent.detail.title || 'Bildirim',
                    message: customEvent.detail.message || '',
                    type: customEvent.detail.type || 'INFO',
                    link: customEvent.detail.link
                };

                setNotifications(prev => {
                    const updated = [newNotif, ...prev].slice(0, 50);
                    localStorage.setItem('argus_notifications', JSON.stringify(updated));
                    return updated;
                });
            }
        };

        window.addEventListener('argus:notification', handleNotification);
        return () => window.removeEventListener('argus:notification', handleNotification);
    }, []);

    const markAsRead = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            localStorage.setItem('argus_notifications', JSON.stringify(updated));
            return updated;
        });
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem('argus_notifications');
    };

    // Test Helper
    const sendTest = () => {
        window.dispatchEvent(new CustomEvent('argus:notification', {
            detail: { title: 'Sistem Testi', message: 'Argus Core sistemi sorunsuz çalışıyor.', type: 'SUCCESS' }
        }));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return '✅';
            case 'WARNING': return '⚠️';
            case 'ERROR': return '🚨';
            default: return '📢';
        }
    };

    return (
        <div className="notification-page">
            <header className="notif-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" className="back-btn">← Geri</Link>
                    <h1>Bildirim Merkezi</h1>
                </div>
                <div>
                    {/* Hidden Test Button for User */}
                    <button onClick={sendTest} style={{ opacity: 0.3, background: 'none', border: 'none', cursor: 'pointer', color: '#444', marginRight: '10px' }}>Test</button>
                    <button className="clear-btn" onClick={clearAll}>Tümünü Temizle</button>
                </div>
            </header>

            <div className="notif-list">
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔕</span>
                        <h3>Bildiriminiz yok</h3>
                        <p>Şu an için yeni bir sistem uyarısı bulunmuyor.</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className={`notif-item ${notif.type.toLowerCase()} ${notif.read ? 'read' : 'unread'}`}
                            onClick={(e) => markAsRead(notif.id, e)}>
                            <div className="notif-icon">
                                {getTypeIcon(notif.type)}
                            </div>
                            <div className="notif-content">
                                <div className="notif-top">
                                    <span className="notif-title">{notif.title}</span>
                                    <span className="notif-time">
                                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="notif-message">{notif.message}</p>
                                {notif.link && (
                                    <Link to={notif.link} className="notif-link" onClick={(e) => e.stopPropagation()}>
                                        İlgili Sayfaya Git →
                                    </Link>
                                )}
                            </div>
                            {!notif.read && <div className="unread-dot"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
