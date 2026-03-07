import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    AppState,
    AppStateStatus,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useBiometric } from '../context/BiometricContext';

const { width, height } = Dimensions.get('window');

export const LockScreen: React.FC = () => {
    const { theme, isDark } = useTheme();
    const { authenticate, biometricType } = useBiometric();
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 40,
                friction: 8,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse the icon
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();

        // Auto-prompt on mount
        const timer = setTimeout(() => {
            authenticate();
        }, 500);

        // Auto-prompt when returning to foreground
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                // Slight delay to ensure the OS is ready to render the prompt
                setTimeout(() => {
                    authenticate();
                }, 300);
            }
        });

        return () => {
            clearTimeout(timer);
            pulse.stop();
            subscription.remove();
        };
    }, []);

    const getIcon = (): keyof typeof Ionicons.glyphMap => {
        if (biometricType === 'Face ID') return 'scan-outline';
        if (biometricType === 'Fingerprint') return 'finger-print-outline';
        return 'lock-closed-outline';
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* App Logo Area */}
                <View style={styles.logoSection}>
                    <View style={[styles.logoCircle, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                        <Text style={[styles.logoText, { color: theme.primary }]}>S</Text>
                    </View>
                    <Text style={[styles.appName, { color: theme.text }]}>SpendTrack</Text>
                </View>

                {/* Lock Icon */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={[styles.lockButton, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: theme.border }]}
                        onPress={authenticate}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={getIcon()} size={48} color={theme.primary} />
                    </TouchableOpacity>
                </Animated.View>

                {/* Text */}
                <Text style={[styles.title, { color: theme.text }]}>App Locked</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Tap to unlock with {biometricType}
                </Text>

                {/* Unlock Button */}
                <TouchableOpacity
                    style={[styles.unlockButton, { backgroundColor: theme.primary }]}
                    onPress={authenticate}
                    activeOpacity={0.8}
                >
                    <Ionicons name={getIcon()} size={20} color="#FFFFFF" />
                    <Text style={styles.unlockText}>Unlock with {biometricType}</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '800',
    },
    appName: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 1,
    },
    lockButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 40,
        textAlign: 'center',
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    unlockText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
