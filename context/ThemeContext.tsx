import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { safeStorage } from '../lib/supabase';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColor = 'blue' | 'green' | 'red';

interface ThemeColors {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    success: string;
    error: string;
    warning: string;
    surface: string;
    input: string;
    tabBar: string;
}

const getLightColors = (primary: string): ThemeColors => ({
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#F3F4F6',
    primary,
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    surface: '#EFF6FF',
    input: '#F9FAFB',
    tabBar: '#FFFFFF',
});

const getDarkColors = (primary: string): ThemeColors => ({
    background: '#09090B',
    card: '#18181B',
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    border: '#27272A',
    primary,
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    surface: '#27272A',
    input: '#18181B',
    tabBar: '#09090B',
});

interface ThemeContextType {
    isDark: boolean;
    theme: ThemeColors;
    themeMode: ThemeMode;
    themeColor: ThemeColor;
    setThemeMode: (mode: ThemeMode) => void;
    setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
    const [themeColor, setThemeColorState] = useState<ThemeColor>('blue');
    const [isLoading, setIsLoading] = useState(true);
    const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName | null | undefined>(Appearance.getColorScheme());

    useEffect(() => {
        loadSettings();

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setSystemColorScheme(colorScheme);
        });
        return () => subscription.remove();
    }, []);

    const loadSettings = async () => {
        try {
            const savedMode = await safeStorage.getItem('themeMode');
            const savedColor = await safeStorage.getItem('themeColor');

            if (savedMode) setThemeModeState(savedMode as ThemeMode);
            if (savedColor) setThemeColorState(savedColor as ThemeColor);

            // Backwards compatibility
            if (!savedMode) {
                const legacyIsDark = await safeStorage.getItem('isDark');
                if (legacyIsDark !== null) {
                    setThemeModeState(JSON.parse(legacyIsDark) ? 'dark' : 'light');
                }
            }
        } catch (error) {
            console.warn('Error loading theme:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setThemeMode = async (mode: ThemeMode) => {
        setThemeModeState(mode);
        try {
            await safeStorage.setItem('themeMode', mode);
            // Backwards compatibility
            if (mode !== 'system') {
                await safeStorage.setItem('isDark', JSON.stringify(mode === 'dark'));
            }
        } catch (error) {
            console.warn('Error saving theme mode:', error);
        }
    };

    const setThemeColor = async (color: ThemeColor) => {
        setThemeColorState(color);
        try {
            await safeStorage.setItem('themeColor', color);
        } catch (error) {
            console.warn('Error saving theme color:', error);
        }
    };

    const getPrimaryColorCode = (color: ThemeColor) => {
        switch (color) {
            case 'green': return '#22C55E';
            case 'red': return '#EF4444';
            case 'blue':
            default: return '#3B82F6'; // Match the "+" icon's current color
        }
    };

    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
    const primaryColorCode = getPrimaryColorCode(themeColor);
    const theme = isDark ? getDarkColors(primaryColorCode) : getLightColors(primaryColorCode);

    if (isLoading) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ isDark, theme, themeMode, themeColor, setThemeMode, setThemeColor }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
