'use client';

import HeroCard from '@/components/HeroCard';
import ExpenseRow from '@/components/ExpenseRow';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { syncDeleteExpense } from '@/lib/sync';

const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

export default function Dashboard() {
  const { recentExpenses, stats, loading, hasFetched } = useExpenseData();
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await syncDeleteExpense(id);
    setSwipedId(null);
  };

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

      {/* Recent Expenses */}
      <div className="mt-4 flex flex-col gap-3 px-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-[20px] text-on-surface">Recent</h2>
          {!showSkeleton && <Link href="/history" className="text-[13px] text-primary font-medium">See all</Link>}
        </div>

        <div className="card overflow-hidden">
          {showSkeleton ? (
            <div className="flex flex-col divide-y divide-border">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-container-high rounded-full" />
                    <div className="flex flex-col gap-2">
                      <div className="w-24 h-4 bg-surface-container-high rounded" />
                      <div className="w-16 h-3 bg-surface-container rounded" />
                    </div>
                  </div>
                  <div className="w-20 h-5 bg-surface-container-high rounded" />
                </div>
              ))}
            </div>
          ) : recentExpenses.length > 0 ? (
            <div className="flex flex-col">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="relative group border-b border-border/50 last:border-0">
                  {/* Delete Overlay */}
                  <div 
                    className={`absolute inset-y-0 right-0 w-[80px] bg-red-500 flex items-center justify-center text-white transition-transform duration-200 z-10 ${swipedId === expense.id ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 size={24} />
                  </div>

                  <div 
                    className={`transition-transform duration-200 bg-surface ${swipedId === expense.id ? '-translate-x-[80px]' : 'translate-x-0'}`}
                    onClick={() => setSwipedId(swipedId === expense.id ? null : expense.id)}
                  >
                    <ExpenseRow 
                      id={expense.id}
                      amount={Number(expense.amount)}
                      category={expense.category}
                      note={expense.note || ''}
                      date={expense.date}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center flex flex-col items-center gap-2">
              <p className="text-on-surface-variant text-[14px]">No expenses yet. Tap + to add your first one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
