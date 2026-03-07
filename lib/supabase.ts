import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Safe storage wrapper to prevent "Native module is null" errors
// We use a memory fallback if AsyncStorage is not available (e.g. on web or if native module is missing)
import * as SecureStore from 'expo-secure-store';

// Safe storage wrapper to prevent "Native module is null" errors
// We use a memory fallback if native storage is not available
const memoryStorage: Record<string, string> = {};

export const safeStorage = {
    getItem: async (key: string) => {
        try {
            // For web or desktop platforms, try localStorage first
            if (Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return window.localStorage.getItem(key);
                }
                return memoryStorage[key] || null;
            }

            // For native mobile, use Expo SecureStore which is more reliable in Expo environment
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            return memoryStorage[key] || null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            if (Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(key, value);
                } else {
                    memoryStorage[key] = value;
                }
            } else {
                await SecureStore.setItemAsync(key, value);
            }
        } catch (e) {
            memoryStorage[key] = value;
        }
    },
    removeItem: async (key: string) => {
        try {
            if (Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(key);
                } else {
                    delete memoryStorage[key];
                }
            } else {
                await SecureStore.deleteItemAsync(key);
            }
        } catch (e) {
            delete memoryStorage[key];
        }
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: safeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
