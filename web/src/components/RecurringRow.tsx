'use client';

import React from 'react';
import { RecurringTransaction, formatFrequency, SUPPORTED_CURRENCIES } from '@/shared/models';

import { Calendar, Repeat, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useExpenseData } from '@/context/ExpenseDataContext';

interface RecurringRowProps {
  recurring: RecurringTransaction;
  onEdit: (recurring: RecurringTransaction) => void;
  onDelete: (id: string) => void;
  isSwiped: boolean;
  onSwipe: (id: string | null) => void;
}

const RecurringRow: React.FC<RecurringRowProps> = ({ 
  recurring, 
  onEdit, 
  onDelete, 
  isSwiped, 
  onSwipe 
}) => {

  const { categories } = useExpenseData();
  
  const categoryColor = categories.find(c => c.name === recurring.category)?.color || 'var(--primary)';
  const frequencyLabel = formatFrequency(recurring);
  const isIncome = recurring.type === 'income';

  return (
    <div className="relative overflow-hidden group">
      {/* Swipe Actions */}
      <div 
        className={`absolute inset-y-0 right-0 w-[140px] flex transition-transform duration-200 z-10 ${
          isSwiped ? 'translate-x-0' : 'translate-x-[140px]'
        }`}
      >
        <button
          onClick={() => {
            onEdit(recurring);
            onSwipe(null);
          }}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
        >
          <Repeat size={18} />
        </button>
        <button
          onClick={() => {
            onDelete(recurring.id);
            onSwipe(null);
          }}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
        >
          <Calendar size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div
        className={`bg-surface px-4 py-3.5 flex items-center gap-4 cursor-pointer active:bg-surface-variant/50 transition-all duration-200 ${
          isSwiped ? '-translate-x-[140px]' : 'translate-x-0'
        }`}
        onClick={() => onSwipe(isSwiped ? null : recurring.id)}
      >
        {/* Icon/Category Circle */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: `${categoryColor}15` }}
        >
          {isIncome ? (
            <ArrowDownLeft size={20} style={{ color: categoryColor }} />
          ) : (
            <ArrowUpRight size={20} style={{ color: categoryColor }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="font-semibold text-[15px] text-on-surface truncate">
              {recurring.note || recurring.category}
            </h3>
            <span className={`font-mono text-[15px] font-bold ${isIncome ? 'text-green-600' : 'text-on-surface'}`}>
              {isIncome ? '+' : ''}{(() => {
                try {
                  const config = SUPPORTED_CURRENCIES.find(c => c.code === recurring.currency);
                  return new Intl.NumberFormat(config?.locale || 'en-US', {
                    style: 'currency',
                    currency: recurring.currency,
                  }).format(recurring.amount);
                } catch {
                  return `${recurring.currency} ${recurring.amount}`;
                }
              })()}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              {recurring.category}
            </span>
            <div className="flex items-center gap-1 text-on-surface-variant text-[12px]">
              <Repeat size={12} strokeWidth={2.5} />
              <span className="font-medium whitespace-nowrap">{frequencyLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringRow;
