import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications, AppNotification } from '../context/NotificationContext';

export const NotificationsScreen = ({ navigation }: any) => {
    const { theme, isDark } = useTheme();
    const { notifications, markAsRead, clearAll } = useNotifications();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 500);
    }, []);

    const handlePress = (notification: AppNotification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        navigation.navigate('NotificationDetail', { notification });
    };

    const getIcon = (type?: string) => {
        switch (type) {
            case 'budget': return 'wallet';
            case 'alert': return 'warning';
            case 'system': return 'information-circle';
            default: return 'notifications';
        }
    };

    const getIconColor = (type?: string) => {
        switch (type) {
            case 'budget': return '#F59E0B'; // Amber
            case 'alert': return '#EF4444'; // Red
            case 'system': return '#3B82F6'; // Blue
            default: return theme.primary;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
                <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                    <Text style={[styles.clearText, { color: theme.primary }]}>Clear All</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 24 }}
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.text }]}>No notifications</Text>
                        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>You're all caught up!</Text>
                    </View>
                ) : (
                    notifications.map((notif) => (
                        <TouchableOpacity
                            key={notif.id}
                            style={[
                                styles.notificationCard,
                                { backgroundColor: theme.card, borderColor: theme.border },
                                !notif.read && { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }
                            ]}
                            onPress={() => handlePress(notif)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: getIconColor(notif.type) + '20' }]}>
                                <Ionicons name={getIcon(notif.type)} size={24} color={getIconColor(notif.type)} />
                            </View>
                            <View style={styles.textContainer}>
                                <View style={styles.row}>
                                    <Text style={[styles.notifTitle, { color: theme.text }]} numberOfLines={1}>{notif.title}</Text>
                                    {!notif.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                                </View>
                                <Text style={[styles.notifBody, { color: theme.textSecondary }]} numberOfLines={2}>{notif.body}</Text>
                                <Text style={[styles.notifDate, { color: theme.textSecondary }]}>{new Date(notif.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    clearButton: {
        padding: 8,
        marginRight: -8,
    },
    clearText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
    },
    notifBody: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    notifDate: {
        fontSize: 12,
    },
});
