/**
 * Exchange Rate Service
 * 
 * 3-tier lookup: IndexedDB (Dexie) → Supabase → frankfurter.app API
 * Historical rates are immutable facts — fetch once, cache forever.
 */

import { db, LocalExchangeRate } from './localdb';
import { supabase } from './supabase';

const FRANKFURTER_BASE = 'https://api.frankfurter.app';
const FAWAZ_API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api';
const FALLBACK_API_BASE = 'https://open.er-api.com/v6/latest';

/**
 * Get the exchange rate from one currency to another for a specific date.
 * Uses a 3-tier cache: Dexie → Supabase → API.
 */
export async function getRate(
  from: string,
  to: string,
  date: string
): Promise<number> {
  // Same currency — no conversion needed
  if (from === to) return 1;

  const normalizedDate = normalizeToWeekday(date);

  // Tier 1: Check local IndexedDB
  const localRate = await db.exchange_rates.get([from, to, normalizedDate]);
  if (localRate) return localRate.rate;

  // Tier 2: Check Supabase
  const { data: remoteRate } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .eq('date', normalizedDate)
    .single();

  if (remoteRate) {
    // Cache locally for future offline access
    await db.exchange_rates.put({
      from_currency: from,
      to_currency: to,
      date: normalizedDate,
      rate: remoteRate.rate,
    });
    return remoteRate.rate;
  }

  // Tier 3: Fetch from frankfurter.app API
  // The API returns all currencies for a given base, so we bulk cache
  const rates = await fetchFromAPI(from, normalizedDate);

  if (rates[to]) {
    return rates[to];
  }

  // Tier 3.5: Try FawazAhmed0 API for historical fallback (supports LKR, etc.)
  const fawazRates = await fetchFromFawazAPI(from, normalizedDate);
  if (fawazRates[to]) {
    await cacheRate(from, to, normalizedDate, fawazRates[to]);
    return fawazRates[to];
  }

  // Tier 3.7: Try explicit fallback provider for the base currency (latest only)
  const fallbackRates = await fetchFromFallbackAPI(from);
  if (fallbackRates[to]) {
    await cacheRate(from, to, normalizedDate, fallbackRates[to]);
    return fallbackRates[to];
  }

  // Tier 4: Triangulation (if direct fetch still failed)
  if (from !== 'USD' && to !== 'USD') {
    const fromToUSD = await getRate(from, 'USD', date);
    const usdToTarget = await getRate('USD', to, date);
    const triangulated = fromToUSD * usdToTarget;

    // Cache the triangulated rate
    await cacheRate(from, to, normalizedDate, triangulated);
    return triangulated;
  }

  // Fallback: try the most recent available rate before this date
  const fallbackRate = await getFallbackRate(from, to, normalizedDate);
  if (fallbackRate) return fallbackRate;

  // Last resort: try to fetch from fallback API again but for the TARGET currency if the base failed
  try {
    const reverseRates = await fetchFromFallbackAPI(to);
    if (reverseRates && reverseRates[from]) {
      const rate = 1 / reverseRates[from];
      await cacheRate(from, to, normalizedDate, rate);
      return rate;
    }
  } catch (e) {
    console.error('Final fallback failed:', e);
  }

  // If we really can't find it, we must return 1 with a warning to avoid crashing the transaction flow
  console.warn(`[Currency] No exchange rate found for ${from}→${to} on ${date}. Defaulting to 1.0`);
  return 1;
}

/**
 * Convert an amount from one currency to another for a specific date.
 */
export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string
): Promise<{ converted: number; rate: number; rateDate: string }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1, rateDate: date };
  }

  const rateDate = normalizeToWeekday(date);
  const rate = await getRate(fromCurrency, toCurrency, rateDate);
  const converted = Math.round(amount * rate * 100) / 100; // 2 decimal precision

  return { converted, rate, rateDate };
}

/**
 * Fetch all rates for a given base currency and date from frankfurter.app.
 * Caches all returned pairs to both IndexedDB and Supabase.
 */
