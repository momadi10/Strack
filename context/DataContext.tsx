import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CategoryItem, Transaction, Budget } from '../types';
import {
    getCategories as fetchCategoriesFromDb,
    getTransactions as fetchTransactionsFromDb,
    getBudgets as fetchBudgetsFromDb,
    getMonthlyStats,
} from '../lib/supabase-storage';
import { supabase } from '../lib/supabase';
import { setupSyncManager, syncOfflineData } from '../lib/sync-manager';
import { useNotifications } from './NotificationContext';

interface DataContextType {
    categories: CategoryItem[];
    transactions: Transaction[];
    budgets: Budget[];
    stats: {
        income: number;
        expenses: number;
        balance: number;
        lastMonthExpenses: number;
        savingsRate: number;
    };
    expenseCategories: CategoryItem[];
    incomeCategories: CategoryItem[];
    refreshData: () => Promise<void>;
    isLoading: boolean;
    getCategoryById: (id: string) => CategoryItem | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        income: 0,
        expenses: 0,
        balance: 0,
        lastMonthExpenses: 0,
        savingsRate: 0,
    });

    const refreshData = useCallback(async () => {
        try {
            // 1. Get session once - much faster than getUser()
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const userId = session.user.id;

            // 2. Fetch everything in parallel
            // We fetch Categories and Transactions first because Budgets depend on Categories
            const [allCategories, allTransactions] = await Promise.all([
                fetchCategoriesFromDb(undefined, userId),
                fetchTransactionsFromDb(userId),
            ]);

            // Now fetch budgets using the already fetched categories to save a query
            const allBudgets = await fetchBudgetsFromDb(userId, allCategories);

            setCategories(allCategories);
            setTransactions(allTransactions);

            // 3. Calculate budget spending locally to be faster
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthlySpending: Record<string, number> = {};

            for (const t of allTransactions) {
                if (t.type === 'expense' && new Date(t.date) >= startOfMonth) {
                    monthlySpending[t.category] = (monthlySpending[t.category] || 0) + t.amount;
                }
            }

            const enrichedBudgets = allBudgets.map(b => ({
                ...b,
                spent: monthlySpending[b.category] || 0
            }));

            setBudgets(enrichedBudgets);
            setStats(getMonthlyStats(allTransactions));
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (isMounted) {
                if (session) {
                    refreshData();
                } else {
                    setIsLoading(false);
                }
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                if (session) {
                    refreshData();
                } else {
                    setCategories([]);
                    setTransactions([]);
                    setBudgets([]);
                    setStats({
                        income: 0,
                        expenses: 0,
                        balance: 0,
                        lastMonthExpenses: 0,
                        savingsRate: 0,
                    });
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [refreshData]);

    const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
    const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

    const { scheduleBudgetAlert } = useNotifications();

    const alertedBudgets = useRef<Set<string>>(new Set());

    // Check for budget alerts after data loads
    useEffect(() => {
        if (!isLoading && budgets.length > 0) {
            budgets.forEach(b => {
                const isOverLimit = b.limit > 0 && b.spent >= b.limit * 0.9; // 90% or more

                if (isOverLimit) {
                    // Only alert if we haven't already alerted for this specific budget ID in this session
                    if (!alertedBudgets.current.has(b.category)) {
                        scheduleBudgetAlert(b.name || b.category, b.spent, b.limit);
                        alertedBudgets.current.add(b.category);
                    }
                } else {
                    // Reset if they dropped below the limit again (e.g. deleted a transaction)
                    if (alertedBudgets.current.has(b.category)) {
                        alertedBudgets.current.delete(b.category);
                    }
                }
            });
        }
    }, [budgets, isLoading, scheduleBudgetAlert]);

    const getCategoryById = useCallback((id: string) => {
        return categories.find(c => c.id === id);
    }, [categories]);

    useEffect(() => {
        // Initial sync of any data left from previous sessions
        syncOfflineData().then(() => refreshData());

        // Setup listener for network changes
        const unsubscribeSync = setupSyncManager(() => {
            refreshData();
        });

        return () => {
            unsubscribeSync();
        };
    }, [refreshData]);

    const value = useMemo(() => ({
        categories,
        transactions,
        budgets,
        stats,
        expenseCategories,
        incomeCategories,
        refreshData,
        isLoading,
        getCategoryById,
    }), [categories, transactions, budgets, stats, expenseCategories, incomeCategories, refreshData, isLoading, getCategoryById]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
