'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense, Income } from '@/shared/models';
import { useAuth } from './AuthContext';

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
  stats: DashboardStats;
  loading: boolean;
  hasFetched: boolean;
  refreshData: () => Promise<void>;
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
  stats: defaultStats,
  loading: true,
  hasFetched: false,
  refreshData: async () => {},
});

export const ExpenseDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchAllData = useCallback(async () => {
    if (!user) return;

    // Only show loading spinner on the very first fetch
    if (!hasFetchedRef.current) {
      setLoading(true);
    }

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [allExpRes, monthStatsRes, incRes] = await Promise.all([
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('category, amount, date').gte('date', startOfLastMonth.toISOString().split('T')[0]),
        supabase.from('incomes').select('*').order('date', { ascending: false }),
      ]);

      if (allExpRes.data) {
        setExpenses(allExpRes.data);
        setRecentExpenses(allExpRes.data.slice(0, 10));
      }
      if (incRes.data) setIncomes(incRes.data);

      if (monthStatsRes.data) {
        const thisMonthStr = startOfMonth.toISOString().split('T')[0];
        
        const thisMonthData = monthStatsRes.data.filter(e => e.date >= thisMonthStr);
        const lastMonthData = monthStatsRes.data.filter(e => e.date < thisMonthStr);

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

        setStats({
          totalThisMonth: monthTotal,
          vsLastMonth,
          expenseCount: thisMonthData.length,
          topCategory,
          breakdown: [
            { category: 'All', amount: monthTotal },
            ...sortedCategories.map(([category, amount]) => ({ category, amount })),
          ],
        });
      }
    } catch (err) {
      console.error('ExpenseDataContext Fetch Error:', err);
    } finally {
      setLoading(false);
      hasFetchedRef.current = true;
      setHasFetched(true);
    }
  }, [user]); // Only depends on user — stable callback

  // Fetch when user becomes available
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Listen for expense-added events (from AddExpenseModal / chat)
  useEffect(() => {
    const handleExpenseAdded = () => fetchAllData();
    window.addEventListener('expense-added', handleExpenseAdded);
    return () => window.removeEventListener('expense-added', handleExpenseAdded);
  }, [fetchAllData]);

  const value = useMemo(() => ({
    expenses,
    recentExpenses,
    incomes,
    stats,
    loading,
    hasFetched,
    refreshData: fetchAllData,
  }), [expenses, recentExpenses, incomes, stats, loading, hasFetched, fetchAllData]);

  return (
    <ExpenseDataContext.Provider value={value}>
      {children}
    </ExpenseDataContext.Provider>
  );
};

export const useExpenseData = () => useContext(ExpenseDataContext);
