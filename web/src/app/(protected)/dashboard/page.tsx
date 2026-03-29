'use client';

import HeroCard from '@/components/HeroCard';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import { useMemo } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { Expense } from '@/shared/models';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
});
const compactFormatter = new Intl.NumberFormat('en-LK', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export default function Dashboard() {
  const { expenses, stats, loading, hasFetched } = useExpenseData();

  const dailyData = useMemo(() => {
    const data: { date: string; displayDate: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = format(d, 'yyyy-MM-dd');
      data.push({
        date: dateString,
        displayDate: format(d, 'EEE'),
        amount: 0,
      });
    }
    expenses.forEach((exp: Expense) => {
      const entry = data.find((d) => d.date === exp.date);
      if (entry) entry.amount += Number(exp.amount);
    });
    return data;
  }, [expenses]);

  const showSkeleton = loading && !hasFetched;

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      {showSkeleton ? (
        <div className="mx-4 mt-6 mb-4 rounded-2xl h-[188px] skeleton" />
      ) : (
        <HeroCard
          amount={stats.totalThisMonth}
          vsLastMonth={stats.vsLastMonth}
          expenseCount={stats.expenseCount}
          topCategory={stats.topCategory}
        />
      )}

      {/* ── Charts section ── */}
      <div className="mt-2 px-4 lg:px-8 pb-10">
        {/* Desktop section heading */}
        <div className="mb-6 hidden lg:block">
          <h1 className="font-serif text-[26px] font-semibold text-on-surface">Dashboard</h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Your finances at a glance
          </p>
        </div>

        {/* Mobile section heading */}
        <div className="mb-4 lg:hidden">
          <h1 className="font-serif text-[20px] font-semibold text-on-surface">Overview</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* ── Category Overview ── */}
          <div className="flex flex-col gap-2">
            <h2 className="font-medium text-[14px] text-on-surface-variant px-0.5">
              Spending by Category
            </h2>
            <div
              className="p-5 flex flex-col gap-6 rounded-2xl h-full"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              }}
            >
              {showSkeleton ? (
                <div className="flex flex-col gap-4">
                  <div className="w-[160px] h-[160px] skeleton rounded-full mx-auto" />
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 w-full skeleton rounded" />
                    ))}
                  </div>
                </div>
              ) : stats.breakdown.length > 0 ? (
                <>
                  <div className="relative h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.breakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={82}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {stats.breakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                CATEGORY_COLORS[entry.category] ||
                                CATEGORY_COLORS['Other']
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(
                            value:
                              | number
                              | string
                              | readonly (number | string)[]
                              | undefined
                          ) =>
                            currencyFormatter.format(
                              Number(
                                Array.isArray(value) ? value[0] : value
                              ) || 0
                            )
                          }
                          contentStyle={{
                            backgroundColor: 'var(--surface-container-highest)',
                            border: '1px solid var(--outline-variant)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          }}
                          itemStyle={{ color: 'var(--on-surface)' }}
                          labelStyle={{ color: 'var(--on-surface-variant)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold opacity-60">
                        Total
                      </span>
                      <span className="font-mono text-[17px] text-on-surface font-bold mt-0.5">
                        {compactFormatter.format(stats.totalThisMonth)}
                      </span>
                    </div>
                  </div>

                  {/* Breakdown list */}
                  <div className="flex flex-col gap-3">
                    {stats.breakdown.map((item) => {
                      const pct = Math.round(
                        (item.amount / stats.totalThisMonth) * 100
                      );
                      return (
                        <div
                          key={item.category}
                          className="flex justify-between items-center text-[13.5px]"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[item.category] ||
                                  CATEGORY_COLORS['Other'],
                              }}
                            />
                            <span className="text-on-surface-variant font-medium truncate">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span
                              className="text-[12px] font-medium w-8 text-right"
                              style={{ color: 'var(--outline)' }}
                            >
                              {pct}%
                            </span>
                            <span className="font-mono text-on-surface font-semibold text-[13px]">
                              {currencyFormatter.format(item.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: 'var(--surface-container)' }}
                  >
                    📊
                  </div>
                  <p className="text-on-surface-variant text-[14px]">
                    No expenses this month
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Daily Trend ── */}
          <div className="flex flex-col gap-2">
            <h2 className="font-medium text-[14px] text-on-surface-variant px-0.5">
              Daily Spend — Last 7 Days
            </h2>
            <div
              className="h-[320px] lg:h-full min-h-[300px] p-5 pt-7 rounded-2xl"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
              }}
            >
              {showSkeleton ? (
                <div className="w-full h-full skeleton rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyData}
                    margin={{ top: 20, right: 4, left: 4, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="displayDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: 'var(--on-surface-variant)',
                        fontWeight: 500,
                      }}
                      dy={8}
                    />
                    <Tooltip
                      cursor={{
                        fill: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                        radius: 8,
                      }}
                      formatter={(
                        value:
                          | number
                          | string
                          | readonly (number | string)[]
                          | undefined
                      ) => [
                        currencyFormatter.format(
                          Number(
                            Array.isArray(value) ? value[0] : value
                          ) || 0
                        ),
                        'Spent',
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--surface-container-highest)',
                        border: '1px solid var(--outline-variant)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      }}
                      labelStyle={{
                        color: 'var(--on-surface-variant)',
                        marginBottom: '4px',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: 'var(--on-surface)', fontWeight: 600 }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--primary)"
                      radius={[6, 6, 3, 3]}
                      maxBarSize={36}
                      opacity={0.85}
                    >
                      <LabelList
                        dataKey="amount"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(val: any) =>
                          Number(val) > 0
                            ? compactFormatter.format(Number(val))
                            : ''
                        }
                        style={{
                          fontSize: '10px',
                          fill: 'var(--on-surface-variant)',
                          fontWeight: 600,
                        }}
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
    </div>
  );
}
