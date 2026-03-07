import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    Image,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export const AuthScreen: React.FC = () => {
    const { theme, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignIn, setIsSignIn] = useState(true);

    async function handleAuth() {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignIn) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                Alert.alert('Check your email', 'We have sent you a confirmation link.');
            }
        } catch (error: any) {
            Alert.alert('Authentication Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <ImageBackground
            source={require('../assets/android-icon-background.png')}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <View style={[styles.logoContainer, { backgroundColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0.1, shadowRadius: 20 }]}>
                                <Image
                                    source={require('../assets/splash-icon.png')}
                                    style={{ width: 80, height: 80 }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={[styles.title, { color: '#FFFFFF' }]}>SpendTrack</Text>
                            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.6)' }]}>
                                Manage your money with ease
                            </Text>
                        </View>

                        <View style={[styles.form, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)', shadowColor: '#000', shadowOpacity: 0.2 }]}>
                            <Text style={[styles.formTitle, { color: isDark ? '#FFF' : '#1F2937' }]}>
                                {isSignIn ? 'Welcome Back' : 'Create Account'}
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: isDark ? '#CBD5E1' : '#374151' }]}>Email Address</Text>
                                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F9FAFB', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
                                    <Ionicons name="mail-outline" size={20} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: isDark ? '#FFF' : '#1F2937' }]}
                                        placeholder="name@example.com"
                                        placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: isDark ? '#CBD5E1' : '#374151' }]}>Password</Text>
                                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#F9FAFB', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#94A3B8' : '#6B7280'} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: isDark ? '#FFF' : '#1F2937' }]}
                                        placeholder="••••••••"
                                        placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.authButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                                onPress={handleAuth}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.authButtonText}>
                                        {isSignIn ? 'Sign In' : 'Sign Up'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.toggleContainer}>
                                <Text style={[styles.toggleText, { color: isDark ? '#94A3B8' : '#6B7280' }]}>
                                    {isSignIn ? "Don't have an account? " : "Already have an account? "}
                                </Text>
                                <TouchableOpacity onPress={() => setIsSignIn(!isSignIn)}>
                                    <Text style={[styles.toggleAction, { color: theme.primary }]}>
                                        {isSignIn ? 'Sign Up' : 'Sign In'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#1F2937',
    },
    authButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    authButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    toggleText: {
        fontSize: 14,
        color: '#6B7280',
    },
    toggleAction: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3B82F6',
    },
});
