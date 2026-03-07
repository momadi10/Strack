import { supabase } from './supabase';
import { Transaction, Budget, Category, CategoryItem, TransactionType, CATEGORY_CONFIG, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';
import NetInfo from '@react-native-community/netinfo';
import {
    getOfflineTransactions,
    saveOfflineTransaction,
    getCachedTransactions,
    saveCachedTransactions,
    getOfflineBudgets,
    saveOfflineBudget,
    getCachedBudgets,
    saveCachedBudgets,
    getOfflineCategories,
    saveOfflineCategory,
    getCachedCategories,
    saveCachedCategories
} from './offline-storage';

// Helper to generate a valid UUID v4
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Categories
export const getCategories = async (type?: TransactionType, userId?: string): Promise<CategoryItem[]> => {
    let currentUserId = userId;
    if (!currentUserId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        } catch (e) {
            console.warn('Failed to get session for categories:', e);
        }
    }

    let dbCategories: CategoryItem[] = [];
    const netState = await NetInfo.fetch();

    if (netState.isConnected && currentUserId) {
        try {
            let query = supabase.from('categories')
                .select('*')
                .eq('user_id', currentUserId)
                .order('sort_order', { ascending: true });

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;
            if (error) throw error;

            dbCategories = (data || []).map(record => ({
                id: record.id,
                name: record.name,
                icon: record.icon,
                color: record.color,
                type: record.type,
                sort_order: record.sort_order,
                synced: true,
            }));

            // Update cache (only if we fetched all categories or we trust the partial fetch)
            if (!type) {
                await saveCachedCategories(dbCategories);
            }
        } catch (error) {
            console.error('Error fetching categories from DB, falling back to cache:', error);
            dbCategories = await getCachedCategories();
            if (type) dbCategories = dbCategories.filter(c => c.type === type);
        }
    } else {
        dbCategories = await getCachedCategories();
        if (type) dbCategories = dbCategories.filter(c => c.type === type);
    }

    const dbCategoryIds = new Set(dbCategories.map(c => c.id));

    // Always provide immutable system default categories
    const defaults: CategoryItem[] = [];
    const allCats = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

    for (let i = 0; i < allCats.length; i++) {
        const cat = allCats[i];
        if (dbCategoryIds.has(cat)) continue;

        const config = CATEGORY_CONFIG[cat];
        const catType: TransactionType = INCOME_CATEGORIES.includes(cat) ? 'income' : 'expense';

        if (!type || type === catType) {
            defaults.push({
                id: cat,
                name: config.name,
                icon: config.icon,
                color: config.color,
                type: catType,
                sort_order: i,
            });
        }
    }

    // Merge with offline categories (pending sync)
    const offlineCategories = await getOfflineCategories();
    if (type) {
        dbCategories.push(...offlineCategories.filter(c => c.type === type));
    } else {
        dbCategories.push(...offlineCategories);
    }

    return [...defaults, ...dbCategories].sort((a, b) => a.sort_order - b.sort_order);
};

export const addCategory = async (category: Omit<CategoryItem, 'id' | 'synced'>, id?: string, skipOffline = false): Promise<CategoryItem | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const newId = id || ('cat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9));
    const categoryWithId = { ...category, id: newId };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        if (skipOffline) return null;
        const offlineCat = { ...categoryWithId, synced: false } as CategoryItem;
        await saveOfflineCategory(offlineCat);
        return offlineCat;
    }

    const { data, error } = await supabase
        .from('categories')
        .insert([{
            ...category,
            id: newId,
            user_id: user.id
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding category:', error);
        if (skipOffline) return null;
        // Fallback to offline
        const offlineCat = { ...categoryWithId, synced: false };
        await saveOfflineCategory(offlineCat);
        return offlineCat;
    }

    return { ...data, synced: true };
};

export const updateCategory = async (id: string, updates: Partial<CategoryItem>): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        console.warn('Cannot update category offline - queueing not implemented for updates yet');
        return;
    }

    try {
        const { error } = await supabase
            .from('categories')
            .upsert({ ...updates, id, user_id: user.id });

        if (error) throw error;
    } catch (error) {
        console.error('Error updating category:', error);
    }
};

