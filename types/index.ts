export type TransactionType = 'income' | 'expense';

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'bills'
  | 'health'
  | 'salary'
  | 'investment'
  | 'gift'
  | 'other'
  | (string & {});

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  sort_order: number;
  synced?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  description: string;
  date: string;
  createdAt: number;
  synced?: boolean;
}

export interface Budget {
  category: Category;
  limit: number;
  spent: number;
  icon?: string;
  color?: string;
  name?: string;
  synced?: boolean;
}

export interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  food: {
    name: 'Food & Dining',
    icon: 'restaurant',
    color: '#FF6B6B',
    bgColor: '#FFE5E5',
  },
  transport: {
    name: 'Transport',
    icon: 'car',
    color: '#4ECDC4',
    bgColor: '#E5F9F6',
  },
  shopping: {
    name: 'Shopping',
    icon: 'cart',
    color: '#A855F7',
    bgColor: '#F3E8FF',
  },
  entertainment: {
    name: 'Entertainment',
    icon: 'game-controller',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  bills: {
    name: 'Bills & Utilities',
    icon: 'receipt',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
  },
  health: {
    name: 'Health',
    icon: 'medkit',
    color: '#10B981',
    bgColor: '#D1FAE5',
  },
  salary: {
    name: 'Salary',
    icon: 'wallet',
    color: '#22C55E',
    bgColor: '#DCFCE7',
  },
  investment: {
    name: 'Investment',
    icon: 'trending-up',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
  gift: {
    name: 'Gift',
    icon: 'gift',
    color: '#EC4899',
    bgColor: '#FCE7F3',
  },
  other: {
    name: 'Other',
    icon: 'ellipsis-horizontal',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
};

export const EXPENSE_CATEGORIES: Category[] = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'health',
  'other',
];

export const INCOME_CATEGORIES: Category[] = [
  'salary',
  'investment',
  'gift',
  'other',
];
