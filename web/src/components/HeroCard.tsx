import React from 'react';

interface HeroCardProps {
  amount: number;
  vsLastMonth: string;
  expenseCount: number;
  topCategory: string;
}

const HeroCard: React.FC<HeroCardProps> = ({ amount, vsLastMonth, expenseCount, topCategory }) => {
  return (
    <div className="bg-surface-container-highest text-on-surface rounded-xl mx-4 mt-6 mb-4 px-6 pt-6 pb-8" style={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)' }}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-on-surface-variant uppercase tracking-[0.08em] font-medium">This month</span>
        <div className="font-serif text-[44px] font-normal leading-tight">
          {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(amount)}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4 pt-2">
        <div className="px-3 py-1.5 rounded-full bg-surface-container-low/60 backdrop-blur-sm text-[12px] font-medium flex items-center gap-1 text-on-surface-variant">
          <span className="text-secondary">↑</span> {vsLastMonth} vs last month
        </div>
        <div className="px-3 py-1.5 rounded-full bg-surface-container-low/60 backdrop-blur-sm text-[12px] font-medium text-on-surface-variant">
          {expenseCount} expenses
        </div>
        <div className="px-3 py-1.5 rounded-full bg-surface-container-low/60 backdrop-blur-sm text-[12px] font-medium text-on-surface-variant">
          Top: {topCategory}
        </div>
      </div>
    </div>
  );
};

export default HeroCard;
