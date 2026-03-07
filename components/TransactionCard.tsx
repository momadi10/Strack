import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Transaction, CATEGORY_CONFIG } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { useData } from '../context/DataContext';

interface TransactionCardProps {
  transaction: Transaction;
}

import { useTheme } from '../context/ThemeContext';

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
}) => {
  const { theme, isDark } = useTheme();
  const { getCategoryById } = useData();

  const dbCategory = getCategoryById(transaction.category as string);
  const config = CATEGORY_CONFIG[transaction.category] || { name: transaction.category };

  const displayName = dbCategory?.name || config.name;
  const isExpense = transaction.type === 'expense';

  const styles = getStyles(theme, isDark);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <View style={[
      styles.container,
      !transaction.synced && styles.offlineContainer
    ]}>
      <View style={styles.leftContent}>
        <View style={styles.iconWrapper}>
          <CategoryIcon category={transaction.category} size={20} />
        </View>
        <View style={styles.details}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <View style={styles.categoryRow}>
            <Text style={styles.category}>{displayName}</Text>
            {!transaction.synced && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline-outline" size={10} color="#F59E0B" />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isExpense ? '#EF4444' : '#22C55E' }]}>
          {isExpense ? '-' : '+'}${transaction.amount.toFixed(2)}
        </Text>
        <Text style={styles.time}>{formatTime(transaction.date)}</Text>
      </View>
    </View>
  );
};

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    marginLeft: 14,
    flex: 1,
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 1,
  },
  time: {
    fontSize: 11,
    color: theme.textSecondary,
    opacity: 0.7,
  },
  offlineContainer: {
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.05)' : '#FFFBEB',
    borderColor: '#F59E0B',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  offlineText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
});
