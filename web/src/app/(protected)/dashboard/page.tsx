'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/shared/models';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Receipt, TrendingUp } from 'lucide-react';
import CategoryBadge from '@/components/CategoryBadge';
import AddExpenseModal from '@/components/AddExpenseModal';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#f97316', '#ef4444', '#a855f7', '#ec4899', '#6366f1', '#6b7280'];

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch this month's total and recent expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: recentData } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (recentData) setExpenses(recentData);

    // Fetch category breakdown for chart
    const { data: chartRaw } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    if (chartRaw) {
      const totals: Record<string, number> = {};
      let monthTotal = 0;
      chartRaw.forEach((exp) => {
        totals[exp.category] = (totals[exp.category] || 0) + Number(exp.amount);
        monthTotal += Number(exp.amount);
      });
      setChartData(Object.entries(totals).map(([name, value]) => ({ name, value })));
      setTotalThisMonth(monthTotal);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500">Track and manage your expenses effortlessly.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 sm:px-6"
        >
          <Plus size={20} />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Spending */}
        <div className="card md:col-span-1 flex flex-col justify-center items-center space-y-2 py-10">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total this month</p>
          <p className="text-5xl font-bold text-[#16a34a]">
            ${totalThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
            <TrendingUp size={16} />
            <span>Updated just now</span>
          </div>
        </div>

        {/* Expenses by Category Chart */}
        <div className="card md:col-span-2 relative h-64 md:h-auto">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          {loading ? (
            <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
          ) : chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 italic">
              No data for this month yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="text-gray-400" size={20} />
            Recent Expenses
          </h2>
          <a href="/history" className="text-sm text-[#16a34a] font-medium hover:underline">View all</a>
        </div>

        <div className="space-y-4">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
            ))
          ) : expenses.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {expenses.map((expense) => (
                <div key={expense.id} className="py-4 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">${Number(expense.amount).toFixed(2)}</span>
                      <CategoryBadge category={expense.category} />
                    </div>
                    {expense.note && <p className="text-sm text-gray-500">{expense.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400 italic">
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>

      <AddExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchData();
        }} 
      />
    </div>
  );
}
