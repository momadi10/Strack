-- SpendTrack Database Schema
-- Last Updated: 2026-03-07

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    category TEXT NOT NULL,
    limit DECIMAL(12,2) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, category)
);

-- 5. RLS (Row Level Security) Policies
-- Enable RLS for all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Users can manage their own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can manage their own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can manage their own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id);

-- 6. Helper Function to seed default categories for new users
-- This function can be called via a trigger or manually to provide initial popular categories
CREATE OR REPLACE FUNCTION public.seed_default_categories(target_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.categories (id, name, icon, color, type, sort_order, user_id)
    VALUES 
        ('food', 'Food & Dining', 'restaurant', '#FF6B6B', 'expense', 0, target_user_id),
        ('transport', 'Transport', 'car', '#4ECDC4', 'expense', 1, target_user_id),
        ('shopping', 'Shopping', 'cart', '#A855F7', 'expense', 2, target_user_id),
        ('entertainment', 'Entertainment', 'game-controller', '#F59E0B', 'expense', 3, target_user_id),
        ('bills', 'Bills & Utilities', 'receipt', '#3B82F6', 'expense', 4, target_user_id),
        ('health', 'Health', 'medkit', '#10B981', 'expense', 5, target_user_id),
        ('salary', 'Salary', 'wallet', '#22C55E', 'income', 6, target_user_id),
        ('investment', 'Investment', 'trending-up', '#8B5CF6', 'income', 7, target_user_id),
        ('gift', 'Gift', 'gift', '#EC4899', 'income', 8, target_user_id),
        ('other', 'Other', 'ellipsis-horizontal', '#6B7280', 'expense', 9, target_user_id)
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
