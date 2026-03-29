/**
 * Currency Converter Engine
 * 
 * Handles the bulk re-conversion of all historical transactions when the user
 * changes their base currency. Runs client-side against IndexedDB, then
 * triggers a sync to Supabase.
 */

import { db, LocalExpense, LocalIncome } from './localdb';
import { getRate } from './exchange-rates';
import { pushLocalData } from './sync';

let conversionTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 2000;

/**
 * Trigger a bulk re-conversion of all transactions to the new base currency.
 * Debounced to prevent rapid back-to-back conversions if the user clicks quickly.
 */
export async function reconvertAllTransactions(newBaseCurrency: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (conversionTimeout) {
      clearTimeout(conversionTimeout);
    }

    conversionTimeout = setTimeout(async () => {
      try {
        await executeReconversion(newBaseCurrency);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, DEBOUNCE_MS);
  });
}

/**
 * The actual re-conversion logic.
 */
async function executeReconversion(newBaseCurrency: string): Promise<void> {
  console.log(`[Currency] Starting re-conversion to base: ${newBaseCurrency}`);
  
  // 1. Fetch all expenses and incomes from Dexie
  const expenses = await db.expenses.toArray();
  const incomes = await db.incomes.toArray();

  if (expenses.length === 0 && incomes.length === 0) {
    return;
  }

  // 2. Collect unique (currency, date) pairs to fetch rates efficiently
  const uniquePairs = new Set<string>();
  
  const collectPair = (currency: string, date: string) => {
    if (currency !== newBaseCurrency) {
      // Just need YYYY-MM-DD part for the rate lookup
      const dateOnly = date.split('T')[0];
      uniquePairs.add(`${currency}|${dateOnly}`);
    }
  };

  expenses.forEach(e => collectPair(e.currency, e.date));
  incomes.forEach(i => collectPair(i.currency, i.date));

  // 3. Fetch and cache all needed rates
  const rateMap = new Map<string, number>();
  
  for (const pair of Array.from(uniquePairs)) {
    const [fromCurrency, date] = pair.split('|');
    try {
      const rate = await getRate(fromCurrency, newBaseCurrency, date);
      rateMap.set(pair, rate);
    } catch (err) {
      console.warn(`[Currency] Failed to fetch rate for ${pair}, falling back to 1.0`, err);
      rateMap.set(pair, 1.0); // Safe fallback to avoid breaking the whole process
    }
  }

  // 4. Update functions for items
  const updateItem = (
    item: LocalExpense | LocalIncome
  ): LocalExpense | LocalIncome => {
    if (item.currency === newBaseCurrency) {
      // It's already in the target currency, exact 1:1 match
      return {
        ...item,
        base_amount: item.amount,
        base_currency: newBaseCurrency,
        exchange_rate: 1,
        // If it was synced, mark it pending_update so Supabase gets the new base_amount
        sync_status: item.sync_status === 'synced' ? 'pending_update' : item.sync_status
      };
    }

    const dateOnly = item.date.split('T')[0];
    const rate = rateMap.get(`${item.currency}|${dateOnly}`) || 1.0;
    
    return {
      ...item,
      base_amount: Math.round(item.amount * rate * 100) / 100,
      base_currency: newBaseCurrency,
      exchange_rate: rate,
      sync_status: item.sync_status === 'synced' ? 'pending_update' : item.sync_status
    };
  };

  // 5. Bulk update IndexedDB
  await db.transaction('rw', db.expenses, db.incomes, async () => {
    if (expenses.length > 0) {
      const updatedExpenses = expenses.map(updateItem) as LocalExpense[];
      await db.expenses.bulkPut(updatedExpenses);
    }

    if (incomes.length > 0) {
      const updatedIncomes = incomes.map(updateItem) as LocalIncome[];
      await db.incomes.bulkPut(updatedIncomes);
    }
  });

  console.log(`[Currency] Re-conversion complete. Converted ${expenses.length + incomes.length} items to ${newBaseCurrency}.`);

  // 6. Push local updates to Supabase
  pushLocalData().catch(err => {
    console.error('[Currency] Failed to sync re-converted items upstream:', err);
  });
}