export const deleteCategory = async (id: string): Promise<void> => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        console.warn('Cannot delete category offline');
        return;
    }

    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting category:', error);
    }
};

export const reorderCategories = async (categories: CategoryItem[]): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    try {
        await Promise.all(categories.map((cat, i) =>
            supabase
                .from('categories')
                .update({ sort_order: i })
                .eq('id', cat.id)
                .eq('user_id', user.id)
        ));
    } catch (error) {
        console.error('Error reordering categories:', error);
    }
};

// Transactions
export const getTransactions = async (userId?: string): Promise<Transaction[]> => {
    let currentUserId = userId;
    if (!currentUserId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        } catch (e) {
            console.warn('Failed to get session for transactions:', e);
        }
    }

    let transactions: Transaction[] = [];
    const netState = await NetInfo.fetch();

    if (netState.isConnected && currentUserId) {
        try {
            let query = supabase.from('transactions').select('*');
            if (currentUserId) {
                query = query.eq('user_id', currentUserId);
            }
            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;

            if (data) {
                transactions = data.map(record => ({
                    id: record.id,
                    type: record.type,
                    amount: Number(record.amount),
                    category: record.category,
                    description: record.description,
                    date: record.date,
                    createdAt: new Date(record.created_at).getTime(),
                    synced: true,
                }));
                // Update cache
                await saveCachedTransactions(transactions);
            }
        } catch (error) {
            console.error('Error fetching transactions from DB, falling back to cache:', error);
            transactions = await getCachedTransactions();
        }
    } else {
        transactions = await getCachedTransactions();
    }

    // Merge with offline transactions (pending sync)
    // Use a Map to de-duplicate by ID (in case some were just synced but are still in offline storage)
    const offlineTransactions = await getOfflineTransactions();
    const allTransactionsMap = new Map();

    // Add online transactions first
    transactions.forEach(t => allTransactionsMap.set(t.id, t));

    // Add offline transactions (they will overwrite if ID matches, but offline should have tempIDs)
    offlineTransactions.forEach(t => {
        if (!allTransactionsMap.has(t.id)) {
            allTransactionsMap.set(t.id, { ...t, synced: false });
        }
    });

    return Array.from(allTransactionsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'synced'> & { id?: string }, skipOffline = false): Promise<Transaction | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    // Use provided ID (e.g., from sync) or generate a new UUID
    const finalId = transaction.id || generateUUID();

    // For transition, we'll keep the tempId logic for local identification but pass uuid to DB
    const transactionTemplate: Transaction = {
        ...transaction,
        id: finalId,
        createdAt: Date.now(),
        synced: false
    };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        if (skipOffline) return null;
        await saveOfflineTransaction(transactionTemplate);
        return transactionTemplate;
    }

    const { data, error } = await supabase
        .from('transactions')
        .insert([{
            id: finalId, // Pass explicitly to de-duplicate at DB level
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            description: transaction.description,
            date: transaction.date,
            user_id: user.id,
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding transaction:', error);
        if (skipOffline) return null;
        // Fallback to offline
        await saveOfflineTransaction(transactionTemplate);
        return transactionTemplate;
    }

    return {
        id: data.id,
        type: data.type,
        amount: Number(data.amount),
        category: data.category,
        description: data.description,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
        synced: true,
    };
};

export const deleteTransaction = async (id: string): Promise<void> => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        console.warn('Cannot delete transaction offline');
        return;
    }

    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting transaction:', error);
    }
};

