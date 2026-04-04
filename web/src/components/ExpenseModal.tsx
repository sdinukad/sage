'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import BottomSheet from './BottomSheet';
import { useAuth } from '@/context/AuthContext';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { useSettings } from '@/context/SettingsContext';
import { SUPPORTED_CURRENCIES, Expense, Income, RecurringTransaction, CurrencyConfig, getRecurringSchedule } from '@/shared/models';
import { getRate } from '@/lib/exchange-rates';
import { syncAddExpense, syncUpdateExpense, syncAddIncome, syncUpdateIncome, syncAddRecurring, syncUpdateRecurring } from '@/lib/sync';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: (Expense | Income | RecurringTransaction) & { type?: 'expense' | 'income' } | null;
}

export default function ExpenseModal({ isOpen, onClose, onSuccess, initialData }: ExpenseModalProps) {
  const { user } = useAuth();
  const { categories } = useExpenseData();
  const { currency } = useSettings();

  const [amount, setAmount] = useState('');
  const [currencyInput, setCurrencyInput] = useState(currency);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [note, setNote] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [interval, setInterval] = useState<number>(1);

  const activeCategories = useMemo(() => 
    categories.filter(c => c.type === type).map(c => c.name),
    [categories, type]
  );

  const suggestions = useMemo(() => {
    if (!currencyInput) return SUPPORTED_CURRENCIES;
    const lower = currencyInput.toLowerCase();
    return SUPPORTED_CURRENCIES.filter(c => 
      c.code.toLowerCase().includes(lower) || 
      c.name.toLowerCase().includes(lower)
    );
  }, [currencyInput]);

  const amountRef = useRef<HTMLInputElement>(null);

  const validateCurrency = (val: string): boolean => {
    const target = val.toUpperCase().trim();
    const isSupported = SUPPORTED_CURRENCIES.some(c => c.code === target);
    if (!isSupported && target.length > 0) {
      setCurrencyError(`${target} is not supported`);
      // Force re-trigger of animation by resetting state first
      setIsShaking(false);
      setTimeout(() => setIsShaking(true), 10);
      setTimeout(() => setIsShaking(false), 500);
      return false;
    }
    setCurrencyError(null);
    setIsShaking(false);
    return true;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(Math.abs(initialData.amount).toString());
        setCurrencyInput(initialData.currency || currency);
        setNote(initialData.note || '');
        setCategory(initialData.category);
        
        // Handle both regular and recurring transactions
        const dataDate = 'start_date' in initialData ? initialData.start_date : (initialData as Expense | Income).date;
        if (dataDate) setDate(dataDate.split('T')[0]);
        
        setType(initialData.type || 'expense');
        setIsRecurring('frequency' in initialData);
        if ('frequency' in initialData) {
          setFrequency((initialData as RecurringTransaction).frequency);
          setInterval((initialData as RecurringTransaction).interval || 1);
        }
      } else {
        setAmount('');
        setCurrencyInput(currency);
        setNote('');
        setCategory('Other');
        setType('expense');
        setIsRecurring(false);
        setFrequency('monthly');
        setInterval(1);
        setDate(new Date().toISOString().split('T')[0]);
        setTimeout(() => amountRef.current?.focus(), 400);
      }
      setCurrencyError(null);
      setIsShaking(false);
    }
  }, [isOpen, initialData, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (!user) return;
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      const targetCurrency = currencyInput.toUpperCase().trim();
      
      if (!validateCurrency(targetCurrency)) {
        setLoading(false);
        return;
      }

      const baseCurrency = currency;
      
      // Fetch the rate for the specified date and currency
      let rate = 1.0;
      if (targetCurrency !== baseCurrency) {
        rate = await getRate(targetCurrency, baseCurrency, date);
      }

      if (isRecurring) {
        const schedule = getRecurringSchedule(date, frequency);
        const recurringData: RecurringTransaction = {
          id: (initialData && 'frequency' in initialData) ? initialData.id : crypto.randomUUID(),
          user_id: user.id,
          type,
          amount: parsedAmount,
          currency: targetCurrency,
          category,
          note,
          frequency,
          interval,
          ...schedule,
          start_date: date,
          active: true,
          created_at: new Date().toISOString()
        };

        if (initialData && 'frequency' in initialData) {
          await syncUpdateRecurring(initialData.id, recurringData);
        } else {
          await syncAddRecurring(recurringData);
        }
      } else {
        if (initialData) {
          const updateData = {
            amount: parsedAmount,
            currency: targetCurrency,
            base_amount: Math.round(parsedAmount * rate * 100) / 100,
            base_currency: baseCurrency,
            exchange_rate: rate,
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
            amount: parsedAmount,
            currency: targetCurrency,
            base_amount: Math.round(parsedAmount * rate * 100) / 100,
            base_currency: baseCurrency,
            exchange_rate: rate,
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
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      alert('Internal error saving transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={initialData ? (type === 'income' ? "Edit income" : "Edit expense") : (type === 'income' ? "New income" : "New expense")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Type Toggle - only show if creating new to avoid confusion on edit */}
        {!initialData && (
          <div className="flex gap-2 p-1 bg-surface-container border border-surface-variant rounded-xl overflow-hidden shadow-inner">
            <button 
              type="button"
              onClick={() => { setType('expense'); setCategory('Other'); }}
              className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-surface-variant text-on-surface shadow-md ring-1 ring-border' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => { setType('income'); setCategory('Salary'); }}
              className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'income' ? 'bg-surface-variant text-on-surface shadow-md ring-1 ring-border' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
            >
              Income
            </button>
          </div>
        )}

        {/* Amount Input */}
        <div className="relative flex flex-col items-center pt-4">
          <div className="flex items-baseline gap-2 relative">
            <div className={`relative flex flex-col items-center ${isShaking ? 'animate-shake' : ''}`}>
              <input
                type="text"
                value={currencyInput}
                onChange={(e) => {
                  setCurrencyInput(e.target.value);
                  setShowSuggestions(true);
                  if (currencyError) setCurrencyError(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  validateCurrency(currencyInput);
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="CUR"
                style={currencyError ? { color: '#ff4444' } : {}}
                className={`w-20 bg-surface-container border-none font-mono text-base font-semibold mb-2 text-center outline-none focus:ring-1 ring-primary/50 rounded py-0.5 uppercase tracking-wider ${!currencyError ? 'text-ink-3' : ''}`}
              />
              {currencyError && (
                <span 
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px]"
                  style={{ color: '#ff4444' }}
                >
                  {currencyError}
                </span>
              )}
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-8 left-0 z-50 w-48 max-h-48 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1">
                  {suggestions.map((curr: CurrencyConfig) => (
                    <button
                      key={curr.code}
                      type="button"
                      onMouseDown={() => {
                        setCurrencyInput(curr.code);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-surface-variant transition-colors border-b border-border/50 last:border-none"
                    >
                      <span className="font-mono font-bold text-on-surface">{curr.code}</span>
                      <span className="text-on-surface-variant truncate ml-2">{curr.name}</span>
                      <span className="ml-1">{curr.flag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                {activeCategories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">
                {isRecurring ? 'Start Date' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3 bg-surface-container rounded-2xl border border-surface-variant/50">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[14px] font-medium text-on-surface">Recurring Transaction</span>
                <span className="text-[12px] text-on-surface-variant">Automatically repeat this entry</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 focus:ring-2 ring-primary/20 ${isRecurring ? 'bg-primary' : 'bg-surface-variant'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {isRecurring && (
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-variant/30 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Frequency & Interval</label>
                  <div className="flex gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1 p-1 bg-surface-container-high rounded-xl border border-surface-variant/30">
                      {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFrequency(freq)}
                          className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${frequency === freq ? 'bg-surface text-primary shadow-sm ring-1 ring-black/5' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                    <div className="w-20 relative">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={interval}
                        onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                        className="w-full h-full bg-surface-container-high border border-surface-variant/30 rounded-xl px-3 text-center text-sm font-bold text-primary outline-none focus:ring-2 ring-primary/20"
                        placeholder="1"
                      />
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-surface-container-high px-1 text-[9px] font-bold text-on-surface-variant/60 uppercase">
                        Every
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
