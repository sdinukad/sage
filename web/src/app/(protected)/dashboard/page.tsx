'use client';

import HeroCard from '@/components/HeroCard';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import { useMemo } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { Expense } from '@/shared/models';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

export default function Dashboard() {
  const { expenses, stats, loading, hasFetched } = useExpenseData();

  // Compute daily spending for the last 7 days
  const dailyData = useMemo(() => {
    const data: { date: string; displayDate: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = format(d, 'yyyy-MM-dd');
      data.push({
        date: dateString,
        displayDate: format(d, 'EEE'), // e.g., Mon, Tue
        amount: 0
      });
    }

    expenses.forEach((exp: Expense) => {
      const entry = data.find(d => d.date === exp.date);
      if (entry) {
        entry.amount += Number(exp.amount);
      }
    });
    
    return data;
  }, [expenses]);

  // Only show skeletons on the very first load before any data arrives
  const showSkeleton = loading && !hasFetched;

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      {showSkeleton ? (
        <div className="w-full bg-surface-container rounded-b-[24px] h-[196px] animate-pulse flex flex-col px-6 pt-6 pb-8 gap-4 shadow-lg">
          <div className="flex flex-col gap-2">
            <div className="w-20 h-3 bg-white/10 rounded-full" />
            <div className="w-56 h-12 bg-white/10 rounded-lg mt-1" />
          </div>
          <div className="flex gap-2 mt-4 pt-2">
            <div className="w-28 h-6 bg-white/10 rounded-full" />
            <div className="w-20 h-6 bg-white/10 rounded-full" />
            <div className="w-24 h-6 bg-white/10 rounded-full" />
          </div>
        </div>
      ) : (
        <HeroCard 
          amount={stats.totalThisMonth}
          vsLastMonth={stats.vsLastMonth}
          expenseCount={stats.expenseCount}
          topCategory={stats.topCategory}
        />
      )}

      {/* Spending Breakdown */}
      <div className="mt-4 flex flex-col gap-3">
        <h2 className="font-serif text-[20px] text-on-surface px-4">Breakdown</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2 snap-x">
          {showSkeleton ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="card min-w-[100px] h-[80px] bg-surface-container animate-pulse border border-border" />
            ))
          ) : (
            stats.breakdown.map((item) => (
              <div 
                key={item.category}
                className="card min-w-[100px] h-[80px] flex flex-col items-center justify-center flex-shrink-0 snap-start"
              >
                <div 
                  className="w-3 h-3 rounded-full mb-1.5" 
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'] }} 
                />
                <span className="text-[12px] text-on-surface-variant">{item.category}</span>
                <span className="font-mono text-[14px] text-on-surface font-medium">
                  {currencyFormatter.format(item.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="mt-6 flex flex-col gap-6 px-4 pb-8">
        
        {/* Category Pie Chart */}
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[18px] text-on-surface">Category Spending</h2>
          <div className="card h-[220px] p-4 flex flex-col pt-6 pb-6 bg-surface-container border border-border">
            {showSkeleton ? (
              <div className="w-full h-full bg-surface-container-high animate-pulse rounded-full max-w-[140px] mx-auto" />
            ) : stats.breakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.breakdown}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {stats.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other']} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => currencyFormatter.format(value)}
                    contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--on-surface)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-on-surface-variant text-[14px]">
                 No expenses this month
               </div>
            )}
          </div>
        </div>

        {/* Last 7 Days Bar Chart */}
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[18px] text-on-surface">Last 7 Days</h2>
          <div className="card h-[220px] p-4 pt-6 bg-surface-container border border-border">
            {showSkeleton ? (
              <div className="w-full h-full bg-surface-container-high animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} 
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--surface-container-high)' }}
                    formatter={(value: number) => [currencyFormatter.format(value), 'Spent']}
                    contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="var(--primary)" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
