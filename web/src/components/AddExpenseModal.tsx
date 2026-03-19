'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Sparkles, Check } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other'];

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestCategory = useCallback(async (noteText: string) => {
    if (!noteText || noteText.length < 3) return;
    setAiSuggesting(true);
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });
      const data = await res.json();
      if (data.category && categories.includes(data.category)) {
        setCategory(data.category);
        setAiResult(data.category);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiSuggesting(false);
    }
  }, []);

  useEffect(() => {
    if (!note) {
      setAiResult(null);
      return;
    }
    const timeout = setTimeout(() => {
      suggestCategory(note);
    }, 500);
    return () => clearTimeout(timeout);
  }, [note, suggestCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      amount: parseFloat(amount),
      note,
      category,
      date,
    });

    if (error) {
      alert(error.message);
    } else {
      setAmount('');
      setNote('');
      setCategory('Other');
      setAiResult(null);
      onSuccess();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="card w-full max-w-md relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-6">Add New Expense</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <div className="relative">
              <input
                type="text"
                className="input-field pr-10"
                placeholder="What did you spend on?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {aiSuggesting ? (
                  <Sparkles size={16} className="text-[#16a34a] animate-pulse" />
                ) : aiResult ? (
                  <div className="flex items-center gap-1 text-[#16a34a] text-[10px] font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                    AI <Check size={10} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  className="input-field pl-7"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <select
              className="input-field appearance-none bg-no-repeat bg-[right_1rem_center]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27%3E%3C/polyline%3E%3C/svg%3E")' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary w-full py-3 mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
