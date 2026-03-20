'use client';

import { useState, useEffect, useRef } from 'react';
import BottomSheet from './BottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { syncAddExpense, syncUpdateExpense, syncAddIncome, syncUpdateIncome } from '@/lib/sync';
import { Expense, Income } from '@/shared/models';
import { useMemo } from 'react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: (Expense | Income) & { type?: 'expense' | 'income' } | null;
}

export default function ExpenseModal({ isOpen, onClose, onSuccess, initialData }: ExpenseModalProps) {
  const { user } = useAuth();
  const { categories } = useExpenseData();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const activeCategories = useMemo(() => 
    categories.filter(c => c.type === type).map(c => c.name),
    [categories, type]
  );

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(initialData.amount.toString());
        setNote(initialData.note || '');
        setCategory(initialData.category);
        setDate(initialData.date.split('T')[0]);
        setType(initialData.type || 'expense');
      } else {
        setAmount('');
        setNote('');
        setCategory('Other');
        setType('expense');
        setDate(new Date().toISOString().split('T')[0]);
        setTimeout(() => amountRef.current?.focus(), 400);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (!user) return;
    setLoading(true);

    if (initialData) {
      const updateData = {
        amount: parseFloat(amount),
        note,
        category,
        date
      };
      if (type === 'income') {
        await syncUpdateIncome(initialData.id, updateData);
      } else {
        await syncUpdateExpense(initialData.id, updateData);
      }
    } else {
      const common = {
        id: crypto.randomUUID(),
        user_id: user.id,
        amount: parseFloat(amount),
        note,
        category,
        date,
        created_at: new Date().toISOString()
      };
      if (type === 'income') {
        await syncAddIncome(common as Income);
      } else {
        await syncAddExpense(common as Expense);
      }
    }

    onClose();
    if (onSuccess) onSuccess();
    setLoading(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? (type === 'income' ? "Edit income" : "Edit expense") : (type === 'income' ? "New income" : "New expense")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Type Toggle - only show if creating new to avoid confusion on edit */}
        {!initialData && (
          <div className="flex gap-2 p-1 bg-surface-container rounded-xl">
            <button 
              type="button"
              onClick={() => { setType('expense'); setCategory('Other'); }}
              className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => { setType('income'); setCategory('Salary'); }}
              className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'income' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
            >
              Income
            </button>
          </div>
        )}

        {/* Amount Input */}
        <div className="relative flex flex-col items-center pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-ink-3 font-mono text-sm mb-2">LKR</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-48 bg-transparent border-none border-b-2 border-border focus:border-primary text-center font-mono text-[42px] text-on-surface outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Note</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field appearance-none"
              >
                {activeCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !amount}
          className="btn-primary w-full mt-2"
        >
          {loading ? 'Saving...' : (initialData ? 'Update' : `Save ${type}`)}
        </button>
      </form>
    </BottomSheet>
  );
}
