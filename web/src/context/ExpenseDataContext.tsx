'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Expense, Income } from '@/shared/models';
import { useAuth } from './AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalCategory } from '@/lib/localdb';
import { pullRemoteData, syncAddCategory, syncDeleteCategory } from '@/lib/sync';

interface DashboardStats {
  totalThisMonth: number;
  vsLastMonth: string;
  expenseCount: number;
  topCategory: string;
  breakdown: { category: string; amount: number }[];
}

interface ExpenseDataContextType {
  expenses: Expense[];
  recentExpenses: Expense[];
  incomes: Income[];
  categories: LocalCategory[];
  stats: DashboardStats;
  loading: boolean;
  hasFetched: boolean;
  refreshData: () => Promise<void>;
  addCategory: (name: string, type: 'expense' | 'income', color?: string, ai_hints?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const defaultStats: DashboardStats = {
  totalThisMonth: 0,
  vsLastMonth: '+0%',
  expenseCount: 0,
  topCategory: 'None',
  breakdown: [],
};

const ExpenseDataContext = createContext<ExpenseDataContextType>({
  expenses: [],
  recentExpenses: [],
  incomes: [],
  categories: [],
  stats: defaultStats,
  loading: true,
  hasFetched: false,
  refreshData: async () => {},
  addCategory: async () => {},
  deleteCategory: async () => {},
});

export const ExpenseDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Real-time Dexie subscriptions: gives 0ms latency after first ever load / offline mode
  const localExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray());
  const localIncomes = useLiveQuery(() => db.incomes.orderBy('date').reverse().toArray());
  const localCategories = useLiveQuery(() => db.categories.toArray());

  const expenses = useMemo(() => {
    const all = (localExpenses || []) as Expense[];
    return all.filter(e => (e as Expense & { sync_status?: string }).sync_status !== 'pending_delete');
  }, [localExpenses]);
  const incomes = useMemo(() => (localIncomes || []) as Income[], [localIncomes]);
  const categories = useMemo(() => {
    const all = (localCategories || []) as LocalCategory[];
    return all.filter(c => c.sync_status !== 'pending_delete');
  }, [localCategories]);
  const recentExpenses = useMemo(() => expenses.slice(0, 10), [expenses]);
  
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchSupabaseBackground = useCallback(async () => {
    if (!user) return;

    if (!hasFetchedRef.current) {
      setLoading(true);
    }

    try {
      await pullRemoteData();
      
      // Seed default categories if user has NONE (neither in Supabase nor Local)
      const currentCats = await db.categories.count();
      if (currentCats === 0) {
        const defaults: Omit<LocalCategory, 'sync_status'>[] = [
          { id: crypto.randomUUID(), user_id: user.id, name: 'Food', type: 'expense', color: '#ff9f43', ai_hints: 'food, lunch, dinner, breakfast, restaurant, takeaway, delivery, pizza, burger, rice, kottu, string hoppers, snacks, coffee, cafe, meal, eat' },
          { id: crypto.randomUUID(), user_id: user.id, name: 'Transport', type: 'expense', color: '#54a0ff', ai_hints: 'uber, grab, taxi, bus, train, fuel, petrol, gas, parking, toll, transport, ride, commute, drive' },
          { id: crypto.randomUUID(), user_id: user.id, name: 'Bills', type: 'expense', color: '#ee5253', ai_hints: 'bill, electricity, water, internet, phone, rent, insurance, subscription, netflix, spotify' },
          { id: crypto.randomUUID(), user_id: user.id, name: 'Salary', type: 'income', color: '#4a7c59', ai_hints: 'salary, pay, paycheck, wage, income' },
          { id: crypto.randomUUID(), user_id: user.id, name: 'Other', type: 'expense', color: '#8395a7', ai_hints: 'miscellaneous, unknown, other' },
        ];
        for (const cat of defaults) {
          await syncAddCategory(cat);
        }
      }

    } catch (err) {
      console.error('Local Sync Error:', err);
    } finally {
      if (hasFetchedRef.current === false) setLoading(false);
      hasFetchedRef.current = true;
      setHasFetched(true);
    }
  }, [user]);

  // Automatically fetch remote changes when app mounts & user logs in
  useEffect(() => {
    if (user) {
      fetchSupabaseBackground();
    }
  }, [user, fetchSupabaseBackground]);

  const addCategory = useCallback(async (name: string, type: 'expense' | 'income', color?: string, ai_hints?: string) => {
    if (!user) return;
    await syncAddCategory({
      id: crypto.randomUUID(),
      user_id: user.id,
      name,
      type,
      color: color || '#8395a7',
      ai_hints
    });
  }, [user]);

  const deleteCategory = useCallback(async (id: string) => {
    await syncDeleteCategory(id);
  }, []);

  // Compute stats synchronously from local DB updates
  const stats = useMemo(() => {
    if (expenses.length === 0) return defaultStats;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStr = startOfMonth.toISOString().split('T')[0];
        
    const thisMonthData = expenses.filter(e => e.date >= thisMonthStr);
    const lastMonthData = expenses.filter(e => e.date < thisMonthStr);

    const totals: Record<string, number> = {};
    let monthTotal = 0;
    thisMonthData.forEach((exp) => {
      const amt = Number(exp.amount);
      totals[exp.category] = (totals[exp.category] || 0) + amt;
      monthTotal += amt;
    });

    const lastMonthTotal = lastMonthData.reduce((acc, exp) => acc + Number(exp.amount), 0);
    const vsLastMonth = lastMonthTotal > 0
      ? `${Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)}%`
      : '+100%';

    const sortedCategories = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0]?.[0] || 'None';

    return {
      totalThisMonth: monthTotal,
      vsLastMonth,
      expenseCount: thisMonthData.length,
      topCategory,
      breakdown: [
        { category: 'All', amount: monthTotal },
        ...sortedCategories.map(([category, amount]) => ({ category, amount })),
      ],
    };
  }, [expenses]);

  const value = useMemo(() => ({
    expenses,
    recentExpenses,
    incomes,
    categories,
    stats,
    // If we have offline cache, don't block UI with loading
    loading: loading && expenses.length === 0, 
    hasFetched: hasFetched || expenses.length > 0,
    refreshData: fetchSupabaseBackground,
    addCategory,
    deleteCategory
  }), [expenses, recentExpenses, incomes, categories, stats, loading, hasFetched, fetchSupabaseBackground, addCategory, deleteCategory]);

  return (
    <ExpenseDataContext.Provider value={value}>
      {children}
    </ExpenseDataContext.Provider>
  );
};

export const useExpenseData = () => useContext(ExpenseDataContext);
