import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Budget, CATEGORY_CONFIG } from '../types';
import { CategoryIcon } from './CategoryIcon';
import Ionicons from '@expo/vector-icons/Ionicons';

interface BudgetProgressProps {
  budget: Budget;
}

import { useTheme } from '../context/ThemeContext';

export const BudgetProgress: React.FC<BudgetProgressProps> = ({ budget }) => {
  const { theme, isDark } = useTheme();
  const config = CATEGORY_CONFIG[budget.category] || { name: budget.name || budget.category, icon: budget.icon || 'ellipse', color: budget.color || theme.primary };
  const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
  const remaining = budget.limit - budget.spent;
  const isOverBudget = budget.spent > budget.limit;

  const styles = getStyles(theme, isDark);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <CategoryIcon
            category={budget.category}
            size={18}
            icon={budget.icon || config.icon}
            color={budget.color || config.color}
          />
          <Text style={styles.categoryName}>{config.name}</Text>
          {budget.synced === false && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#F59E0B" />
            </View>
          )}
        </View>
        <Text style={[styles.amount, isOverBudget && styles.overBudget]}>
          ${budget.spent.toFixed(0)} / ${budget.limit}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: isOverBudget ? theme.error : (budget.color || config.color),
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.remaining, isOverBudget && styles.overBudgetText]}>
        {isOverBudget
          ? `Over budget by $${Math.abs(remaining).toFixed(0)}`
          : `$${remaining.toFixed(0)} remaining`}
      </Text>
    </View>
  );
};

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 10,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  overBudget: {
    color: theme.error,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: theme.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remaining: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  overBudgetText: {
    color: theme.error,
  },
  offlineBadge: {
    marginLeft: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 2,
    borderRadius: 4,
  },
});
