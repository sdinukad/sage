'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/shared/models';
import CategoryBadge from '@/components/CategoryBadge';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Trash2, Filter, Calendar } from 'lucide-react';

const categories = ['All', 'Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other'];

export default function HistoryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const fetchExpenses = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const date = new Date(selectedMonth + '-01');
    const start = startOfMonth(date).toISOString().split('T')[0];
    const end = endOfMonth(date).toISOString().split('T')[0];

    let query = supabase
      .from('expenses')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (categoryFilter !== 'All') {
      query = query.eq('category', categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, selectedMonth]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      setExpenses(expenses.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
          <p className="text-gray-500">Review and manage all your past expenses.</p>
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
            <Filter size={12} /> Category
          </label>
          <select
            className="input-field"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
            <Calendar size={12} /> Month
          </label>
          <input
            type="month"
            className="input-field"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </td>
                  </tr>
                ))
              ) : expenses.length > 0 ? (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{expense.note || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={expense.category} />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white text-right">
                      ${Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                    No transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
