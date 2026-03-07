import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AppNotification } from '../context/NotificationContext';

export const NotificationDetailScreen = ({ route, navigation }: any) => {
    const { theme, isDark } = useTheme();
    const { notification }: { notification: AppNotification } = route.params;

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
            case 'budget': return '#F59E0B';
            case 'alert': return '#EF4444';
            case 'system': return '#3B82F6';
            default: return theme.primary;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Detail</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.type) + '20' }]}>
                    <Ionicons name={getIcon(notification.type)} size={48} color={getIconColor(notification.type)} />
                </View>
                <Text style={[styles.notifTitle, { color: theme.text }]}>{notification.title}</Text>
                <Text style={[styles.notifDate, { color: theme.textSecondary }]}>
                    {new Date(notification.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                </Text>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Text style={[styles.notifBody, { color: theme.text }]}>{notification.body}</Text>

                {notification.data && Object.keys(notification.data).length > 0 && (
                    <View style={[styles.dataContainer, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
                        <Text style={[styles.dataTitle, { color: theme.text }]}>Additional Information:</Text>
                        {Object.entries(notification.data).map(([key, value]) => (
                            <Text key={key} style={[styles.dataText, { color: theme.textSecondary }]}>
                                • {key}: {String(value)}
                            </Text>
                        ))}
                    </View>
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
    content: {
        flex: 1,
        padding: 24,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        alignSelf: 'center',
    },
    notifTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    notifDate: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 24,
    },
    notifBody: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    dataContainer: {
        padding: 16,
        borderRadius: 12,
    },
    dataTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    dataText: {
        fontSize: 14,
        marginBottom: 4,
    },
});
