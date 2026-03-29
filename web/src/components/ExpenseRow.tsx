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

const ExpenseRow: React.FC<ExpenseRowProps> = ({
  amount,
  category,
  note,
  date,
  type = 'expense',
  showFullDate,
}) => {
  const displayDate = () => {
    const d = new Date(date);
    if (showFullDate) return format(d, 'MMM d, yyyy');
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const amountStr = new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div
      className="flex items-center justify-between py-3.5 px-4 transition-colors"
      style={{ backgroundColor: 'var(--surface)' }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'var(--surface-container-low)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)')
      }
    >
      <div className="flex items-center gap-3.5">
        {/* Category dot indicator */}
        <CategoryBadge category={category} dotOnly />

        {/* Text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[14.5px] font-medium text-on-surface leading-snug truncate">
            {note || category}
          </span>
          <span className="text-[12px] text-on-surface-variant mt-0.5 flex items-center gap-1.5">
            <span>{displayDate()}</span>
            {note && (
              <>
                <span className="opacity-30">·</span>
                <span className="truncate max-w-[120px]">{category}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Amount */}
      <span
        className="font-mono text-[15px] font-semibold shrink-0 ml-4"
        style={{ color: type === 'income' ? '#16a34a' : 'var(--on-surface)' }}
      >
        {type === 'income' ? '+' : '–'}{amountStr}
      </span>
    </div>
  );
};

export default ExpenseRow;
