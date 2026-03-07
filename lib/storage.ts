// This file is deprecated. All storage has moved to supabase-storage.ts
// We keep empty exports here to prevent breaking any accidental imports during transition.

import { Transaction, Budget, Category } from '../types';

export const generateId = (): string => "";
export const getTransactions = async (): Promise<Transaction[]> => [];
export const saveTransactions = async (transactions: Transaction[]): Promise<void> => { };
export const addTransaction = async (transaction: any): Promise<any> => null;
export const deleteTransaction = async (id: string): Promise<void> => { };
export const getBudgets = async (): Promise<Budget[]> => [];
export const saveBudgets = async (budgets: Budget[]): Promise<void> => { };
export const updateBudget = async (category: Category, limit: number): Promise<void> => { };
export const calculateBudgetSpending = async (): Promise<Budget[]> => [];
export const getMonthlyStats = (transactions: Transaction[]) => ({
  income: 0,
  expenses: 0,
  balance: 0,
  lastMonthExpenses: 0,
  savingsRate: 0,
});
export const getCategorySpending = (transactions: Transaction[]) => [];
export const seedDemoData = async (): Promise<void> => { };
