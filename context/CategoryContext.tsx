import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CategoryItem, TransactionType } from '../types';
import { getCategories as fetchCategoriesFromDb } from '../lib/supabase-storage';
import { supabase } from '../lib/supabase';

interface CategoryContextType {
    categories: CategoryItem[];
    expenseCategories: CategoryItem[];
    incomeCategories: CategoryItem[];
    refreshCategories: () => Promise<void>;
    isLoading: boolean;
    getCategoryById: (id: string) => CategoryItem | undefined;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const allCategories = await fetchCategoriesFromDb();
            setCategories(allCategories);
        } catch (error) {
            console.error('Error refreshing categories:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshCategories();

        // Set up a listener for auth changes to re-fetch categories
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            refreshCategories();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshCategories]);

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    const getCategoryById = (id: string) => {
        return categories.find(c => c.id === id);
    };

    return (
        <CategoryContext.Provider
            value={{
                categories,
                expenseCategories,
                incomeCategories,
                refreshCategories,
                isLoading,
                getCategoryById,
            }}
        >
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategories = () => {
    const context = useContext(CategoryContext);
    if (context === undefined) {
        throw new Error('useCategories must be used within a CategoryProvider');
    }
    return context;
};
