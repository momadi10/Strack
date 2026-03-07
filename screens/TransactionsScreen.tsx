import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ScrollView as RNScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Transaction, TransactionType } from '../types';
import { TransactionCard } from '../components/TransactionCard';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { CalendarView } from '../components/CalendarView';
import { deleteTransaction } from '../lib/supabase-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useData } from '../context/DataContext';

interface TransactionsScreenProps {
  navigation: any;
}

type ListGroup = {
  key: string;
  label: string;
  transactions: Transaction[];
};

import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const { transactions, refreshData } = useData();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Date | null>(null);
  const [filterAmountRange, setFilterAmountRange] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  // Applied filters (only set when user taps Apply)
  const [appliedDateFrom, setAppliedDateFrom] = useState<Date | null>(null);
  const [appliedDateTo, setAppliedDateTo] = useState<Date | null>(null);
  const [appliedAmountRange, setAppliedAmountRange] = useState<string | null>(null);
  const [appliedType, setAppliedType] = useState<TransactionType | 'all'>('all');
  const hasActiveFilters = appliedDateFrom || appliedDateTo || appliedAmountRange || appliedType !== 'all';
  // Date picker visibility
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const styles = getStyles(theme, insets, isDark);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
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
    try {
      await deleteTransaction(transaction.id);
      setModalVisible(false);
      setSelectedTransaction(null);
      await refreshData();
      showToast('Transaction deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete transaction', 'error');
    }
  };

  const getDateLabel = (dateString: string): { key: string; label: string } => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return { key: 'today', label: 'Today' };
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return { key: 'yesterday', label: 'Yesterday' };
    } else {
      return {
        key: dateOnly.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        }),
      };
    }
  };

  const handleOpenFilterModal = () => {
    setFilterDateFrom(appliedDateFrom);
    setFilterDateTo(appliedDateTo);
    setFilterAmountRange(appliedAmountRange);
    setFilterType(appliedType);
    setShowFromPicker(false);
    setShowToPicker(false);
    setShowFilterModal(true);
  };

  const handleApplyFilters = () => {
    setAppliedDateFrom(filterDateFrom);
    setAppliedDateTo(filterDateTo);
    setAppliedAmountRange(filterAmountRange);
    setAppliedType(filterType);
    setFilter(filterType);
    setShowFilterModal(false);
    showToast('Filters applied', 'info');
  };

  const handleClearFilters = () => {
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setFilterAmountRange(null);
    setFilterType('all');
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return '';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const getAmountRange = (rangeKey: string, maxVal: number): { min: number; max: number } => {
    switch (rangeKey) {
      case 'below10': return { min: 0, max: 10 };
      case '10to100': return { min: 10, max: 100 };
      case '100to500': return { min: 100, max: 500 };
      case 'dyn1': return { min: 500, max: 500 + Math.round((maxVal - 400) / 3) };
      case 'dyn2': return { min: 500 + Math.round((maxVal - 400) / 3), max: 500 + Math.round((maxVal - 400) * 2 / 3) };
      case 'dyn3': return { min: 500 + Math.round((maxVal - 400) * 2 / 3), max: maxVal + 100 };
      case 'above2000': return { min: 2000, max: Infinity };
      default: return { min: 0, max: Infinity };
    }
  };

  const listData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    let filtered = transactions.filter(t => {
      const dt = new Date(t.date);
      const isCorrectMonth = dt.getFullYear() === year && dt.getMonth() === month;
      // Use applied type filter (synced with quick filter bar)
      const typeToUse = appliedType !== 'all' ? appliedType : filter;
      const isCorrectType = typeToUse === 'all' ? true : t.type === typeToUse;
      return isCorrectMonth && isCorrectType;
    });

    // Apply date range filter
    if (appliedDateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= appliedDateFrom);
    }
    if (appliedDateTo) {
      const endOfDay = new Date(appliedDateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date) <= endOfDay);
    }

    // Apply amount range filter
    if (appliedAmountRange) {
      const maxTransAmount = Math.max(...transactions.map(t => t.amount), 1000);
      const { min, max } = getAmountRange(appliedAmountRange, maxTransAmount);
      filtered = filtered.filter(t => t.amount >= min && t.amount < max);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.amount.toString().includes(query)
      );
    }

    const grouped: { [key: string]: { label: string; transactions: Transaction[] } } = {};

    filtered.forEach(transaction => {
      const { key, label } = getDateLabel(transaction.date);
      if (!grouped[key]) {
        grouped[key] = { label, transactions: [] };
      }
      grouped[key].transactions.push(transaction);
    });

    const sortedGroups = Object.keys(grouped).sort((a, b) => {
      if (a === 'today') return -1;
      if (b === 'today') return 1;
      if (a === 'yesterday') return -1;
      if (b === 'yesterday') return 1;
      return new Date(b).getTime() - new Date(a).getTime();
    }).map(key => ({
      key,
      label: grouped[key].label,
      transactions: grouped[key].transactions
    }));

    return sortedGroups;
  }, [transactions, filter, searchQuery, appliedDateFrom, appliedDateTo, appliedAmountRange, appliedType, currentDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredByType = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return transactions.filter(t => {
      const dt = new Date(t.date);
      const isCorrectMonth = dt.getFullYear() === year && dt.getMonth() === month;
      return isCorrectMonth && (filter === 'all' ? true : t.type === filter);
    });
  }, [transactions, filter, currentDate]);

  const totalExpenses = filteredByType
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = filteredByType
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const renderItem = ({ item: group }: { item: ListGroup }) => {
    return (
      <View style={styles.groupContainer}>
        {/* Group Header */}
        <View style={styles.dateHeader}>
          <View style={[styles.dateRowIndicator, styles.todayIndicator]} />
          <View style={[styles.dateLabelBadge, styles.todayBadge]}>
            <Text style={[styles.dateHeaderText, styles.todayHeaderText]}>
              {group.label}
            </Text>
          </View>
        </View>

        {/* Transactions in Group */}
        <View style={styles.groupTransactions}>
          {group.transactions.map((t, idx) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => handleTransactionPress(t)}
              activeOpacity={0.7}
              style={[
                styles.transactionCardInGroup,
                idx === group.transactions.length - 1 && { marginBottom: 0 }
              ]}
            >
              <TransactionCard transaction={t} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>History</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.monthSelectorWrap}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{formatMonth(currentDate)}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={handleOpenFilterModal}>
            <Ionicons name={hasActiveFilters ? 'filter' : 'filter-outline'} size={20} color={hasActiveFilters ? theme.primary : theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={styles.toggleTab}
          onPress={() => setViewMode('daily')}
        >
          <Text style={[styles.toggleText, viewMode === 'daily' && styles.toggleTextActive]}>Daily</Text>
          {viewMode === 'daily' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleTab}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>Calendar</Text>
          {viewMode === 'calendar' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {viewMode === 'daily' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${filter === 'all' ? 'transactions' : filter + 's'}...`}
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
                selectionColor={theme.primary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === f && styles.filterTabTextActive,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


          {/* Transactions List */}
          <FlatList
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: 100 + insets.bottom }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color={theme.border} />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No results found' : 'No transactions this month'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `Try a different search term or clear the search`
                    : 'Tap the button below to add your first transaction'
                  }
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <CalendarView transactions={transactions} currentDate={currentDate} />
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={modalVisible}
        transaction={selectedTransaction}
        onClose={handleCloseModal}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Filter Bottom Sheet */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.filterModalOverlay} />
        </TouchableWithoutFeedback>

        <View style={styles.filterSheet}>
          {/* Drag Handle */}
          <View style={styles.filterDragHandle} />

          {/* Header */}
          <View style={styles.filterSheetHeader}>
            <Text style={styles.filterSheetTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <RNScrollView showsVerticalScrollIndicator={false} style={styles.filterSheetBody}>
            {/* Date Range */}
            <Text style={styles.filterSectionLabel}>Date Range</Text>
            <View style={styles.filterDateRow}>
              <View style={styles.filterDateCol}>
                <Text style={styles.filterDateSubLabel}>From Date</Text>
                <TouchableOpacity
                  style={styles.filterDateInput}
                  onPress={() => { setShowFromPicker(true); setShowToPicker(false); }}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterDateText, !filterDateFrom && { color: theme.textSecondary }]}>
                    {filterDateFrom ? formatDateDisplay(filterDateFrom) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showFromPicker && (
                  <DateTimePicker
                    value={filterDateFrom || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event: any, selectedDate?: Date) => {
                      if (Platform.OS === 'android') setShowFromPicker(false);
                      if (selectedDate) setFilterDateFrom(selectedDate);
                    }}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
              </View>
              <View style={styles.filterDateCol}>
                <Text style={styles.filterDateSubLabel}>To Date</Text>
                <TouchableOpacity
                  style={styles.filterDateInput}
                  onPress={() => { setShowToPicker(true); setShowFromPicker(false); }}
                >
                  <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.filterDateText, !filterDateTo && { color: theme.textSecondary }]}>
                    {filterDateTo ? formatDateDisplay(filterDateTo) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showToPicker && (
                  <DateTimePicker
                    value={filterDateTo || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event: any, selectedDate?: Date) => {
                      if (Platform.OS === 'android') setShowToPicker(false);
                      if (selectedDate) setFilterDateTo(selectedDate);
                    }}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
              </View>
            </View>

            {/* Amount */}
            <Text style={styles.filterSectionLabel}>Amount</Text>
            <View style={styles.filterChipsRow}>
              {(() => {
                const maxAmount = Math.max(...transactions.map(t => t.amount), 500);
                const showDynamic = maxAmount > 500;

                const chips = [
                  { key: 'below10', label: 'Below $10' },
                  { key: '10to100', label: '$10 - $100' },
                  { key: '100to500', label: '$100 - $500' },
                ];

                if (showDynamic) {
                  const d1Max = 500 + Math.round((maxAmount - 400) / 3);
                  const d2Max = 500 + Math.round((maxAmount - 400) * 2 / 3);
                  const totalMax = Math.round(maxAmount + 100);

                  chips.push(
                    { key: 'dyn1', label: `$500 - $${d1Max}` },
                    { key: 'dyn2', label: `$${d1Max} - $${d2Max}` },
                    { key: 'dyn3', label: `$${d2Max} - $${totalMax}` }
                  );
                }

                return chips.map(chip => (
                  <TouchableOpacity
                    key={chip.key}
                    style={[
                      styles.filterChip,
                      filterAmountRange === chip.key && styles.filterChipActive,
                    ]}
                    onPress={() => setFilterAmountRange(
                      filterAmountRange === chip.key ? null : chip.key
                    )}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterAmountRange === chip.key && styles.filterChipTextActive,
                    ]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ));
              })()}
            </View>

            {/* Payment Type */}
            <Text style={styles.filterSectionLabel}>Payment Type</Text>
            <View style={styles.filterTypeRow}>
              <TouchableOpacity
                style={[
                  styles.filterTypeCard,
                  filterType === 'expense' && styles.filterTypeCardActive,
                ]}
                onPress={() => setFilterType(filterType === 'expense' ? 'all' : 'expense')}
              >
                <View style={[styles.filterTypeIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="arrow-up-circle" size={28} color="#EF4444" />
                </View>
                <Text style={[
                  styles.filterTypeLabel,
                  filterType === 'expense' && styles.filterTypeLabelActive,
                ]}>Expense</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterTypeCard,
                  filterType === 'income' && styles.filterTypeCardActive,
                ]}
                onPress={() => setFilterType(filterType === 'income' ? 'all' : 'income')}
              >
                <View style={[styles.filterTypeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Ionicons name="arrow-down-circle" size={28} color="#22C55E" />
                </View>
                <Text style={[
                  styles.filterTypeLabel,
                  filterType === 'income' && styles.filterTypeLabelActive,
                ]}>Income</Text>
              </TouchableOpacity>
            </View>
          </RNScrollView>

          {/* Bottom Buttons */}
          <View style={styles.filterSheetFooter}>
            <TouchableOpacity style={styles.filterClearBtn} onPress={handleClearFilters}>
              <Text style={styles.filterClearBtnText}>CLEAR ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyBtn} onPress={handleApplyFilters}>
              <Text style={styles.filterApplyBtnText}>APPLY</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthSelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
    minWidth: 75,
    textAlign: 'center',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: theme.text,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 60,
    height: 3,
    backgroundColor: theme.primary,
    borderRadius: 3,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    marginLeft: 10,
    marginRight: 8,
    padding: 0,
    backgroundColor: 'transparent',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.card,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  filterTabActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  summaryIconWrap: {
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  groupContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
    borderRadius: 24,
    padding: 16,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
  },
  groupTransactions: {
    marginTop: 0,
  },
  transactionCardInGroup: {
    marginBottom: 4,
  },
  dateHeader: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4, // Shifted slightly from the far left
  },
  todayHeader: {
    paddingTop: 32,
  },
  dateRowIndicator: {
    width: 6,
    height: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginRight: 10,
  },
  todayIndicator: {
    width: 6,
    height: 20,
    backgroundColor: theme.primary,
  },
  dateLabelBadge: {
    alignSelf: 'flex-start',
  },
  todayBadge: {
    // No box, just plain text
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  todayHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.primary,
  },
  historyCardWrapper: {
    marginHorizontal: 28,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: theme.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  filterSheetBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
    marginTop: 8,
  },
  filterDateRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  filterDateCol: {
    flex: 1,
  },
  filterDateSubLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  filterDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  filterDateText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterTypeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  filterTypeCard: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  filterTypeCardActive: {
    borderColor: theme.primary,
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
  },
  filterTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  filterTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  filterTypeLabelActive: {
    color: theme.text,
  },
  filterSheetFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
    marginTop: 10,
  },
  filterClearBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterClearBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 1,
  },
  filterApplyBtn: {
    flex: 2,
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterApplyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
