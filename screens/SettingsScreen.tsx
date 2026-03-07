import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { getTransactions, getCategories } from '../lib/supabase-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { WebView } from 'react-native-webview';
import { BlurView } from 'expo-blur';

interface SettingsScreenProps {
  navigation: any;
}

import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useBiometric } from '../context/BiometricContext';
import { useData } from '../context/DataContext';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark, theme, themeMode, themeColor, setThemeMode, setThemeColor } = useTheme();
  const { showToast } = useToast();
  const { isBiometricEnabled, isBiometricAvailable, biometricType, toggleBiometric } = useBiometric();
  const { transactions: allTransactions, categories: allCategories } = useData();

  const [notifications, setNotifications] = useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [user, setUser] = useState<User | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  const styles = getStyles(theme, insets, isDark);

  useEffect(() => {
    loadSettings();
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSettings = async () => {
    setNotifications(true);
    setSelectedCurrency('USD');
  };

  const saveSettings = async (key: string, value: any) => {
    console.log(`Setting ${key} changed to ${value}`);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions and budgets. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Success', 'Local cache has been cleared.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          },
        },
      ]
    );
  };

  const generateReportHtml = (transactions: any[], categories: any[]) => {
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let totalIncome = 0;
    let totalExpenses = 0;

    const tableRows = sortedTransactions.map(t => {
      const date = new Date(t.date);
      const formattedDate = date.toLocaleDateString('en-GB') + ' - ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const category = categories.find(c => (c.id === t.category || c.name === t.category)) || { name: t.category };
      const isIncome = t.type === 'income';

      if (isIncome) totalIncome += t.amount;
      else totalExpenses += t.amount;

      return `
        <tr>
          <td>${formattedDate}</td>
          <td>${category.name}</td>
          <td>${isIncome ? 'Income' : 'Expenses'}</td>
          <td>$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${t.description || ''}</td>
        </tr>
      `;
    }).join('');

    const totalNet = totalIncome - totalExpenses;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 24px; }
            h2 { text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 18px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background-color: #555; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary-container { display: flex; width: 100%; margin-top: 20px; border: 1px solid #333; }
            .summary-box { flex: 1; border-right: 1px solid #333; padding: 10px; text-align: center; background-color: #f0f0f0; }
            .summary-box:last-child { border-right: none; }
            .summary-label { font-size: 11px; color: #666; margin-bottom: 4px; display: block; text-transform: uppercase; }
            .summary-amount { font-size: 14px; font-weight: bold; color: #000; }
          </style>
        </head>
        <body>
          <h1>SpendTrack Statement</h1>
          <h2>${monthYear}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="summary-container">
            <div class="summary-box">
              <span class="summary-label">Total Income</span>
              <span class="summary-amount">$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-box">
              <span class="summary-label">Total Expenses</span>
              <span class="summary-amount">$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-box">
              <span class="summary-label">Total Net</span>
              <span class="summary-amount">$${totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const performDataPreview = async () => {
    try {
      // Use context data instead of manual fetch for offline support
      const html = generateReportHtml(allTransactions, allCategories);
      setPreviewHtml(html);
      setShowPreview(true);
      setShowExportModal(false);
    } catch (error) {
      console.error('Preview error:', error);
      showToast('Failed to generate preview', 'error');
    }
  };

  const handleExportData = () => {
    setShowExportModal(true);
  };

  const saveToDownloads = async (fileUri: string, fileName: string, mimeType: string, content?: string) => {
    try {
      if (Platform.OS === 'android') {
        // Use StorageAccessFramework to save to a user-chosen folder (e.g., Downloads)
        const { StorageAccessFramework } = FileSystem;
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          showToast('Permission denied. File saved to cache instead.', 'error');
          return false;
        }

        const directoryUri = permissions.directoryUri;
        const baseName = fileName.replace(/\.[^.]+$/, ''); // strip extension
        const newFileUri = await StorageAccessFramework.createFileAsync(
          directoryUri,
          baseName,
          mimeType
        );

        if (content) {
          // For CSV — write the string content directly
          await FileSystem.writeAsStringAsync(newFileUri, content, {
            encoding: FileSystem.EncodingType.UTF8,
          });
        } else {
          // For PDF — read the cached file as base64 and write it
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(newFileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        return true;
      }

      // iOS and others: fall back to share sheet (lets user save to Files)
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: 'Save to your device',
      });
      return true;
    } catch (error) {
      console.error('Save to downloads error:', error);
      return false;
    }
  };

  const performDataExport = async (mode: 'share' | 'download') => {
    try {
      // Use context data for seamless offline/online support
      const transactions = allTransactions;
      const categories = allCategories;
      const timestamp = new Date().toISOString().split('T')[0];

      if (exportFormat === 'csv') {
        let content = "Date,Description,Category,Type,Amount\n";
        transactions.forEach(t => {
          const desc = (t.description || '').replace(/,/g, ' ');
          content += `${new Date(t.date).toLocaleDateString()},${desc},${t.category},${t.type},${t.amount}\n`;
        });
        const fileName = `SpendTrack_Statement_${timestamp}.csv`;

        if (Platform.OS === 'web') {
          const blob = new Blob([content], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
        } else {
          // Write to cache first
          const fileUri = FileSystem.cacheDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, content, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          if (mode === 'download') {
            // Save directly to Downloads folder
            await saveToDownloads(fileUri, fileName, 'text/csv', content);
          } else {
            // Share via share sheet
            await Sharing.shareAsync(fileUri, {
              mimeType: 'text/csv',
              dialogTitle: 'Share financial data',
              UTI: 'public.comma-separated-values-text',
            });
          }
        }
      } else {
        // PDF Export
        const html = generateReportHtml(transactions, categories);

        if (Platform.OS === 'web') {
          await Print.printAsync({ html });
        } else {
          const { uri } = await Print.printToFileAsync({ html });
          const fileName = `SpendTrack_Statement_${timestamp}.pdf`;

          // Rename the PDF by copying to cache with proper name
          const namedUri = FileSystem.cacheDirectory + fileName;
          await FileSystem.copyAsync({ from: uri, to: namedUri });

          if (mode === 'download') {
            // Save directly to Downloads folder
            await saveToDownloads(namedUri, fileName, 'application/pdf');
          } else {
            // Share via share sheet
            await Sharing.shareAsync(namedUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Share Statement',
              UTI: 'com.adobe.pdf',
            });
          }
        }
      }

      setShowExportModal(false);
      setShowPreview(false);
      showToast('Data exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed. Please check permissions.', 'error');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIconWrap}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (showArrow && onPress && (
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.profileCard} activeOpacity={0.7}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.email?.split('@')[0] || 'User'}
                </Text>
                <Text style={styles.profileEmail}>{user?.email || 'Guest User'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={[styles.settingItem, { borderBottomWidth: 1 }]}>
              <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#161618' : theme.surface }]}>
                <Ionicons name="settings-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Mode</Text>
              </View>
              <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#161618' : '#F3F4F6', borderRadius: 24, padding: 4 }}>
                <TouchableOpacity
                  style={{ padding: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: themeMode === 'light' ? theme.primary : 'transparent' }}
                  onPress={() => setThemeMode('light')}
                >
                  <Ionicons name="sunny-outline" size={18} color={themeMode === 'light' ? '#FFF' : theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: themeMode === 'dark' ? theme.primary : 'transparent' }}
                  onPress={() => setThemeMode('dark')}
                >
                  <Ionicons name="moon-outline" size={18} color={themeMode === 'dark' ? '#FFF' : theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: themeMode === 'system' ? theme.primary : 'transparent' }}
                  onPress={() => setThemeMode('system')}
                >
                  <Ionicons name="phone-portrait-outline" size={18} color={themeMode === 'system' ? '#FFF' : theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
              <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#161618' : theme.surface }]}>
                <Ionicons name="color-palette-outline" size={20} color={theme.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Theme</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['blue', 'green', 'red'] as const).map((color) => {
                  const colorCode = color === 'blue' ? '#3B82F6' : color === 'green' ? '#22C55E' : '#EF4444';
                  const isSelected = themeColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colorCode,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setThemeColor(color)}
                    >
                      {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingItem
              icon="notifications"
              title="Notifications"
              subtitle="Receive transaction alerts"
              showArrow={false}
              rightComponent={
                <Switch
                  value={notifications}
                  onValueChange={(value) => {
                    setNotifications(value);
                    saveSettings('notifications', value);
                  }}
                  trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: isDark ? '#1D4ED8' : '#93C5FD' }}
                  thumbColor={notifications ? theme.primary : (isDark ? '#6B7280' : '#F3F4F6')}
                />
              }
            />
            <SettingItem
              icon="finger-print"
              title="Biometric Login"
              subtitle={isBiometricAvailable ? `Use ${biometricType} to unlock` : 'Not available on this device'}
              showArrow={false}
              rightComponent={
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={async (value) => {
                    const success = await toggleBiometric(value);
                    if (success) {
                      showToast(
                        value ? `${biometricType} enabled` : 'Biometric login disabled',
                        value ? 'success' : 'info'
                      );
                    } else {
                      showToast(
                        isBiometricAvailable ? 'Authentication failed' : `${biometricType} is not available`,
                        'error'
                      );
                    }
                  }}
                  disabled={!isBiometricAvailable}
                  trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: isDark ? '#1D4ED8' : '#93C5FD' }}
                  thumbColor={isBiometricEnabled ? theme.primary : (isDark ? '#6B7280' : '#F3F4F6')}
                />
              }
            />

            <SettingItem
              icon="list"
              title="Edit Categories"
              subtitle="Manage your expense and income categories"
              onPress={() => navigation.navigate('CategorySettings')}
            />
            <SettingItem
              icon="cash"
              title="Currency"
              subtitle={selectedCurrency}
              onPress={() => setShowCurrencyModal(true)}
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.card}>
            <SettingItem
              icon="download-outline"
              title="Export Data"
              subtitle="Download your transactions"
              onPress={handleExportData}
            />
            <SettingItem
              icon="trash-outline"
              title="Clear All Data"
              subtitle="Delete all transactions and budgets"
              onPress={handleClearData}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <SettingItem
              icon="help-circle-outline"
              title="Help Center"
              onPress={() => { }}
            />
            <SettingItem
              icon="chatbubble-outline"
              title="Contact Us"
              onPress={() => { }}
            />
            <SettingItem
              icon="star-outline"
              title="Rate the App"
              onPress={() => { }}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <SettingItem
              icon="information-circle-outline"
              title="Version"
              subtitle="1.0.0"
              showArrow={false}
            />
            <SettingItem
              icon="document-text-outline"
              title="Privacy Policy"
              onPress={() => { }}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Terms of Service"
              onPress={() => { }}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Export Data Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowExportModal(false)}>
          <View style={styles.modalBlurOverlay}>
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.exportPopupCard}>
                <View style={styles.exportPopupHeader}>
                  <Text style={styles.exportPopupTitle}>Export Data</Text>
                  <TouchableOpacity onPress={() => setShowExportModal(false)}>
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exportPopupBody}>
                  {/* Dynamic Document Icon */}
                  <View style={[styles.exportLargePaper, { borderColor: exportFormat === 'pdf' ? '#FF4D4D' : '#22C55E' }]}>
                    <View style={[styles.exportLargePaperFold, { borderLeftColor: isDark ? '#4B5563' : '#CBD5E1', borderBottomColor: isDark ? '#4B5563' : '#CBD5E1' }]} />

                    {/* Header Bar within Icon */}
                    <View style={[styles.exportLargeFormatBar, { backgroundColor: exportFormat === 'pdf' ? '#FF4D4D' : '#22C55E' }]}>
                      <Text style={styles.exportLargeFormatText}>{exportFormat.toUpperCase()}</Text>
                    </View>

                    {/* Realistic Lines inside Paper */}
                    <View style={styles.exportPaperLinesContainer}>
                      <View style={[styles.exportPaperLine, { width: '80%' }]} />
                      <View style={[styles.exportPaperLine, { width: '60%' }]} />
                      <View style={[styles.exportPaperLine, { width: '70%' }]} />
                      <View style={[styles.exportPaperLine, { width: '40%' }]} />
                    </View>
                  </View>

                  {/* Radio Options */}
                  <View style={styles.exportOptionsRow}>
                    <TouchableOpacity
                      style={styles.exportOption}
                      onPress={() => setExportFormat('pdf')}
                    >
                      <View style={styles.radioOuter}>
                        {exportFormat === 'pdf' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.exportOptionLabel}>.pdf</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.exportOption}
                      onPress={() => setExportFormat('csv')}
                    >
                      <View style={styles.radioOuter}>
                        {exportFormat === 'csv' && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.exportOptionLabel}>.csv</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Footer Buttons */}
                <View style={styles.exportPopupFooter}>
                  <View style={styles.exportButtonsStack}>
                    {exportFormat === 'pdf' && (
                      <TouchableOpacity
                        style={[styles.exportMainButton, { backgroundColor: theme.primary, marginBottom: 12 }]}
                        onPress={performDataPreview}
                      >
                        <Text style={styles.exportMainButtonText}>PREVIEW STATEMENT</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.exportButtonsRow}>
                      <TouchableOpacity
                        style={styles.shareSmallButton}
                        onPress={() => performDataExport('share')}
                      >
                        <Text style={styles.shareSmallButtonText}>SHARE</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.exportSmallButton}
                        onPress={() => performDataExport('download')}
                      >
                        <Text style={styles.exportSmallButtonText}>EXPORT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.previewHeaderBtn}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
              <Text style={styles.previewHeaderTitle}>Preview Statement</Text>
            </TouchableOpacity>

            <View style={styles.previewActions}>
              <TouchableOpacity onPress={() => performDataExport('download')} style={styles.previewIconBtn}>
                <Ionicons name="download-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => performDataExport('share')} style={styles.previewIconBtn}>
                <Ionicons name="share-social-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.previewContent}>
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={styles.webview}
              scalesPageToFit={true}
            />
          </View>

          <View style={[styles.previewFooter, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.exportMainButton, { backgroundColor: theme.primary, flex: 1, marginRight: 8 }]}
              onPress={() => performDataExport('download')}
            >
              <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.exportMainButtonText}>SAVE PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportMainButton, { backgroundColor: '#4B5563', flex: 1, marginLeft: 8 }]}
              onPress={() => performDataExport('share')}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.exportMainButtonText}>SHARE</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            {currencies.map((currency) => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyOption,
                  selectedCurrency === currency && styles.currencyOptionActive,
                ]}
                onPress={() => {
                  setSelectedCurrency(currency);
                  saveSettings('currency', currency);
                  setShowCurrencyModal(false);
                }}
              >
                <Text
                  style={[
                    styles.currencyText,
                    selectedCurrency === currency && styles.currencyTextActive,
                  ]}
                >
                  {currency}
                </Text>
                {selectedCurrency === currency && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (theme: any, insets: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: isDark ? theme.border : theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
  },
  currencyOptionActive: {
    backgroundColor: theme.surface,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  currencyTextActive: {
    color: theme.primary,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.border,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  // Export Popup Styles
  modalBlurOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  exportPopupCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.card,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  exportPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  exportPopupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
  },
  exportPopupBody: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  exportLargePaper: {
    width: 120,
    height: 150,
    backgroundColor: isDark ? theme.surface : '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 35,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportLargePaperFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 35,
    borderBottomWidth: 35,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 12,
  },
  exportLargeFormatBar: {
    width: '100%',
    paddingVertical: 10,
    marginTop: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportLargeFormatText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  exportPaperLinesContainer: {
    width: '100%',
    padding: 15,
    gap: 8,
    marginTop: 5,
  },
  exportPaperLine: {
    height: 4,
    backgroundColor: isDark ? theme.border : '#E2E8F0',
    borderRadius: 2,
  },
  exportOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    marginBottom: 15,
  },
  exportOption: {
    alignItems: 'center',
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: isDark ? theme.border : '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.primary,
  },
  exportOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  exportPopupFooter: {
    marginTop: 25,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  shareSmallButton: {
    flex: 1,
    height: 56,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareSmallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.primary,
    letterSpacing: 1,
  },
  exportSmallButton: {
    flex: 1,
    height: 56,
    backgroundColor: theme.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  exportSmallButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  exportButtonsStack: {
    width: '100%',
  },
  exportMainButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exportMainButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  previewHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 20,
  },
  previewIconBtn: {
    padding: 4,
  },
  previewContent: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  previewFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
});
