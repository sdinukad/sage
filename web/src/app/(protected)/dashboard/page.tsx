'use client';

import HeroCard from '@/components/HeroCard';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import { useMemo } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { Expense } from '@/shared/models';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
const compactFormatter = new Intl.NumberFormat('en-LK', { notation: "compact", maximumFractionDigits: 1 });

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

      {/* Analytics Charts */}
      <div className="mt-4 flex flex-col gap-6 px-4 pb-8">
        
        {/* Combined Category Chart & Breakdown */}
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[18px] text-on-surface">Categories Overview</h2>
          <div className="card p-5 flex flex-col gap-6 bg-surface-container border border-border">
            {showSkeleton ? (
              <div className="flex flex-col gap-4">
                <div className="w-full h-[200px] bg-surface-container-high animate-pulse rounded-full max-w-[200px] mx-auto" />
                <div className="flex flex-col gap-2">
                   {[1,2,3].map(i => <div key={i} className="h-4 w-full bg-surface-container-high animate-pulse rounded" />)}
                </div>
              </div>
            ) : stats.breakdown.length > 0 ? (
              <>
                <div className="relative h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.breakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {stats.breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other']} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number | string | readonly (number | string)[] | undefined) => currencyFormatter.format(Number(Array.isArray(value) ? value[0] : value) || 0)}
                        contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'var(--on-surface)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Total</span>
                    <span className="font-mono text-[16px] text-on-surface font-semibold">
                      {compactFormatter.format(stats.totalThisMonth)}
                    </span>
                  </div>
                </div>

                {/* Breakdown List */}
                <div className="flex flex-col gap-3">
                  {stats.breakdown.map((item) => (
                    <div key={item.category} className="flex justify-between items-center text-[14px]">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Other'] }} 
                        />
                        <span className="text-on-surface-variant font-medium">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[12px] text-on-surface-variant opacity-60 w-8 text-right">
                          {Math.round((item.amount / stats.totalThisMonth) * 100)}%
                        </span>
                        <span className="font-mono text-on-surface font-medium">
                          {currencyFormatter.format(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div className="flex items-center justify-center h-[200px] text-on-surface-variant text-[14px]">
                 No expenses this month
               </div>
            )}
          </div>
        </div>

        {/* Daily Spending Bar Chart */}
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-[18px] text-on-surface">Daily Trend (7 Days)</h2>
          <div className="card h-[260px] p-4 pt-8 bg-surface-container border border-border">
            {showSkeleton ? (
              <div className="w-full h-full bg-surface-container-high animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="displayDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} 
                    dy={10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--surface-container-high)' }}
                    formatter={(value: number | string | readonly (number | string)[] | undefined) => [currencyFormatter.format(Number(Array.isArray(value) ? value[0] : value) || 0), 'Spent']}
                    contentStyle={{ backgroundColor: 'var(--surface-container-highest)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    labelStyle={{ color: 'var(--on-surface-variant)', marginBottom: '4px' }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="var(--primary)" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  >
                    <LabelList 
                      dataKey="amount" 
                      position="top" 
                      formatter={(val: any) => Number(val) > 0 ? compactFormatter.format(Number(val)) : ''} 
                      style={{ fontSize: '10px', fill: 'var(--on-surface-variant)', fontWeight: 500 }} 
                      dy={-4}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
