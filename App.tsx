import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Platform, View, TouchableOpacity, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  HomeScreen,
  TransactionsScreen,
  AddTransactionScreen,
  BudgetsScreen,
  AnalyticsScreen,
  SettingsScreen,
  AuthScreen,
  CategorySettingsScreen,
  NotificationsScreen,
  NotificationDetailScreen,
} from './screens';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { BiometricProvider, useBiometric } from './context/BiometricContext';
import { DataProvider, useData } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const tabs = [
    { name: 'HomeTab', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
    { name: 'TransactionsTab', label: 'History', icon: 'receipt', iconOutline: 'receipt-outline' },
    { name: 'Add', label: '', icon: 'add', iconOutline: 'add', isCenter: true },
    { name: 'BudgetsTab', label: 'Budgets', icon: 'wallet', iconOutline: 'wallet-outline' },
    { name: 'AnalyticsTab', label: 'Analytics', icon: 'pie-chart', iconOutline: 'pie-chart-outline' },
  ];

  return (
    <View style={[
      styles.tabBar,
      {
        paddingBottom: insets.bottom + 8,
        height: 65 + insets.bottom,
        backgroundColor: theme.tabBar,
        borderTopColor: isDark ? '#374151' : '#F3F4F6'
      }
    ]}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;

        if (tab.isCenter) {
          return (
            <View key={tab.name} style={styles.centerButtonContainer}>
              <View style={[
                styles.centerButtonRim,
                {
                  backgroundColor: theme.tabBar,
                  borderColor: isDark ? '#374151' : '#F3F4F6'
                }
              ]}>
                <TouchableOpacity
                  style={[
                    styles.centerButton,
                    {
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary
                    }
                  ]}
                  onPress={() => navigation.navigate('AddTransaction')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFocused ? tab.icon as any : tab.iconOutline as any}
              size={24}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? theme.primary : theme.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HomeTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="TransactionsTab" component={TransactionsScreen} />
      <Tab.Screen name="Add" component={View} />
      <Tab.Screen name="BudgetsTab" component={BudgetsScreen} />
      <Tab.Screen name="AnalyticsTab" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  const [session, setSession] = React.useState<Session | null>(null);
  const { isDark, theme } = useTheme();
  const { isLocked, isInitialized } = useBiometric();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        input:focus, textarea:focus, select:focus {
          outline: none !important;
        }
        *:focus {
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const { isLoading, transactions } = useData();

  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  // Show a beautiful loading screen on first load when session is active but data hasn't arrived
  if (session && isLoading && transactions.length === 0) {
    return (
      <ImageBackground
        source={require('./assets/android-icon-background.png')}
        style={{ flex: 1, backgroundColor: '#080B14' }}
        resizeMode="cover"
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <Image
              source={require('./assets/splash-icon.png')}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5 }}>
            SpendTrack
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>
            Preparing your financial overview...
          </Text>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </ImageBackground>
    );
  }

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
    fonts: Platform.select({
      web: {
        regular: { fontFamily: 'sans-serif', fontWeight: 'normal' as const },
        medium: { fontFamily: 'sans-serif-medium', fontWeight: '500' as const },
        bold: { fontFamily: 'sans-serif', fontWeight: 'bold' as const },
        heavy: { fontFamily: 'sans-serif', fontWeight: '900' as const },
      },
      default: {
        regular: { fontFamily: 'System', fontWeight: '400' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: '700' as const },
        heavy: { fontFamily: 'System', fontWeight: '900' as const },
      }
    })
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background }
          }}
        >
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={HomeTabs} />
              <Stack.Screen
                name="AddTransaction"
                component={AddTransactionScreen}
                options={{
                  presentation: 'transparentModal',
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <Stack.Screen
                name="CategorySettings"
                component={CategorySettingsScreen}
                options={{
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="NotificationDetail"
                component={NotificationDetailScreen}
                options={{
                  animation: 'slide_from_right',
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider>
          <DataProvider>
            <BiometricProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </BiometricProvider>
          </DataProvider>
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#3B82F6',
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonRim: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -45,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    // Shadow for the 'bulge' effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
