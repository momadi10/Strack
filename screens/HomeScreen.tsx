import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Transaction, Category } from '../types';
import { TransactionCard } from '../components/TransactionCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import {
  deleteTransaction,
  getCategorySpending,
} from '../lib/supabase-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useNotifications } from '../context/NotificationContext';

interface HomeScreenProps {
  navigation: any;
}

import { useTheme } from '../context/ThemeContext';

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { categories, transactions, stats, refreshData } = useData();
  const { unreadCount } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const styles = getStyles(theme, insets, isDark);

  // Memoize calculations to prevent stuttering during scroll or data updates
  const categorySpending = useMemo(() =>
    getCategorySpending(transactions, categories).slice(0, 3),
    [transactions, categories]
  );

  useFocusEffect(
    useCallback(() => {
      // Only refresh in background if we already have data, otherwise it's handled by first load
      if (transactions.length > 0) {
        refreshData();
      }
    }, [refreshData, transactions.length])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedTransaction(null);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setModalVisible(false);
    navigation.navigate('AddTransaction', { transaction, isEditing: true });
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    await deleteTransaction(transaction.id);
    setModalVisible(false);
    setSelectedTransaction(null);
    refreshData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.title}>SpendTrack</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
              {unreadCount > 0 && (
                <View style={[styles.badgeContainer, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(stats.balance)}
              </Text>
            </View>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="arrow-down" size={14} color="#4ADE80" />
              </View>
              <View>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={styles.statValueIncome}>
                  {formatCurrency(stats.income)}
                </Text>
              </View>
            </View>

            <View style={styles.statVerticalDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name="arrow-up" size={14} color="#F87171" />
              </View>
              <View>
                <Text style={styles.statLabel}>Expenses</Text>
                <Text style={styles.statValueExpense}>
                  {formatCurrency(stats.expenses)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="trending-up" size={16} color="#8B5CF6" />
            </View>
            <View style={styles.quickStatInfo}>
              <Text style={styles.quickStatValue}>
                {stats.savingsRate.toFixed(0)}%
              </Text>
              <Text style={styles.quickStatLabel}>Savings Rate</Text>
            </View>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="pie-chart" size={16} color={theme.primary} />
            </View>
            <View style={styles.quickStatInfo}>
              <Text style={styles.quickStatValue}>
                {categories.length}
              </Text>
              <Text style={styles.quickStatLabel}>Categories</Text>
            </View>
          </View>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIconWrap, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="receipt" size={16} color="#F59E0B" />
            </View>
            <View style={styles.quickStatInfo}>
              <Text style={styles.quickStatValue}>{transactions.length}</Text>
              <Text style={styles.quickStatLabel}>Transactions</Text>
            </View>
          </View>
        </View>

        {/* Top Spending This Month */}
        <View style={styles.topSpendingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Spending This Month</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AnalyticsTab')}>
              <Text style={styles.seeAll}>Details</Text>
            </TouchableOpacity>
          </View>
          {categorySpending.length === 0 ? (
            <View style={styles.emptySpending}>
              <Ionicons name="bar-chart-outline" size={40} color={theme.textSecondary} />
              <Text style={styles.emptySpendingText}>No spending yet this month</Text>
            </View>
          ) : (
            <View style={styles.topSpendingCard}>
              {categorySpending.map((cat, index) => {
                const totalSpent = categorySpending.reduce((sum, c) => sum + c.amount, 0);
                const percentage = totalSpent > 0 ? (cat.amount / totalSpent) * 100 : 0;
                const maxAmount = Math.max(...categorySpending.map(c => c.amount), 1);
                const barWidth = (cat.amount / maxAmount) * 100;

                return (
                  <View key={cat.category} style={styles.topSpendingRow}>
                    <View style={styles.topSpendingLeft}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <CategoryIcon category={cat.category as Category} size={20} />
                      <View style={styles.topSpendingInfo}>
                        <Text style={styles.topSpendingName}>
                          {cat.name.split(' ')[0]}
                        </Text>
                        <Text style={styles.topSpendingPercent}>
                          {percentage.toFixed(0)}% of spending
                        </Text>
                      </View>
                    </View>
                    <View style={styles.topSpendingRight}>
                      <Text style={styles.topSpendingAmount}>
                        ${cat.amount.toFixed(0)}
                      </Text>
                      <View style={styles.topSpendingBar}>
                        <View
                          style={[
                            styles.topSpendingBarFill,
                            { width: `${barWidth}%`, backgroundColor: cat.color },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Transactions */}
        <View style={[styles.recentSection, { paddingBottom: 20 + insets.bottom }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('TransactionsTab')}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {transactions.slice(0, 3).map(transaction => (
            <TouchableOpacity
              key={transaction.id}
              onPress={() => handleTransactionPress(transaction)}
              activeOpacity={0.7}
            >
              <TransactionCard transaction={transaction} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={handleCloseModal}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />
    </SafeAreaView>
  );
};

const getStyles = (theme: any, insets: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.background,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: isDark ? '#111827' : '#1F2937',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.2 : 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  balanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 1,
  },
  statValueIncome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80',
  },
  statValueExpense: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F87171',
  },
  statVerticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  quickStatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  quickStatInfo: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
  },
  quickStatLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '700',
  },
  emptySpending: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: theme.card,
    borderRadius: 16,
  },
  emptySpendingText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
  },
  topSpendingCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  topSpendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  topSpendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  topSpendingInfo: {
    marginLeft: 10,
    flex: 1,
  },
  topSpendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  topSpendingPercent: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  topSpendingRight: {
    alignItems: 'flex-end',
    width: 80,
  },
  topSpendingAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  topSpendingBar: {
    width: '100%',
    height: 5,
    backgroundColor: theme.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  topSpendingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  topSpendingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  recentSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  seeAll: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '500',
  },
});
