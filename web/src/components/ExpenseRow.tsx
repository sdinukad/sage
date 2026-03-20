import React from 'react';
import CategoryBadge from './CategoryBadge';
import { format, isToday, isYesterday } from 'date-fns';

interface ExpenseRowProps {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  type?: 'expense' | 'income';
  onDelete?: (id: string) => void;
  showFullDate?: boolean;
}

const ExpenseRow: React.FC<ExpenseRowProps> = ({ amount, category, note, date, type = 'expense', showFullDate }) => {
  const displayDate = () => {
    const d = new Date(date);
    if (showFullDate) return format(d, 'MMM d, yyyy');
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  return (
    <div className="flex items-center justify-between py-4 px-4 bg-surface-container-low rounded-lg mb-4 hover:bg-surface-container transition-colors">
      <div className="flex items-center gap-4">
        <CategoryBadge category={category} dotOnly className="mt-1" />
        <div className="flex flex-col">
          <span className="text-[15px] font-medium text-on-surface leading-tight">
            {note || category}
          </span>
          <span className="text-[12px] text-on-surface-variant mt-1">
            {displayDate()}
          </span>
        </div>
      </div>
      <div className={`font-serif text-[18px] font-semibold ${type === 'income' ? 'text-green-600' : 'text-on-surface'}`}>
        {type === 'income' ? '+' : ''}
        {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(amount)}
      </div>
    </div>
  );
};

export default ExpenseRow;