async function fetchFromAPI(
  baseCurrency: string,
  date: string
): Promise<Record<string, number>> {
  try {
    const url = `${FRANKFURTER_BASE}/${date}?base=${baseCurrency}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[Currency] Frankfurter API failed (${response.status}) for ${baseCurrency}, trying fallback...`);
      return fetchFromFallbackAPI(baseCurrency);
    }

    const data = await response.json();
    const rates: Record<string, number> = data.rates || {};

    // Bulk cache all returned rates
    const ratesToCache: LocalExchangeRate[] = Object.entries(rates).map(
      ([currency, rate]) => ({
        from_currency: baseCurrency,
        to_currency: currency,
        date,
        rate: rate as number,
      })
    );

    // Cache to IndexedDB
    if (ratesToCache.length > 0) {
      await db.exchange_rates.bulkPut(ratesToCache);
    }

    // Cache to Supabase (fire and forget)
    supabase
      .from('exchange_rates')
      .upsert(
        ratesToCache.map((r) => ({
          from_currency: r.from_currency,
          to_currency: r.to_currency,
          date: r.date,
          rate: r.rate,
        })),
        { onConflict: 'from_currency,to_currency,date' }
      )
      .then(({ error }) => {
        if (error) console.warn('Failed to cache rates to Supabase:', error);
      });

    return rates;
  } catch (err) {
    console.warn(`[Currency] Frankfurter failed for ${baseCurrency}, trying fallback provider...`);
    return fetchFromFallbackAPI(baseCurrency);
  }
}

/**
 * Fetch historical rates from FawazAhmed0 API (via jsDelivr).
 * Supports ~500 currencies with daily snapshots since 2024.
 */
async function fetchFromFawazAPI(
  baseCurrency: string,
  date: string
): Promise<Record<string, number>> {
  try {
    const code = baseCurrency.toLowerCase();
    // Fawaz API format: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/{code}.json
    const url = `${FAWAZ_API_BASE}@${date}/v1/currencies/${code}.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // If exact date fails, try one day earlier (CDN might miss some specific dates)
      console.warn(`[Currency] Fawaz API failed for ${date}, skipping historical secondary...`);
      return {};
    }

    const data = await response.json();
    const rates: Record<string, number> = data[code] || {};

    // Bulk cache returned rates
    const ratesToCache: LocalExchangeRate[] = Object.entries(rates).map(
      ([currency, rate]) => ({
        from_currency: baseCurrency.toUpperCase(),
        to_currency: currency.toUpperCase(),
        date,
        rate: rate as number,
      })
    );

    if (ratesToCache.length > 0) {
      await db.exchange_rates.bulkPut(ratesToCache);
    }

    return rates;
  } catch (err) {
    console.warn(`[Currency] Fawaz API error:`, err);
    return {};
  }
}

/**
 * Secondary fallback API (open.er-api.com) for LATEST rates.
 */
async function fetchFromFallbackAPI(baseCurrency: string): Promise<Record<string, number>> {
  try {
    const url = `${FALLBACK_API_BASE}/${baseCurrency.toUpperCase()}`;
    const response = await fetch(url);
    if (!response.ok) return {};

    const data = await response.json();
    if (data.result !== 'success') return {};
    
    return data.rates || {};
  } catch (err) {
    console.error('All currency providers failed:', err);
    return {};
  }
}

/**
 * Cache a single rate to both IndexedDB and Supabase.
 */
async function cacheRate(
  from: string,
  to: string,
  date: string,
  rate: number
): Promise<void> {
  await db.exchange_rates.put({ from_currency: from, to_currency: to, date, rate });

  // Fire and forget to Supabase
  supabase
    .from('exchange_rates')
    .upsert(
      { from_currency: from, to_currency: to, date, rate },
      { onConflict: 'from_currency,to_currency,date' }
    )
    .then(({ error }) => {
      if (error) console.warn('Failed to cache rate to Supabase:', error);
    });
}

/**
 * Normalize a date to the most recent weekday (forex markets close on weekends).
 * Saturday → Friday, Sunday → Friday.
 */
function normalizeToWeekday(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Handle various date formats safely
  let d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00Z');
  
  // Fallback if invalid
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const day = d.getUTCDay();
  if (day === 0) d.setUTCDate(d.getUTCDate() - 2); // Sunday → Friday
  else if (day === 6) d.setUTCDate(d.getUTCDate() - 1); // Saturday → Friday
  
  return d.toISOString().split('T')[0];
}

/**
 * Try to find the most recent rate before the given date as a fallback.
 */
async function getFallbackRate(
  from: string,
  to: string,
  date: string
): Promise<number | null> {
  // Check Supabase for the most recent rate before this date
  const { data } = await supabase
    .from('exchange_rates')
    .select('rate, date')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    // Cache it for the requested date too
    await cacheRate(from, to, date, data.rate);
    return data.rate;
  }

  // Check local Dexie as last resort
  const localRates = await db.exchange_rates
    .where('[from_currency+to_currency+date]')
    .between([from, to, Dexie.minKey], [from, to, date])
    .reverse()
    .limit(1)
    .toArray();

  if (localRates.length > 0) {
    return localRates[0].rate;
  }

  return null;
}

// Re-export Dexie for the compound key queries
import Dexie from 'dexie';
