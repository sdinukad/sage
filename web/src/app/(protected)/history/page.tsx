'use client';

import { useState, useMemo } from 'react';
import { syncDeleteExpense, syncDeleteIncome } from '@/lib/sync';
import { Expense, Income, RecurringTransaction } from '@/shared/models';
import ExpenseRow from '@/components/ExpenseRow';
import FilterPills from '@/components/FilterPills';
import { format, parseISO } from 'date-fns';
import { Trash2, Edit2, ReceiptText } from 'lucide-react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import dynamic from 'next/dynamic';
import RecurringRow from '@/components/RecurringRow';
import { Repeat, ArrowRight } from 'lucide-react';

const ExpenseModal = dynamic(() => import('@/components/ExpenseModal'), {
  ssr: false,
});

import { useSettings } from '@/context/SettingsContext';

export default function HistoryPage() {
  const { expenses: allExpenses, incomes: allIncomes, loading, hasFetched } =
    useExpenseData();
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState<'transactions' | 'recurring'>('transactions');
  const [activeFilter, setActiveFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<
    (Expense | Income | RecurringTransaction) | null
  >(null);
  const { recurringTransactions, deleteRecurring } = useExpenseData();

  const allData = useMemo(() => {
    const exps = allExpenses.map((e) => ({ ...e, type: 'expense' as const }));
    const incs = allIncomes.map((i) => ({ ...i, type: 'income' as const }));
    return [...exps, ...incs].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // Secondary sort by created_at (most recent first)
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [allExpenses, allIncomes]);

  const showSkeleton = loading && !hasFetched;

  const filteredData = useMemo(() => {
    let result = allData;
    if (activeFilter !== 'All') {
      result = result.filter((e) => e.category === activeFilter);
    }
    if (startDate) result = result.filter((e) => e.date >= startDate);
    if (endDate) result = result.filter((e) => e.date <= endDate);
    return result;
  }, [allData, activeFilter, startDate, endDate]);

  const handleDelete = async (id: string, type: 'expense' | 'income') => {
    if (type === 'expense') await syncDeleteExpense(id);
    else await syncDeleteIncome(id);
    setSwipedId(null);
  };

  const groupedData = useMemo(() => {
    const groups: Record<
      string,
      { total: number; items: (Expense & { type: 'expense' | 'income' })[] }
    > = {};

    filteredData.forEach((item) => {
      const monthYear = format(parseISO(item.date), 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = { total: 0, items: [] };
      }
      groups[monthYear].items.push(item);
      const val = Number(item.base_amount || item.amount);
      if (item.type === 'expense') {
        groups[monthYear].total -= val;
      } else {
        groups[monthYear].total += val;
      }
    });

    return Object.entries(groups).sort(
      (a, b) =>
        new Date(b[1].items[0].date).getTime() -
        new Date(a[1].items[0].date).getTime()
    );
  }, [filteredData]);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* ── Page heading ── */}
      <div className="px-4 lg:px-8 pt-4 lg:pt-8 pb-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[24px] lg:text-[26px] font-semibold text-on-surface">
            History
          </h1>
          <p className="hidden lg:block text-[13px] text-on-surface-variant mt-0.5">
            All transactions, latest first
          </p>
        </div>
        <div
          className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--surface-container)',
            color: 'var(--on-surface-variant)',
          }}
        >
          {activeTab === 'transactions' ? `${filteredData.length} entries` : `${recurringTransactions.length} templates`}
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="px-4 lg:px-8 mb-4">
        <div className="flex p-1 bg-surface-container border border-surface-variant/30 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-2 text-[14px] font-semibold rounded-xl transition-all duration-200 ${
              activeTab === 'transactions'
                ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-6 py-2 text-[14px] font-semibold rounded-xl transition-all duration-200 ${
              activeTab === 'recurring'
                ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Recurring
          </button>
        </div>
      </div>

      {activeTab === 'transactions' ? (
        <>
          {/* ── Filters strip ── */}
          <div
            className="sticky top-0 lg:top-0 z-30 backdrop-blur-md pb-2"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--background) 96%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
            }}
          >
            <FilterPills activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            {/* Date range */}
            <div className="px-4 lg:px-8 pt-1 pb-1 flex items-center gap-2">
              <input
                type="text"
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = 'text';
                }}
                placeholder="Start date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 max-w-[180px] input-field py-2 text-[13.5px] rounded-lg"
                title="Start Date"
              />
              <span className="text-on-surface-variant">—</span>
              <input
                type="text"
                onFocus={(e) => (e.target.type = 'date')}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = 'text';
                }}
                placeholder="End date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 max-w-[180px] input-field py-2 text-[13.5px] rounded-lg"
                title="End Date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-[12px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--primary)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Transaction list ── */}
          <div className="flex-1 px-4 lg:px-8 py-6">
            {showSkeleton ? (
              <div className="flex flex-col gap-8 animate-pulse">
                {[1, 2].map((i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="flex justify-between px-1">
                      <div className="h-6 w-32 bg-surface-container-high rounded-md" />
                      <div className="h-4 w-20 bg-surface-container rounded-md" />
                    </div>
                    <div className="card h-[160px] bg-surface-container" />
                  </div>
                ))}
              </div>
            ) : groupedData.length > 0 ? (
              <div className="flex flex-col gap-8 max-w-5xl">
                {groupedData.map(([monthYear, { total, items }]) => (
                  <div key={monthYear} className="flex flex-col gap-2.5">
                    {/* Month header */}
                    <div className="flex items-center justify-between px-1">
                      <h2 className="font-serif text-[18px] font-semibold text-on-surface">
                        {monthYear}
                      </h2>
                      <span
                        className="font-mono text-[13px] font-semibold px-2.5 py-1 rounded-full"
                        style={{
                          color: total >= 0 ? '#16a34a' : 'var(--on-surface-variant)',
                          backgroundColor: total >= 0
                            ? 'rgba(22, 163, 74, 0.1)'
                            : 'var(--surface-container)',
                        }}
                      >
                        {total >= 0 ? '+' : ''}{formatCurrency(total)}
                      </span>
                    </div>

                    {/* Transaction card */}
                    <div
                      className="overflow-hidden rounded-2xl"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                      }}
                    >
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="relative overflow-hidden"
                          style={{
                            borderTop: idx > 0
                              ? '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)'
                              : 'none',
                          }}
                        >
                          {/* Swipe action overlay */}
                          <div
                            className={`absolute inset-y-0 right-0 w-[160px] flex transition-transform duration-200 z-10 ${
                              swipedId === item.id
                                ? 'translate-x-0'
                                : 'translate-x-full'
                            }`}
                          >
                            <div
                              className="w-1/2 flex items-center justify-center text-white cursor-pointer transition-colors"
                              style={{ backgroundColor: '#3b82f6' }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = '#2563eb')
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = '#3b82f6')
                              }
                              onClick={() => {
                                setEditingItem(item);
                                setSwipedId(null);
                              }}
                            >
                              <Edit2 size={22} strokeWidth={2} />
                            </div>
                            <div
                              className="w-1/2 flex items-center justify-center text-white cursor-pointer transition-colors"
                              style={{ backgroundColor: 'var(--error)' }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.opacity = '0.85')
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.opacity = '1')
                              }
                              onClick={() => handleDelete(item.id, item.type)}
                            >
                              <Trash2 size={22} strokeWidth={2} />
                            </div>
                          </div>

                          {/* Row */}
                          <div
                            className={`transition-transform duration-200 ${
                              swipedId === item.id
                                ? '-translate-x-[160px]'
                                : 'translate-x-0'
                            }`}
                            onClick={() =>
                              setSwipedId(swipedId === item.id ? null : item.id)
                            }
                          >
                            <ExpenseRow
                              id={item.id}
                              amount={Number(item.amount)}
                              currency={item.currency}
                              base_amount={item.base_amount}
                              base_currency={item.base_currency}
                              category={item.category}
                              note={item.note || ''}
                              date={item.date}
                              type={item.type}
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
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1"
                  style={{
                    backgroundColor: 'var(--surface-container)',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  <ReceiptText size={28} strokeWidth={1.5} />
                </div>
                <p className="font-medium text-on-surface text-[15px]">
                  No transactions found
                </p>
                <p className="text-on-surface-variant text-[13px]">
                  Try changing your filters or date range
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 px-4 lg:px-8 py-4">
          {recurringTransactions.length > 0 ? (
            <div className="max-w-5xl">
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <h2 className="font-serif text-[18px] font-semibold text-on-surface">
                    Managed Recurring Transactions
                  </h2>
                  <p className="text-[13px] text-on-surface-variant">
                    Manage your subscriptions and recurring plans here. Changes will apply to future entries.
                  </p>
                </div>
              </div>
              
              <div 
                className="overflow-hidden rounded-2xl border bg-surface"
                style={{
                  borderColor: 'color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                }}
              >
                {recurringTransactions.map((recurring) => (
                  <div 
                    key={recurring.id}
                    className="border-b last:border-none"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--outline-variant) 30%, transparent)',
                    }}
                  >
                    <RecurringRow
                      recurring={recurring}
                      onEdit={(r) => setEditingItem(r)}
                      onDelete={(id) => deleteRecurring(id)}
                      isSwiped={swipedId === recurring.id}
                      onSwipe={(id) => setSwipedId(id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4 px-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1 bg-surface-container text-on-surface-variant"
              >
                <Repeat size={28} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-medium text-on-surface text-[16px]">
                  No recurring transactions yet
                </p>
                <p className="text-on-surface-variant text-[13px] max-w-xs mx-auto">
                  Set up a recurring expense or income in the chat to see it managed here.
                </p>
              </div>
              <button 
                onClick={() => (window.location.href = '/chat')}
                className="mt-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Go to Chat <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <ExpenseModal
        isOpen={!!editingItem}
        initialData={editingItem}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}
