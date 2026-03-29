import React from 'react';
import CategoryBadge from './CategoryBadge';
import { format, isToday, isYesterday } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';
import { SUPPORTED_CURRENCIES } from '@/shared/models';

interface ExpenseRowProps {
  id: string;
  amount: number;
  currency: string;
  base_amount: number;
  base_currency: string;
  category: string;
  note: string;
  date: string;
  type?: 'expense' | 'income';
  onDelete?: (id: string) => void;
  showFullDate?: boolean;
}

const ExpenseRow: React.FC<ExpenseRowProps> = ({
  amount,
  currency,
  base_amount,
  base_currency,
  category,
  note,
  date,
  type = 'expense',
  showFullDate,
}) => {
  const { formatCurrency, currency: activeBaseCurrency } = useSettings();
  
  const displayDate = () => {
    const d = new Date(date);
    if (showFullDate) return format(d, 'MMM d, yyyy');
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  // The primary display is ALWAYS the user's active session base currency.
  const amountStr = formatCurrency(base_amount || amount);
  
  // The secondary display is the ORIGINAL amount, shown ONLY if the transaction currency differs from the active session base currency.
  const isForeign = currency !== (base_currency || activeBaseCurrency);
  
  const originalAmountStr = React.useMemo(() => {
    if (!isForeign) return null;
    try {
      const config = SUPPORTED_CURRENCIES.find(c => c.code === currency);
      const formatter = new Intl.NumberFormat(config?.locale || 'en-US', {
        style: 'currency',
        currency: currency,
      });
      return formatter.format(amount);
    } catch (err) {
      console.warn(`[Currency] Invalid currency code: ${currency}`, err);
      return `${currency} ${amount.toFixed(2)}`;
    }
  }, [isForeign, currency, amount]);

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
          <span className="text-[12px] text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{displayDate()}</span>
            {note && (
              <>
                <span className="opacity-30">·</span>
                <span className="truncate max-w-[120px]">{category}</span>
              </>
            )}
            {isForeign && (
              <>
                <span className="opacity-30">·</span>
                <span className="px-1.5 py-[1px] bg-secondary-container text-on-secondary-container rounded text-[10px] font-medium mr-1 tracking-wide">
                  {originalAmountStr}
                </span>
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