// Budgets
export const getBudgets = async (userId?: string, preFetchedCategories?: CategoryItem[]): Promise<Budget[]> => {
    let currentUserId = userId;
    if (!currentUserId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        } catch (e) {
            console.warn('Failed to get session for budgets:', e);
        }
    }
    if (!currentUserId) return [];

    const expenseCategories = preFetchedCategories
        ? preFetchedCategories.filter(c => c.type === 'expense')
        : await getCategories('expense', currentUserId);

    let records: any[] = [];
    const netState = await NetInfo.fetch();

    if (netState.isConnected && currentUserId) {
        try {
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .eq('user_id', currentUserId);

            if (error) throw error;
            records = data || [];

            // Map to formal Budget type for caching
            const budgetsToCache = expenseCategories.map(cat => {
                const record = records.find(r => r.category === cat.id);
                return {
                    category: cat.id as Category,
                    limit: record ? Number(record.limit) : 0,
                    spent: 0,
                    icon: cat.icon,
                    color: cat.color,
                    name: cat.name,
                    synced: true,
                };
            });
            await saveCachedBudgets(budgetsToCache);
        } catch (error) {
            console.error('Error fetching budgets from DB, falling back to cache:', error);
            const cachedBudgets = await getCachedBudgets();
            return cachedBudgets;
        }
    } else {
        const cachedBudgets = await getCachedBudgets();
        if (cachedBudgets.length > 0) return cachedBudgets;
    }

    const offlineBudgets = await getOfflineBudgets();

    return expenseCategories.map(cat => {
        const record = records.find(r => r.category === cat.id);
        const offlineRecord = offlineBudgets.find(b => b.category === cat.id);

        return {
            category: cat.id as Category,
            limit: offlineRecord ? offlineRecord.limit : (record ? Number(record.limit) : 0),
            spent: 0,
            icon: cat.icon,
            color: cat.color,
            name: cat.name,
            synced: offlineRecord ? false : (record ? true : undefined),
        };
    });
};

export const updateBudget = async (category: Category, limit: number, skipOffline = false): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        if (!skipOffline) {
            await saveOfflineBudget({ category, limit, spent: 0, synced: false });
        }
        return;
    }

    const { error } = await supabase
        .from('budgets')
        .upsert({ category, limit, user_id: user.id }, { onConflict: 'user_id, category' });

    if (error) {
        console.error('Error updating budget:', error);
        if (!skipOffline) {
            // Fallback
            await saveOfflineBudget({ category, limit, spent: 0, synced: false });
        }
    }
};

// Statistics helpers
export const getMonthlyStats = (transactions: Transaction[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonth = [];
    const lastMonth = [];

    for (const t of transactions) {
        const tDate = new Date(t.date);
        if (tDate >= startOfMonth) {
            thisMonth.push(t);
        } else if (tDate >= startOfLastMonth) {
            lastMonth.push(t);
        }
    }

    let income = 0;
    let expenses = 0;
    for (const t of thisMonth) {
        if (t.type === 'income') income += t.amount;
        else expenses += t.amount;
    }

    let lastMonthExpenses = 0;
    for (const t of lastMonth) {
        if (t.type === 'expense') lastMonthExpenses += t.amount;
    }

    return {
        income,
        expenses,
        balance: income - expenses,
        lastMonthExpenses,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    };
};

export const getCategorySpending = (transactions: Transaction[], categories: CategoryItem[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const spending: Record<string, number> = {};

    for (const t of transactions) {
        if (t.type === 'expense' && new Date(t.date) >= startOfMonth) {
            spending[t.category] = (spending[t.category] || 0) + t.amount;
        }
    }

    return Object.entries(spending)
        .map(([categoryId, amount]) => {
            const dbCat = categories.find(c => c.id === categoryId);
            const config = CATEGORY_CONFIG[categoryId as Category];
            return {
                category: categoryId as Category,
                amount,
                color: dbCat?.color || config?.color || '#6B7280',
                name: dbCat?.name || config?.name || categoryId,
            };
        })
        .sort((a, b) => b.amount - a.amount);
};
