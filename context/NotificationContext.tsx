import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { safeStorage } from '../lib/supabase';

const NOTIFICATIONS_KEY = '@spendtrack_notifications';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isAndroid = Platform.OS === 'android';

// In SDK 53+, expo-notifications causes hard crashes in Expo Go on Android.
// We must avoid importing it at the top level and ONLY load it if we aren't in that environment.
const shouldDisableNotifications = isAndroid && isExpoGo;

// Lazy load Notifications to prevent load-time crashes
let Notifications: any;
if (!shouldDisableNotifications) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.warn('Failed to load expo-notifications:', e);
    }
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    date: string;
    type?: 'budget' | 'system' | 'alert';
    read: boolean;
    data?: any;
}

interface NotificationContextType {
    requestPermissions: () => Promise<boolean>;
    scheduleBudgetAlert: (category: string, amount: number, limit: number) => Promise<void>;
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
    markAsRead: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const data = await safeStorage.getItem(NOTIFICATIONS_KEY);
            if (data) {
                setNotifications(JSON.parse(data));
            } else {
                setNotifications(current => {
                    // Check if one already exists to prevent duplicate execution in development Strict Mode
                    if (current.length > 0) return current;

                    const welcomeNotif: AppNotification = {
                        id: 'welcome-init-001',
                        title: 'Welcome to SpendTrack! 👋',
                        body: 'Track your expenses, set budgets, and achieve your financial goals.',
                        date: new Date().toISOString(),
                        type: 'system',
                        read: false
                    };

                    safeStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([welcomeNotif])).catch(console.error);
                    return [welcomeNotif];
                });
            }
        } catch (e) {
            console.error('Failed to load notifications', e);
        }
    };

    const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
        const newNotif: AppNotification = {
            ...notif,
            id: Math.random().toString(),
            date: new Date().toISOString(),
            read: false,
        };
        setNotifications(prev => {
            // Prevent exact duplicates firing back-to-back rapidly (within seconds)
            const isDuplicate = prev.some(n => n.title === newNotif.title && n.body === newNotif.body && new Date(newNotif.date).getTime() - new Date(n.date).getTime() < 5000);
            if (isDuplicate) return prev;

            const updated = [newNotif, ...prev];
            safeStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated)).catch(console.error);
            return updated;
        });
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
            safeStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated)).catch(console.error);
            return updated;
        });
    }, []);

    const clearAll = useCallback(async () => {
        setNotifications([]);
        await safeStorage.removeItem(NOTIFICATIONS_KEY);
    }, []);

    useEffect(() => {
        if (shouldDisableNotifications || !Notifications) {
            // Using info instead of warn to keep the console cleaner in Expo Go
            console.info('ℹ️ Notifications: Running in Expo Go on Android (SDK 53+). Native alerts are disabled to prevent crashes. Use a development build for full notifications.');
            return;
        }

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }, []);

    const requestPermissions = useCallback(async () => {
        if (shouldDisableNotifications || !Notifications) return false;

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return false;
            }

            if (isAndroid) {
                Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }
            return true;
        } catch (e) {
            console.warn('Error requesting notification permissions:', e);
            return false;
        }
    }, []);

    const scheduleBudgetAlert = useCallback(async (category: string, amount: number, limit: number) => {
        const percent = Math.round((amount / limit) * 100);
        const title = 'Budget Alert! ⚠️';
        const body = `You've spent ${percent}% of your budget for ${category}. Current spending: $${amount} / Limit: $${limit}`;

        // Add to in-app notifications
        addNotification({
            title,
            body,
            type: 'budget',
            data: { category, amount, limit, percent }
        });

        if (shouldDisableNotifications || !Notifications) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { category },
                },
                trigger: null, // show immediately
            });
        } catch (e) {
            console.warn('Error scheduling notification:', e);
        }
    }, [addNotification]);

    useEffect(() => {
        requestPermissions();
    }, [requestPermissions]);

    return (
        <NotificationContext.Provider value={{
            requestPermissions,
            scheduleBudgetAlert,
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            clearAll
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};
