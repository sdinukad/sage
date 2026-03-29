'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { SUPPORTED_CURRENCIES } from '@/shared/models';

interface SettingsContextType {
  currency: string;
  locale: string;
  formatCurrency: (amount: number) => string;
  formatCompact: (amount: number) => string;
  updateCurrency: (currencyCode: string) => Promise<void>;
  isConverting: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  currency: 'LKR',
  locale: 'en-LK',
  formatCurrency: (amount: number) => String(amount),
  formatCompact: (amount: number) => String(amount),
  updateCurrency: async () => {},
  isConverting: false,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sage_currency') || 'LKR';
    }
    return 'LKR';
  });
  const [locale, setLocale] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sage_locale') || 'en-LK';
    }
    return 'en-LK';
  });
  const [isConverting, setIsConverting] = useState(false);

  // Load currency from Supabase profile on login
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('currency, locale')
        .eq('id', user.id)
        .single();

      if (data?.currency) {
        setCurrency(data.currency);
        setLocale(data.locale || 'en-LK');
        localStorage.setItem('sage_currency', data.currency);
        localStorage.setItem('sage_locale', data.locale || 'en-LK');
      }
    };

    loadProfile();
  }, [user]);

  // Pre-built formatters that react to currency/locale changes
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    });
    return (amount: number) => formatter.format(amount);
  }, [currency, locale]);

  const formatCompact = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return (amount: number) => formatter.format(amount);
  }, [locale]);

  // Change currency: update profile, trigger re-conversion
  const updateCurrency = useCallback(async (newCurrencyCode: string) => {
    const config = SUPPORTED_CURRENCIES.find(c => c.code === newCurrencyCode);
    if (!config || !user) return;

    const oldCurrency = currency;
    
    // Optimistic UI update
    setCurrency(config.code);
    setLocale(config.locale);
    localStorage.setItem('sage_currency', config.code);
    localStorage.setItem('sage_locale', config.locale);

    // Update Supabase profile
    await supabase
      .from('profiles')
      .update({ currency: config.code, locale: config.locale })
      .eq('id', user.id);

    // Trigger re-conversion if currency actually changed
    if (oldCurrency !== config.code) {
      setIsConverting(true);
      try {
        // Dynamic import to avoid circular deps
        const { reconvertAllTransactions } = await import('@/lib/currency-converter');
        await reconvertAllTransactions(config.code);
        console.log(`[Settings] Historical conversion to ${config.code} triggered successfully.`);
      } catch (err) {
        console.error('Currency re-conversion failed:', err);
      } finally {
        setIsConverting(false);
      }
    }
  }, [user, currency]);

  const value = useMemo(() => ({
    currency,
    locale,
    formatCurrency,
    formatCompact,
    updateCurrency,
    isConverting,
  }), [currency, locale, formatCurrency, formatCompact, updateCurrency, isConverting]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
