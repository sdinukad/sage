'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Check } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useAuth } from '@/context/AuthContext';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const categories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other'];

// Simple module-level cache for AI suggestions during a session
const suggestionCache = new Map<string, string>();

export default function AddExpenseModal({ isOpen, onClose, onSuccess }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [hasAcceptedSuggestion, setHasAcceptedSuggestion] = useState(false);
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNote('');
      setCategory('Other');
      setSuggestedCategory(null);
      setHasAcceptedSuggestion(false);
      setTimeout(() => amountRef.current?.focus(), 400);
    }
  }, [isOpen]);

  const fetchAiSuggestion = useCallback(async (noteText: string) => {
    if (!noteText || noteText.length < 3) return;
    
    // Check cache first
    const cached = suggestionCache.get(noteText.trim().toLowerCase());
    if (cached) {
      setSuggestedCategory(cached);
      return;
    }

    setIsSuggesting(true);
    try {
      const res = await fetch('/api/ai/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText }),
      });
      const data = await res.json();
      if (data.category && categories.includes(data.category)) {
        suggestionCache.set(noteText.trim().toLowerCase(), data.category);
        setSuggestedCategory(data.category);
      }
    } catch (e) {
      console.error('AI Suggestion Error:', e);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  useEffect(() => {
    if (!note || hasAcceptedSuggestion) {
      if (!note) {
        setSuggestedCategory(null);
        setHasAcceptedSuggestion(false);
      }
      return;
    }
    const timeout = setTimeout(() => {
      fetchAiSuggestion(note);
    }, 500);
    return () => clearTimeout(timeout);
  }, [note, fetchAiSuggestion, hasAcceptedSuggestion]);

  const handleAcceptSuggestion = () => {
    if (suggestedCategory) {
      setCategory(suggestedCategory);
      setHasAcceptedSuggestion(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (!user) return;
    setLoading(true);

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
      onClose();
      if (onSuccess) onSuccess();
      // Simple refresh for other components
      window.dispatchEvent(new CustomEvent('expense-added'));
    }
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
              className="w-48 bg-transparent border-none border-b-2 border-border focus:border-sage-500 text-center font-mono text-[42px] text-ink outline-none transition-colors"
              required
            />
          </div>
        </div>

        {/* AI Suggestion */}
        <div className={`flex justify-center transition-all duration-300 ${suggestedCategory || isSuggesting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none h-0'}`}>
          {isSuggesting ? (
            <div className="flex items-center gap-2 text-sage-300 animate-pulse text-xs">
              <Sparkles size={14} />
              <span>Sage is thinking...</span>
            </div>
          ) : suggestedCategory && (
            <button
              type="button"
              onClick={handleAcceptSuggestion}
              disabled={hasAcceptedSuggestion}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${hasAcceptedSuggestion ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-700'}`}
            >
              <Sparkles size={14} />
              <span>✦ Sage suggests: {suggestedCategory}</span>
              {hasAcceptedSuggestion && <Check size={14} />}
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-3 uppercase ml-1">Note</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setHasAcceptedSuggestion(false);
              }}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase ml-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field appearance-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase ml-1">Date</label>
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
