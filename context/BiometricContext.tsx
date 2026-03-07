import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { safeStorage } from '../lib/supabase';

const BIOMETRIC_ENABLED_KEY = '@spendtrack_biometric_enabled';

interface BiometricContextType {
    isBiometricEnabled: boolean;
    isBiometricAvailable: boolean;
    biometricType: string;
    isLocked: boolean;
    isInitialized: boolean;
    toggleBiometric: (enable: boolean) => Promise<boolean>;
    authenticate: () => Promise<boolean>;
    lock: () => void;
}

const BiometricContext = createContext<BiometricContextType | undefined>(undefined);

export const BiometricProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState('Biometric');
    const [isLocked, setIsLocked] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Check hardware support on mount
    useEffect(() => {
        checkBiometricAvailability();
        loadBiometricPreference();
    }, []);

    // Lock when app goes to background (if biometric is enabled)
    useEffect(() => {
        const handleAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'background' && isBiometricEnabled) {
                setIsLocked(true);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [isBiometricEnabled]);

    const checkBiometricAvailability = async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            setIsBiometricAvailable(hasHardware && isEnrolled);

            if (hasHardware) {
                const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                    setBiometricType('Face ID');
                } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                    setBiometricType('Fingerprint');
                } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                    setBiometricType('Iris');
                }
            }
        } catch (error) {
            console.error('Biometric check failed:', error);
            setIsBiometricAvailable(false);
        }
    };

    const loadBiometricPreference = async () => {
        try {
            const value = await safeStorage.getItem(BIOMETRIC_ENABLED_KEY);
            const enabled = value === 'true';
            setIsBiometricEnabled(enabled);
            // If enabled, lock on app start
            if (enabled) {
                setIsLocked(true);
            }
        } catch (error) {
            console.error('Failed to load biometric preference:', error);
        } finally {
            setIsInitialized(true);
        }
    };

    const toggleBiometric = useCallback(async (enable: boolean): Promise<boolean> => {
        if (enable) {
            // Verify biometric is available
            if (!isBiometricAvailable) {
                return false;
            }

            // Prompt authentication to enable
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Enable ${biometricType}`,
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
            });

            if (result.success) {
                await safeStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
                setIsBiometricEnabled(true);
                setIsLocked(false);
                return true;
            }
            return false;
        } else {
            await safeStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
            setIsBiometricEnabled(false);
            setIsLocked(false);
            return true;
        }
    }, [isBiometricAvailable, biometricType]);

    const authenticate = useCallback(async (): Promise<boolean> => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock SpendTrack',
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setIsLocked(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            return false;
        }
    }, []);

    const lock = useCallback(() => {
        if (isBiometricEnabled) {
            setIsLocked(true);
        }
    }, [isBiometricEnabled]);

    return (
        <BiometricContext.Provider
            value={{
                isBiometricEnabled,
                isBiometricAvailable,
                biometricType,
                isLocked,
                isInitialized,
                toggleBiometric,
                authenticate,
                lock,
            }}
        >
            {children}
        </BiometricContext.Provider>
    );
};

export const useBiometric = () => {
    const context = useContext(BiometricContext);
    if (!context) {
        throw new Error('useBiometric must be used within a BiometricProvider');
    }
    return context;
};
