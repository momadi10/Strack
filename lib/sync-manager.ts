import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
    getOfflineTransactions,
    clearOfflineTransactions,
    getOfflineBudgets,
    clearOfflineBudgets,
    getOfflineCategories,
    clearOfflineCategories
} from './offline-storage';
import { addTransaction, addCategory, updateBudget } from './supabase-storage';

let activeSyncPromise: Promise<void> | null = null;

export const syncOfflineData = async () => {
    if (activeSyncPromise) return activeSyncPromise;

    activeSyncPromise = (async () => {
        const state = await NetInfo.fetch();
        if (!state.isConnected) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            // 1. Sync Categories First
            const offlineCategories = await getOfflineCategories();
            if (offlineCategories.length > 0) {
                await clearOfflineCategories();
                for (const cat of offlineCategories) {
                    try {
                        const { id, synced, ...catData } = cat;
                        await addCategory(catData, id, true);
                    } catch (e) {
                        console.error('Error syncing category', e);
                    }
                }
            }

            // 2. Sync Transactions
            const offlineTransactions = await getOfflineTransactions();
            if (offlineTransactions.length > 0) {
                await clearOfflineTransactions();
                for (const t of offlineTransactions) {
                    try {
                        const { id, synced, createdAt, ...tData } = t;
                        // Passing 'id' is key! The database will reject duplicates
                        await addTransaction({ ...tData, id }, true);
                    } catch (e) {
                        console.error('Error syncing transaction', e);
                    }
                }
            }

            // 3. Sync Budgets
            const offlineBudgets = await getOfflineBudgets();
            if (offlineBudgets.length > 0) {
                await clearOfflineBudgets();
                for (const b of offlineBudgets) {
                    try {
                        await updateBudget(b.category, b.limit, true);
                    } catch (e) {
                        console.error('Error syncing budget', e);
                    }
                }
            }
        } finally {
            // Sync logic finished
        }
    })();

    try {
        await activeSyncPromise;
    } finally {
        activeSyncPromise = null;
    }
};

export const setupSyncManager = (onSyncComplete: () => void) => {
    // Listen for connection changes
    return NetInfo.addEventListener(state => {
        if (state.isConnected) {
            syncOfflineData().then(onSyncComplete);
        }
    });
};
