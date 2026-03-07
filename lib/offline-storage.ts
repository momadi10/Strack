import { safeStorage as AsyncStorage } from './supabase';
import { Transaction, Budget, CategoryItem } from '../types';

const STORAGE_KEYS = {
    TRANSACTIONS: 'offline_transactions',
    BUDGETS: 'offline_budgets',
    CATEGORIES: 'offline_categories',
    CACHE_TRANSACTIONS: 'cache_transactions',
    CACHE_BUDGETS: 'cache_budgets',
    CACHE_CATEGORIES: 'cache_categories',
};

export const saveOfflineTransaction = async (transaction: Transaction) => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        const transactions = stored ? JSON.parse(stored) : [];
        transactions.push({ ...transaction, synced: false });
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
        console.error('Error saving offline transaction', e);
    }
};

export const getOfflineTransactions = async (): Promise<Transaction[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const clearOfflineTransactions = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
};

// Cached (synced) data
export const saveCachedTransactions = async (transactions: Transaction[]) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHE_TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
        console.error('Error saving cached transactions', e);
    }
};

export const getCachedTransactions = async (): Promise<Transaction[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TRANSACTIONS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const saveOfflineBudget = async (budget: Budget) => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
        const budgets = stored ? JSON.parse(stored) : [];
        const index = budgets.findIndex((b: Budget) => b.category === budget.category);
        if (index >= 0) {
            budgets[index] = { ...budget, synced: false };
        } else {
            budgets.push({ ...budget, synced: false });
        }
        await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (e) {
        console.error('Error saving offline budget', e);
    }
};

export const getOfflineBudgets = async (): Promise<Budget[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const clearOfflineBudgets = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.BUDGETS);
};

export const saveCachedBudgets = async (budgets: Budget[]) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHE_BUDGETS, JSON.stringify(budgets));
    } catch (e) {
        console.error('Error saving cached budgets', e);
    }
};

export const getCachedBudgets = async (): Promise<Budget[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_BUDGETS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const saveOfflineCategory = async (category: CategoryItem) => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
        const categories = stored ? JSON.parse(stored) : [];
        categories.push({ ...category, synced: false });
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
        console.error('Error saving offline category', e);
    }
};

export const getOfflineCategories = async (): Promise<CategoryItem[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

export const clearOfflineCategories = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.CATEGORIES);
};

export const saveCachedCategories = async (categories: CategoryItem[]) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.CACHE_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
        console.error('Error saving cached categories', e);
    }
};

export const getCachedCategories = async (): Promise<CategoryItem[]> => {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_CATEGORIES);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};
