import React from 'react';
import { TrendingUp, TrendingDown, Minus, ReceiptText, Trophy } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

interface HeroCardProps {
  amount: number;
  vsLastMonth: string;
  expenseCount: number;
  topCategory: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ amount, vsLastMonth, expenseCount, topCategory }) => {
  const { formatCurrency } = useSettings();
  const isUp = vsLastMonth.includes('+');
  const isDown = vsLastMonth.includes('-');

  // Income is "down" (less spent = good) — treat accordingly
  const trendColorStyle = isUp
    ? { color: 'var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--error) 25%, transparent)' }
    : isDown
    ? { color: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)', borderColor: 'rgba(22, 163, 74, 0.25)' }
    : { color: 'var(--on-surface-variant)', backgroundColor: 'var(--surface-container)', borderColor: 'var(--outline-variant)' };

  const formattedAmount = formatCurrency(amount);

  return (
    <div
      className="mx-4 mt-6 mb-4 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, var(--primary-container) 0%, var(--surface-container) 100%)',
        border: '1px solid color-mix(in srgb, var(--primary) 20%, var(--outline-variant))',
      }}
    >
      <div className="px-6 pt-6 pb-7">
        {/* Label */}
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant opacity-70">
          This month
        </span>

        {/* Amount */}
        <div className="font-serif text-[46px] font-semibold leading-tight mt-1 text-on-surface tracking-tight">
          {formattedAmount}
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Trend pill */}
          <div
            className="px-3 py-1.5 rounded-full border text-[12px] font-semibold flex items-center gap-1.5"
            style={trendColorStyle}
          >
            {isUp ? <TrendingUp size={13} strokeWidth={2.5} /> : isDown ? <TrendingDown size={13} strokeWidth={2.5} /> : <Minus size={13} strokeWidth={2.5} />}
            <span>{vsLastMonth.replace(/[+-]/g, '')} vs last month</span>
          </div>

          {/* Transaction count */}
          <div
            className="px-3 py-1.5 rounded-full border text-[12px] font-medium flex items-center gap-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--surface) 70%, transparent)',
              borderColor: 'color-mix(in srgb, var(--outline-variant) 60%, transparent)',
              color: 'var(--on-surface)',
            }}
          >
            <ReceiptText size={13} strokeWidth={2} style={{ color: 'var(--on-surface-variant)' }} />
            <span>{expenseCount} transactions</span>
          </div>

          {/* Top category */}
          {topCategory && topCategory !== 'N/A' && (
            <div
              className="px-3 py-1.5 rounded-full border text-[12px] font-medium flex items-center gap-1.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--surface) 70%, transparent)',
                borderColor: 'color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                color: 'var(--on-surface)',
              }}
            >
              <Trophy size={13} strokeWidth={2} style={{ color: '#d97706' }} />
              <span>Top: {topCategory}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
