import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Transaction, CATEGORY_CONFIG, Category } from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Svg, { Circle, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnalyticsScreenProps {
  navigation: any;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { categories: dbCategories, transactions, budgets, refreshData } = useData();

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const styles = getStyles(theme, insets, isDark);

  useFocusEffect(
    useCallback(() => {
      // Only refresh if we don't have data yet. Background refresh is handled by the provider.
      if (transactions.length === 0) {
        refreshData();
      }
    }, [refreshData, transactions.length])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (period === 'monthly') {
        return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
      }
      return tDate.getFullYear() === currentDate.getFullYear();
    });
  }, [transactions, currentDate, period]);

  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter(t => t.type === activeTab);
  }, [periodTransactions, activeTab]);

  const categorySpending = useMemo(() => {
    const stats: Record<string, { amount: number; count: number }> = {};
    filteredTransactions.forEach(t => {
      if (!stats[t.category]) stats[t.category] = { amount: 0, count: 0 };
      stats[t.category].amount += t.amount;
      stats[t.category].count += 1;
    });

    return Object.keys(stats)
      .map(key => {
        const catConfig = CATEGORY_CONFIG[key as Category];
        const dbCat = dbCategories.find(c => c.id === key);
        return {
          category: key as Category,
          amount: stats[key].amount,
          count: stats[key].count,
          color: dbCat?.color || catConfig?.color || theme.primary || '#666',
          name: dbCat?.name || catConfig?.name || key,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, theme.primary, dbCategories]);

  const totalSpent = categorySpending.reduce((sum, c) => sum + c.amount, 0);
  const totalBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.limit, 0), [budgets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const navigateDate = (direction: -1 | 1) => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev);
      if (period === 'monthly') {
        nextDate.setMonth(prev.getMonth() + direction);
      } else {
        nextDate.setFullYear(prev.getFullYear() + direction);
      }
      return nextDate;
    });
  };

  const formattedDate = useMemo(() => {
    if (period === 'monthly') {
      return currentDate.toLocaleString('default', { month: 'short', year: 'numeric' });
    }
    return currentDate.getFullYear().toString();
  }, [currentDate, period]);

  const renderDonut = () => {
    let startAngle = -90;
    const center = 75;
    const r = 60;
    const cx = center;
    const cy = center;
    const circumference = 2 * Math.PI * r;

    if (totalSpent === 0) {
      return (
        <Svg width={150} height={150}>
          <Circle cx={cx} cy={cy} r={r} stroke={theme.border} strokeWidth={15} fill="none" />
        </Svg>
      );
    }

    return (
      <Svg width={150} height={150} viewBox={`0 0 150 150`}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
          strokeWidth={16}
          fill="transparent"
        />
        {categorySpending.map((item, index) => {
          const percentage = item.amount / totalSpent;
          const strokeDasharray = `${percentage * circumference} ${circumference}`;
          const path = (
            <G key={index} rotation={startAngle - 90} origin={`${cx}, ${cy}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={item.color}
                strokeWidth={16}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={0}
                strokeLinecap="round"
              />
            </G>
          );
          startAngle += (percentage * 360);
          return path;
        })}
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Analytics</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.monthSelectorWrap}>
            <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.navButton}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formattedDate}</Text>
            <TouchableOpacity onPress={() => navigateDate(1)} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.periodPicker}
            onPress={() => setShowPeriodModal(true)}
          >
            <Text style={styles.periodPickerText}>
              {period === 'monthly' ? 'Monthly' : 'Yearly'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selection Modal */}
      <Modal visible={showPeriodModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPeriodModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownCard}>
              <TouchableOpacity
                style={[styles.dropdownItem, period === 'monthly' && styles.dropdownItemActive]}
                onPress={() => {
                  setPeriod('monthly');
                  setShowPeriodModal(false);
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={period === 'monthly' ? theme.primary : theme.textSecondary} />
                <Text style={[styles.dropdownText, period === 'monthly' && styles.dropdownTextActive]}>Monthly</Text>
                {period === 'monthly' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, period === 'yearly' && styles.dropdownItemActive]}
                onPress={() => {
                  setPeriod('yearly');
                  setShowPeriodModal(false);
                }}
              >
                <Ionicons name="time-outline" size={18} color={period === 'yearly' ? theme.primary : theme.textSecondary} />
                <Text style={[styles.dropdownText, period === 'yearly' && styles.dropdownTextActive]}>Yearly</Text>
                {period === 'yearly' && <Ionicons name="checkmark" size={18} color={theme.primary} />}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBackground}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'expense' && styles.tabButtonActive]}
              onPress={() => setActiveTab('expense')}
            >
              <Text style={[styles.tabText, activeTab === 'expense' && styles.tabTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'income' && styles.tabButtonActive]}
              onPress={() => setActiveTab('income')}
            >
              <Text style={[styles.tabText, activeTab === 'income' && styles.tabTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          <View style={styles.overviewRow}>
            {/* Donut Chart */}
            <View style={styles.donutContainer}>
              {renderDonut()}
              <View style={styles.donutCenter}>
                <Text style={styles.donutCenterLabel}>{activeTab === 'expense' ? 'Spent' : 'Earned'}</Text>
                <Text style={styles.donutCenterValue}>{formatCurrency(totalSpent)}</Text>
              </View>
            </View>

            {/* Legend Map */}
            <View style={styles.legendContainer}>
              {categorySpending.slice(0, 4).map((item, idx) => (
                <View key={idx} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendName} numberOfLines={1}>{item.name}</Text>
                  </View>
                  <Text style={styles.legendAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
              {categorySpending.length > 4 && (
                <View style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: '#64748b' }]} />
                    <Text style={styles.legendName}>Others</Text>
                  </View>
                  <Text style={styles.legendAmount}>
                    {formatCurrency(categorySpending.slice(4).reduce((sum, item) => sum + item.amount, 0))}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Budget Section */}
          <View style={styles.budgetSection}>
            <View style={styles.budgetHeader}>
              <Text style={styles.cardTitle}>{period === 'monthly' ? 'Monthly Budget' : 'Yearly Budget'}</Text>
              {period === 'monthly' && (
                <TouchableOpacity onPress={() => navigation.navigate('BudgetsTab')}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetSpentText}>
                {formatCurrency(totalSpent)} <Text style={styles.budgetLimitText}>/ {formatCurrency(totalBudget)}</Text>
              </Text>
              <Text style={styles.budgetRemainingText}>
                <Text style={{ fontWeight: '700', color: theme.text }}>
                  {formatCurrency(Math.max(0, totalBudget - totalSpent))}
                </Text> Remaining
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: theme.textSecondary,
                    width: `${Math.min(100, totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%`
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.breakdownHeader}>
          <Text style={styles.cardTitle}>Category Breakdown</Text>
          <TouchableOpacity>
            <Text style={styles.editButton}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesContainer}>
          {categorySpending.map((item, index) => {
            const budgetData = budgets.find(b => b.category === item.category);
            const limit = budgetData ? budgetData.limit : 0;
            const remaining = limit - item.amount;
            const percentage = limit > 0 ? (item.amount / limit) * 100 : 0;

            return (
              <View key={item.category} style={styles.categoryCard}>
                <View style={styles.categoryCardHeader}>
                  <View style={styles.categoryCardLeft}>
                    <CategoryIcon category={item.category as Category} size={28} />
                    <View style={styles.categoryCardText}>
                      <Text style={styles.categoryNameText}>{item.name}</Text>
                      <Text style={styles.categorySubText}>{item.count} transactions</Text>
                    </View>
                  </View>
                  <View style={styles.categoryCardRight}>
                    <Text style={styles.categoryAmountText}>{formatCurrency(item.amount)}</Text>
                    <Text style={styles.categorySubText}>Budget : {formatCurrency(limit)}</Text>
                  </View>
                </View>
                <View style={styles.progressBarBgSub}>
                  <View
                    style={[
                      styles.progressBarFillSub,
                      {
                        backgroundColor: item.color,
                        width: `${Math.min(100, percentage)}%`
                      }
                    ]}
                  />
                </View>
                <Text style={styles.categoryRemainingText}>
                  {formatCurrency(Math.max(0, remaining))} remaining of {formatCurrency(limit)}
                </Text>
              </View>
            );
          })}
        </View>
        {/* Quick Stats */}
        <View style={[styles.section, { marginBottom: 20 + insets.bottom, marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatCard}>
              <Ionicons name="calendar" size={20} color="#8B5CF6" />
              <Text style={styles.quickStatValue}>
                {transactions.filter(t => {
                  const today = new Date();
                  const tDate = new Date(t.date);
                  return (
                    tDate.getMonth() === today.getMonth() &&
                    tDate.getFullYear() === today.getFullYear()
                  );
                }).length}
              </Text>
              <Text style={styles.quickStatLabel}>This Month</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="today" size={20} color="#3B82F6" />
              <Text style={styles.quickStatValue}>
                {transactions.filter(t => {
                  const today = new Date();
                  const tDate = new Date(t.date);
                  return tDate.toDateString() === today.toDateString();
                }).length}
              </Text>
              <Text style={styles.quickStatLabel}>Today</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="wallet" size={20} color="#22C55E" />
              <Text style={styles.quickStatValue}>
                {transactions.filter(t => t.type === 'income').length}
              </Text>
              <Text style={styles.quickStatLabel}>Income</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="card" size={20} color="#EF4444" />
              <Text style={styles.quickStatValue}>
                {transactions.filter(t => t.type === 'expense').length}
              </Text>
              <Text style={styles.quickStatLabel}>Expenses</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthSelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderRadius: 16,
    height: 34,
    paddingHorizontal: 4,
    gap: 0,
  },
  monthTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    minWidth: 60,
    textAlign: 'center',
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderRadius: 16,
    height: 34,
    paddingHorizontal: 16,
    gap: 6,
  },
  periodPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  toggleTextActive: {
    color: theme.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: theme.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 16,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
    borderColor: theme.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  filterTabTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#000000' : theme.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : theme.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: theme.primary,
  },
  tabText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80, // Closer to the header
    paddingRight: 16,
  },
  dropdownCard: {
    width: 140, // Smaller width
    backgroundColor: isDark ? '#161618' : '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  dropdownItemActive: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#F3F7FF',
  },
  dropdownText: {
    fontSize: 12, // Compact text
    color: theme.textSecondary,
    flex: 1,
  },
  dropdownTextActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: isDark ? '#141416' : theme.card,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Glow effect for donut
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: isDark ? 0.2 : 0,
    shadowRadius: 10,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  donutCenterValue: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 24,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendName: {
    fontSize: 14,
    color: theme.textSecondary,
    flex: 1,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 20,
  },
  budgetSection: {
    marginTop: 4,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  budgetSpentText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
  },
  budgetLimitText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  budgetRemainingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: isDark ? '#27272A' : '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    backgroundColor: isDark ? '#0A0A0C' : theme.card,
    borderRadius: 12,
    padding: 12, // More compact padding
    borderWidth: 1,
    borderColor: theme.border,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCardText: {
    marginLeft: 10,
  },
  categoryNameText: {
    fontSize: 14, // Smaller title
    fontWeight: '700',
    color: theme.text,
    marginBottom: 2,
  },
  categorySubText: {
    fontSize: 11, // Smaller subtext
    color: theme.textSecondary,
  },
  categoryCardRight: {
    alignItems: 'flex-end',
  },
  categoryAmountText: {
    fontSize: 14, // Smaller amount
    fontWeight: '800',
    color: theme.text,
    marginBottom: 2,
  },
  progressBarBgSub: {
    height: 6, // Thinner progress bar
    backgroundColor: isDark ? '#27272A' : '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFillSub: {
    height: '100%',
    borderRadius: 4,
  },
  categoryRemainingText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickStatCard: {
    width: '48%',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
});
