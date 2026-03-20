'use client';

import { useState, useEffect, useRef } from 'react';
import BottomSheet from './BottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { syncAddExpense } from '@/lib/sync';
import { Expense } from '@/shared/models';
import { useMemo } from 'react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { categories } = useExpenseData();

  const expenseCategories = useMemo(() => 
    categories.filter(c => c.type === 'expense').map(c => c.name),
    [categories]
  );
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setCategory('Other');
      setTimeout(() => amountRef.current?.focus(), 400);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (!user) return;
    setLoading(true);

    const newExpense = {
      id: crypto.randomUUID(),
      user_id: user.id,
      amount: parseFloat(amount),
      note,
      category,
      date,
      created_at: new Date().toISOString()
    } as Expense;

    await syncAddExpense(newExpense);

    onClose();
    if (onSuccess) onSuccess();
    setLoading(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New expense">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
                {expenseCategories.map((cat) => (
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
          {loading ? 'Saving...' : 'Save expense'}
        </button>
      </form>
    </BottomSheet>
  );
}
