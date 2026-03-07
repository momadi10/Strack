import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  TransactionType,
  Category,
  Transaction,
} from '../types';
import { CategoryIcon } from '../components/CategoryIcon';
import { addTransaction } from '../lib/supabase-storage';
import { supabase } from '../lib/supabase';
import { CategoryItem } from '../types';
import { useData } from '../context/DataContext';

interface AddTransactionScreenProps {
  navigation: any;
  route: {
    params?: {
      transaction?: Transaction;
      isEditing?: boolean;
    };
  };
}

import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const { categories, refreshData } = useData();

  const isEditing = route?.params?.isEditing || false;
  const existingTransaction = route?.params?.transaction || null;

  const [type, setType] = useState<TransactionType>(existingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(existingTransaction ? existingTransaction.amount.toString() : '');
  const [category, setCategory] = useState<Category>(existingTransaction?.category || 'food');
  const [description, setDescription] = useState(existingTransaction?.description || '');
  const [selectedDate, setSelectedDate] = useState<Date>(
    existingTransaction ? new Date(existingTransaction.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = getStyles(theme, isDark);

  const filteredCategories = categories.filter(c => c.type === type);

  useEffect(() => {
    if (!isEditing && filteredCategories.length > 0) {
      const defaultCat = filteredCategories.find(c => c.id === (type === 'expense' ? 'food' : 'salary')) || filteredCategories[0];
      setCategory(defaultCat.id as Category);
    }
  }, [type, isEditing]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);

    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Please enter a description', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && existingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update({
            type,
            amount: numAmount,
            category,
            description: description.trim(),
            date: selectedDate.toISOString(),
          })
          .eq('id', existingTransaction.id);

        if (error) throw error;
        showToast('Transaction updated successfully', 'success');
      } else {
        await addTransaction({
          type,
          amount: numAmount,
          category,
          description: description.trim(),
          date: selectedDate.toISOString(),
        });
        showToast('Transaction added successfully', 'success');
      }

      // Refresh global data after saving
      await refreshData();
      navigation.goBack();
    } catch (error) {
      showToast('Failed to save transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={() => navigation.goBack()}
    >
      <View style={styles.modalBlurOverlay}>
        <BlurView
          intensity={isDark ? 30 : 50}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.popupCard}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.cardContent}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={styles.title}>
                    {isEditing ? 'Edit' : 'New'} Transaction
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* Type Toggle */}
                <View style={styles.typeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      type === 'expense' && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      setType('expense');
                      if (!isEditing) setCategory('food');
                    }}
                  >
                    <Ionicons
                      name="arrow-up-circle"
                      size={18}
                      color={type === 'expense' ? '#FFFFFF' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        type === 'expense' && styles.typeTextActive,
                      ]}
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      type === 'income' && styles.typeButtonActiveIncome,
                    ]}
                    onPress={() => {
                      setType('income');
                      if (!isEditing) setCategory('salary');
                    }}
                  >
                    <Ionicons
                      name="arrow-down-circle"
                      size={18}
                      color={type === 'income' ? '#FFFFFF' : '#22C55E'}
                    />
                    <Text
                      style={[
                        styles.typeText,
                        type === 'income' && styles.typeTextActive,
                      ]}
                    >
                      Income
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.amountSection}>
                  <View style={styles.amountInputContainer}>
                    <Text style={[styles.currencySymbol, { color: type === 'expense' ? '#EF4444' : '#22C55E' }]}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      selectionColor={theme.primary}
                    />
                  </View>
                </View>

                {/* Date & Time Row */}
                <View style={styles.dateTimeSection}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setShowDatePicker(true); setShowTimePicker(false); }}
                  >
                    <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => { setShowTimePicker(true); setShowDatePicker(false); }}
                  >
                    <Ionicons name="time-outline" size={18} color={theme.primary} />
                    <Text style={styles.dateTimeText}>{formatTime(selectedDate)}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event: any, date?: Date) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (date) {
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                        setSelectedDate(newDate);
                      }
                    }}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event: any, date?: Date) => {
                      if (Platform.OS === 'android') setShowTimePicker(false);
                      if (date) {
                        const newDate = new Date(selectedDate);
                        newDate.setHours(date.getHours(), date.getMinutes());
                        setSelectedDate(newDate);
                      }
                    }}
                    themeVariant={isDark ? 'dark' : 'light'}
                  />
                )}

                {/* Description Input */}
                <View style={styles.descriptionSection}>
                  <View style={styles.descriptionInputRow}>
                    <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                    <TextInput
                      style={styles.descriptionInput}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Add a note..."
                      placeholderTextColor={theme.textSecondary}
                      returnKeyType="done"
                      selectionColor={theme.primary}
                    />
                  </View>
                </View>

                {/* Category Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category</Text>
                  <View style={styles.categoriesGrid}>
                    {filteredCategories.map(catItem => (
                      <TouchableOpacity
                        key={catItem.id}
                        style={[
                          styles.categoryItem,
                          category === catItem.id && styles.categoryItemActive,
                        ]}
                        onPress={() => setCategory(catItem.id as Category)}
                      >
                        <CategoryIcon
                          category={catItem.id as Category}
                          size={20}
                          icon={catItem.icon}
                          color={catItem.color}
                        />
                        <Text
                          style={[
                            styles.categoryName,
                            category === catItem.id && styles.categoryNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {catItem.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Save Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: type === 'expense' ? '#EF4444' : '#22C55E' },
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading
                      ? 'Saving...'
                      : isEditing
                        ? 'Update Transaction'
                        : 'Add Transaction'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  modalBlurOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupCard: {
    flex: 1,
    marginHorizontal: '4%',
    marginVertical: Dimensions.get('window').height * 0.06,
    backgroundColor: theme.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: isDark ? theme.surface : '#F9FAFB',
    borderRadius: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    marginRight: 2,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.text,
    minWidth: 100,
    textAlign: 'center',
  },
  dateTimeSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  descriptionSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  descriptionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
    padding: 0,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    width: '22%',
    backgroundColor: isDark ? theme.surface : '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemActive: {
    borderColor: theme.primary,
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
  },
  categoryName: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  categoryNameActive: {
    color: theme.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
