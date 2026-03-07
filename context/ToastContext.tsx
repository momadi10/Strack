import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Platform, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const TOAST_COLORS = {
    success: '#22C55E',
    error: '#EF4444',
    info: '#3B82F6',
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<Toast | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now().toString();
        setToast({ id, message, type });

        // Reset animations
        progressAnim.setValue(0);
        slideAnim.setValue(-100);
        scaleAnim.setValue(0.9);
        fadeAnim.setValue(0);

        // Animate in
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: insets.top + (Platform.OS === 'ios' ? 10 : 20),
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }),
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: false,
            })
        ]).start();

        // Auto hide after 3 seconds
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setToast(prev => (prev?.id === id ? null : prev));
            });
        }, 3000);
    }, [fadeAnim, slideAnim, scaleAnim, progressAnim, insets.top]);

    const accentColor = toast ? TOAST_COLORS[toast.type] : TOAST_COLORS.success;
    const styles = getStyles(theme, isDark, insets);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Modal
                transparent
                visible={!!toast}
                animationType="none"
                pointerEvents="none"
                onRequestClose={() => { }}
            >
                <View style={styles.toastWrapper} pointerEvents="none">
                    <Animated.View
                        style={[
                            styles.centeredContainer,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim }
                                ],
                            }
                        ]}
                    >
                        {/* Container */}
                        {toast && (
                            <View style={styles.toastContainer}>
                                <View style={[styles.iconCircle, { backgroundColor: accentColor }]}>
                                    <Ionicons
                                        name={toast.type === 'error' ? 'alert' : toast.type === 'info' ? 'information' : 'checkmark'}
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.toastText} numberOfLines={2}>
                                        {toast.message}
                                    </Text>
                                </View>

                                {/* Progress indicator */}
                                <View style={styles.progressBarBackground}>
                                    <Animated.View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                                backgroundColor: accentColor,
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const getStyles = (theme: any, isDark: boolean, insets: any) => StyleSheet.create({
    toastWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999, // Ensure it's above modals
        alignItems: 'center',
    },
    centeredContainer: {
        width: 'auto',
        maxWidth: Dimensions.get('window').width - 40,
    },
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.3 : 0.12,
        shadowRadius: 16,
        elevation: 12,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flexShrink: 1,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
        color: isDark ? '#F9FAFB' : '#1F2937',
    },
    progressBarBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: isDark ? '#374151' : '#F3F4F6',
    },
    progressBar: {
        height: '100%',
    },
});
