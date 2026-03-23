import React from 'react';
import { TrendingUp, TrendingDown, Minus, ReceiptText, Trophy } from 'lucide-react';

interface HeroCardProps {
  amount: number;
  vsLastMonth: string;
  expenseCount: number;
  topCategory: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ amount, vsLastMonth, expenseCount, topCategory }) => {
  const isUp = vsLastMonth.includes('+');
  const isDown = vsLastMonth.includes('-');
  
  const trendColorClass = isUp ? 'text-red-500 dark:text-red-400' : isDown ? 'text-[#10ac84] dark:text-[#1dd1a1]' : 'text-on-surface-variant';
  const trendBgClass = isUp ? 'bg-red-500/10 border-red-500/20' : isDown ? 'bg-[#10ac84]/10 border-[#10ac84]/20' : 'bg-surface/50 border-border/50';

  return (
    <div className="bg-surface-container-highest text-on-surface rounded-xl mx-4 mt-6 mb-4 px-6 pt-6 pb-8 border border-border/20" style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)' }}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium">This month</span>
        <div className="font-serif text-[44px] font-normal leading-tight">
          {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2.5 mt-4 pt-2">
        <div className={`px-2.5 py-1 rounded-full border text-[12px] font-medium flex items-center gap-1.5 ${trendBgClass} ${trendColorClass}`}>
          {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
          <span>{vsLastMonth.replace(/[+-]/g, '')} vs last month</span>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-surface/60 border border-border/50 text-[12px] font-medium text-on-surface flex items-center gap-1.5 shadow-sm">
          <ReceiptText size={14} className="text-on-surface-variant" />
          <span>{expenseCount} Transactions</span>
        </div>
        {topCategory && topCategory !== 'N/A' && (
          <div className="px-2.5 py-1 rounded-full bg-surface/60 border border-border/50 text-[12px] font-medium text-on-surface flex items-center gap-1.5 shadow-sm">
            <Trophy size={14} className="text-amber-500" />
            <span>Top Spend: {topCategory}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCard;
