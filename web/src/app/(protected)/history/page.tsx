'use client';

import { useState, useMemo } from 'react';
import { syncDeleteExpense } from '@/lib/sync';
import { Expense } from '@/shared/models';
import ExpenseRow from '@/components/ExpenseRow';
import FilterPills from '@/components/FilterPills';
import { format, parseISO } from 'date-fns';
import { Trash2, Edit2 } from 'lucide-react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import dynamic from 'next/dynamic';

const ExpenseModal = dynamic(() => import('@/components/ExpenseModal'), { ssr: false });

const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });

export default function HistoryPage() {
  const { expenses: allExpenses, loading, hasFetched, refreshData } = useExpenseData();
  const [activeFilter, setActiveFilter] = useState('All');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Only show skeletons on the very first load before any data arrives
  const showSkeleton = loading && !hasFetched;

  // Filter expenses locally
  const filteredExpenses = useMemo(() => {
    if (activeFilter === 'All') return allExpenses;
    return allExpenses.filter(e => e.category === activeFilter);
  }, [allExpenses, activeFilter]);

  const handleDelete = async (id: string) => {
    await syncDeleteExpense(id);
    setSwipedId(null);
  };

  // Grouping logic
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { total: number; items: Expense[] }> = {};
    
    filteredExpenses.forEach(exp => {
      const monthYear = format(parseISO(exp.date), 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = { total: 0, items: [] };
      }
      groups[monthYear].items.push(exp);
      groups[monthYear].total += Number(exp.amount);
    });
    
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[1].items[0].date).getTime() - new Date(a[1].items[0].date).getTime();
    });
  }, [filteredExpenses]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 h-[64px] flex items-center justify-between border-b border-border">
        <h1 className="font-serif text-[24px] font-semibold text-on-surface">History</h1>
        <div className="text-[12px] text-on-surface-variant font-medium uppercase tracking-wider">
          {filteredExpenses.length} Total
        </div>
      </header>

      {/* Filter Bar */}
      <FilterPills activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* Expense List */}
      <div className="flex-1 px-4 py-6 pb-24">
        {showSkeleton ? (
          <div className="flex flex-col gap-8 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex justify-between px-1">
                  <div className="h-6 w-32 bg-surface-container-high rounded-md" />
                  <div className="h-4 w-20 bg-surface-container rounded-md" />
                </div>
                <div className="card h-[160px] bg-surface-container border-border" />
              </div>
            ))}
          </div>
        ) : groupedExpenses.length > 0 ? (
          <div className="flex flex-col gap-8">
            {groupedExpenses.map(([monthYear, { total, items }]) => (
              <div key={monthYear} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-serif text-[18px] text-on-surface">{monthYear}</h2>
                  <span className="font-mono text-[14px] text-on-surface-variant font-medium">
                    {currencyFormatter.format(total)}
                  </span>
                </div>
                
                <div className="card overflow-hidden divide-y divide-border/50">
                  {items.map((expense) => (
                    <div key={expense.id} className="relative group overflow-hidden">
                      {/* Actions Overlay */}
                      <div 
                        className={`absolute inset-y-0 right-0 w-[160px] flex transition-transform duration-200 z-10 ${swipedId === expense.id ? 'translate-x-0' : 'translate-x-full'}`}
                      >
                        <div 
                          className="w-1/2 bg-blue-500 flex items-center justify-center text-white cursor-pointer hover:bg-blue-600 transition-colors"
                          onClick={() => {
                            setEditingExpense(expense);
                            setSwipedId(null);
                          }}
                        >
                          <Edit2 size={24} />
                        </div>
                        <div 
                          className="w-1/2 bg-red-500 flex items-center justify-center text-white cursor-pointer hover:bg-red-600 transition-colors"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 size={24} />
                        </div>
                      </div>

                      <div 
                        className={`transition-transform duration-200 bg-surface ${swipedId === expense.id ? '-translate-x-[160px]' : 'translate-x-0'}`}
                        onClick={() => setSwipedId(swipedId === expense.id ? null : expense.id)}
                      >
                        <ExpenseRow 
                          id={expense.id}
                          amount={Number(expense.amount)}
                          category={expense.category}
                          note={expense.note || ''}
                          date={expense.date}
                          showFullDate={true}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-60">
            <div className="w-16 h-16 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container mb-2">
              <Trash2 size={32} />
            </div>
            <p className="text-on-surface-variant text-[14px] font-medium">No expenses found</p>
          </div>
        )}
      </div>

      <ExpenseModal 
        isOpen={!!editingExpense} 
        initialData={editingExpense} 
        onClose={() => setEditingExpense(null)} 
      />
    </div>
  );
}
