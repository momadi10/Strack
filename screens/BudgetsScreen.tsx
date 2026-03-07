import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Budget, CATEGORY_CONFIG } from '../types';
import { BudgetProgress } from '../components/BudgetProgress';
import { CategoryIcon } from '../components/CategoryIcon';
import {
  updateBudget,
} from '../lib/supabase-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useData } from '../context/DataContext';

interface BudgetsScreenProps {
  navigation: any;
}

import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export const BudgetsScreen: React.FC<BudgetsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const { budgets, refreshData } = useData();

  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const styles = getStyles(theme, insets, isDark);

  useFocusEffect(
    useCallback(() => {
      // Don't refresh if we already have data to keep navigation instant
      // Background loading handles the initial fetch
      if (!budgets || budgets.length === 0) {
        refreshData();
      }
    }, [refreshData, budgets])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget);
    setEditAmount(budget.limit.toString());
    setEditModal(true);
  };

  const handleSaveBudget = async () => {
    if (!selectedBudget) return;

    const newLimit = parseFloat(editAmount);
    if (isNaN(newLimit) || newLimit <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    try {
      await updateBudget(selectedBudget.category, newLimit);
      await refreshData();
      setEditModal(false);
      showToast('Budget updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update budget', 'error');
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingValue = Math.max(0, totalBudget - totalSpent);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOver = totalSpent > totalBudget;

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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.mainTitle}>Budgets</Text>
          </View>
        </View>

        {/* Overview Card */}
        <View style={styles.proOverviewCard}>
          <View style={styles.gaugeContainer}>
            <View style={styles.svgWrapper}>
              <Svg width={180} height={100} viewBox="0 0 180 100">
                <Defs>
                  <LinearGradient id="dashGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={isOver ? theme.error : theme.primary} stopOpacity="1" />
                    <Stop offset="100%" stopColor={isOver ? '#FF8C8C' : '#60A5FA'} stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <G transform="translate(90, 90)">
                  {/* Background Arc */}
                  <Path
                    d="M -75 0 A 75 75 0 0 1 75 0"
                    stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    strokeWidth="11"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Active Arc */}
                  <Path
                    d="M -75 0 A 75 75 0 0 1 75 0"
                    stroke="url(#dashGradient)"
                    strokeWidth="11"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.PI * 75} ${Math.PI * 75}`}
                    strokeDashoffset={Math.PI * 75 * (1 - Math.min(overallPercentage, 100) / 100)}
                  />
                </G>
              </Svg>
              <View style={styles.gaugeCenterInfo}>
                <Text style={styles.proAmount}>${remainingValue.toLocaleString()}</Text>
                <Text style={styles.proLabel}>REMAINING</Text>
              </View>
            </View>
          </View>

          <View style={styles.proFooter}>
            <View style={styles.proFooterItem}>
              <Text style={styles.proFooterLabel}>SPENT</Text>
              <View style={styles.proValueRow}>
                <View style={[styles.proIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trending-up" size={16} color={theme.error} />
                </View>
                <Text style={styles.proFooterValue}>${totalSpent.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.proFooterDivider} />
            <View style={styles.proFooterItem}>
              <Text style={styles.proFooterLabel}>MONTHLY LIMIT</Text>
              <View style={styles.proValueRow}>
                <View style={[styles.proIconContainer, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="flag" size={16} color={theme.primary} />
                </View>
                <Text style={styles.proFooterValue}>${totalBudget.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBanner, { backgroundColor: isOver ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)' }]}>
            <Ionicons
              name={isOver ? "warning" : "checkmark-circle"}
              size={18}
              color={isOver ? theme.error : '#10B981'}
            />
            <Text style={[styles.statusText, { color: isOver ? theme.error : '#10B981' }]}>
              {isOver ? (
                `Exceeded by $${(totalSpent - totalBudget).toLocaleString()}`
              ) : (
                `You have used ${overallPercentage.toFixed(0)}% of your budget`
              )}
            </Text>
          </View>
        </View>

        {/* Budget Categories */}
        <View style={[styles.section, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {budgets.map(budget => (
            <TouchableOpacity
              key={budget.category}
              onPress={() => handleEditBudget(budget)}
              activeOpacity={0.7}
            >
              <BudgetProgress budget={budget} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Budget</Text>
            {selectedBudget && (
              <View style={styles.modalCategory}>
                <CategoryIcon
                  category={selectedBudget.category}
                  size={24}
                  icon={selectedBudget.icon}
                  color={selectedBudget.color}
                />
                <Text style={styles.modalCategoryName}>
                  {selectedBudget.name || CATEGORY_CONFIG[selectedBudget.category as any]?.name || selectedBudget.category}
                </Text>
              </View>
            )}
            <Text style={styles.modalLabel}>Monthly Limit</Text>
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalCurrency}>$</Text>
              <TextInput
                style={styles.modalInput}
                value={editAmount}
                onChangeText={setEditAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveBudget}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
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
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
  },
  proOverviewCard: {
    marginHorizontal: 20,
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: isDark ? 1 : 0,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenterInfo: {
    position: 'absolute',
    bottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 1,
    marginTop: -4,
  },
  proAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -1,
  },
  proFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  proFooterItem: {
    flex: 1,
    alignItems: 'center',
  },
  proFooterLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  proValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proFooterValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  proFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
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
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalCurrency: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.textSecondary,
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: theme.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
