import { supabase } from './supabase';
import { db, LocalCategory } from './localdb';
import { Expense, Income, RecurringTransaction } from '@/shared/models';

/**
 * Optimistically adds an expense to the local IndexedDB.
 * The UI (`useLiveQuery`) will instantly update in 0ms.
 * Then it silently attempts to push to Supabase.
 */
export async function syncAddExpense(expense: Expense) {
  // 1. 0ms optimistic UI write
  const toSave = { 
    ...expense, 
    created_at: expense.created_at || new Date().toISOString(),
    sync_status: 'pending_insert' as const 
  };
  await db.expenses.put(toSave);
  
  // 2. Background push
  try {
    const { error } = await supabase.from('expenses').insert(toSave);
    if (!error) {
      await db.expenses.update(expense.id, { sync_status: 'synced' });
    } else {
      console.warn("Supabase insert failed, leaving in pending_insert state", error);
    }
  } catch (e) {
    console.log("Device offline, expense queued locally.", e);
  }
}

/**
 * Optimistically updates an expense in the local DB.
 */
export async function syncUpdateExpense(id: string, changes: Partial<Expense>) {
  await db.expenses.update(id, { ...changes, sync_status: 'pending_update' });
  
  try {
    const { error } = await supabase.from('expenses').update(changes).eq('id', id);
    if (!error) {
      await db.expenses.update(id, { sync_status: 'synced' });
    }
  } catch (e) {
    console.log("Device offline, update queued locally.", e);
  }
}

/**
 * Optimistically deletes an expense locally, then pushes the delete.
 */
export async function syncDeleteExpense(id: string) {
  // 1. Mark for deletion in Dexie so UI can filter it out instantly
  await db.expenses.update(id, { sync_status: 'pending_delete' });
  
  // 2. Background attempt
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      // 3. Fully remove from local DB only after remote confirmation
      await db.expenses.delete(id);
    }
  } catch (e) {
    console.log("Device offline, deletion queued locally.", e);
  }
}

export async function syncAddIncome(income: Income) {
  const toSave = { 
    ...income, 
    created_at: income.created_at || new Date().toISOString(),
    sync_status: 'pending_insert' as const 
  };
  await db.incomes.put(toSave);
  try {
    const { error } = await supabase.from('incomes').insert(toSave);
    if (!error) {
      await db.incomes.update(income.id, { sync_status: 'synced' });
    }
  } catch (e) {
    console.log("Device offline, income queued locally.", e);
  }
}

export async function syncUpdateIncome(id: string, changes: Partial<Income>) {
  await db.incomes.update(id, { ...changes, sync_status: 'pending_update' });
  try {
    const { error } = await supabase.from('incomes').update(changes).eq('id', id);
    if (!error) {
      await db.incomes.update(id, { sync_status: 'synced' });
    }
  } catch (e) {
    console.log("Device offline, update queued locally.", e);
  }
}

export async function syncDeleteIncome(id: string) {
  await db.incomes.update(id, { sync_status: 'pending_delete' });
  try {
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (!error) {
      await db.incomes.delete(id);
    }
  } catch (e) {
    console.log("Device offline, deletion queued locally.", e);
  }
}

export async function syncAddRecurring(recurring: RecurringTransaction) {
  await db.recurring_transactions.put({ ...recurring, sync_status: 'pending_insert' });
  try {
    const { error } = await supabase.from('recurring_transactions').insert(recurring);
    if (!error) {
      await db.recurring_transactions.update(recurring.id, { sync_status: 'synced' });
    }
  } catch (e) {
    console.log("Device offline, recurring transaction queued locally.", e);
  }
}

export async function syncUpdateRecurring(id: string, changes: Partial<RecurringTransaction>) {
  await db.recurring_transactions.update(id as string, { ...changes, sync_status: 'pending_update' });
  try {
    const { error } = await supabase.from('recurring_transactions').update(changes).eq('id', id);
    if (!error) {
      await db.recurring_transactions.update(id as string, { sync_status: 'synced' });
    }
  } catch (e) {
    console.log("Device offline, update queued locally.", e);
  }
}

export async function syncDeleteRecurring(id: string) {
  await db.recurring_transactions.update(id as string, { sync_status: 'pending_delete' });
  try {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (!error) {
      await db.recurring_transactions.delete(id as string);
    }
  } catch (e) {
    console.log("Device offline, deletion queued locally.", e);
  }
}

export async function syncAddCategory(category: Omit<LocalCategory, 'sync_status'>) {
  await db.categories.put({ ...category, sync_status: 'pending_insert' });
  try {
    const { error } = await supabase.from('categories').insert(category);
    if (!error) await db.categories.update(category.id, { sync_status: 'synced' });
  } catch (e) {
    console.log("Offline, category queued locally.", e);
  }
}

export async function syncDeleteCategory(id: string) {
  await db.categories.update(id, { sync_status: 'pending_delete' });
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) await db.categories.delete(id);
  } catch (e) {
    console.log("Offline, category deletion queued locally.", e);
  }
}

async function fetchAllFromTable<T>(table: string, orderBy?: string): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    let query = supabase.from(table).select('*').range(from, from + limit - 1);
    if (orderBy) {
      query = query.order(orderBy, { ascending: false });
    }
    
    const { data, error } = await query as unknown as { data: T[] | null, error: Error | null };
      
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      break;
    }
    
    if (data) {
      allData = [...allData, ...data];
      if (data.length < limit) break;
      from += limit;
    } else {
      break;
    }
  }
  return allData;
}

/**
 * Scans the local IndexedDB for any records that need to be pushed to Supabase.
 * This handles 'pending_insert' and 'pending_update' by performing a bulk upsert,
 * and 'pending_delete' by performing a bulk delete.
 */
export async function pushLocalData() {
  // 1. Fetch all pending expenses
  const pendingExpenses = await db.expenses
    .filter(e => e.sync_status !== 'synced')
    .toArray();

  if (pendingExpenses.length > 0) {
    const toUpsert = pendingExpenses
      .filter(e => e.sync_status === 'pending_insert' || e.sync_status === 'pending_update')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ sync_status, ...rest }) => rest);
    
    if (toUpsert.length > 0) {
      const { error } = await supabase.from('expenses').upsert(toUpsert);
      if (!error) {
        const ids = toUpsert.map(e => e.id);
        await db.expenses.where('id').anyOf(ids).modify({ sync_status: 'synced' });
      }
    }

    const toDelete = pendingExpenses
      .filter(e => e.sync_status === 'pending_delete')
      .map(e => e.id);
    
    if (toDelete.length > 0) {
      const { error } = await supabase.from('expenses').delete().in('id', toDelete);
      if (!error) {
        await db.expenses.bulkDelete(toDelete);
      }
    }
  }

  // 2. Fetch all pending incomes
  const pendingIncomes = await db.incomes
    .filter(i => i.sync_status !== 'synced')
    .toArray();

  if (pendingIncomes.length > 0) {
    const toUpsert = pendingIncomes
      .filter(i => i.sync_status === 'pending_insert' || i.sync_status === 'pending_update')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ sync_status, ...rest }) => rest);
    
    if (toUpsert.length > 0) {
      const { error } = await supabase.from('incomes').upsert(toUpsert);
      if (!error) {
        const ids = toUpsert.map(i => i.id);
        await db.incomes.where('id').anyOf(ids).modify({ sync_status: 'synced' });
      }
    }

    const toDelete = pendingIncomes
      .filter(i => i.sync_status === 'pending_delete')
      .map(i => i.id);
    
    if (toDelete.length > 0) {
      const { error } = await supabase.from('incomes').delete().in('id', toDelete);
      if (!error) {
        await db.incomes.bulkDelete(toDelete);
      }
    }
  }

  // 3. Fetch all pending recurring transactions
  const pendingRecurring = await db.recurring_transactions
    .filter(r => r.sync_status !== 'synced')
    .toArray();

  if (pendingRecurring.length > 0) {
    const toUpsert = pendingRecurring
      .filter(r => r.sync_status === 'pending_insert' || r.sync_status === 'pending_update')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ sync_status, ...rest }) => rest);
    
    if (toUpsert.length > 0) {
      const { error } = await supabase.from('recurring_transactions').upsert(toUpsert);
      if (!error) {
        const ids = toUpsert.map(r => r.id);
        await db.recurring_transactions.where('id').anyOf(ids).modify({ sync_status: 'synced' });
      }
    }

    const toDelete = pendingRecurring
      .filter(r => r.sync_status === 'pending_delete')
      .map(r => r.id);
    
    if (toDelete.length > 0) {
      const { error } = await supabase.from('recurring_transactions').delete().in('id', toDelete);
      if (!error) {
        await db.recurring_transactions.bulkDelete(toDelete);
      }
    }
  }

  console.log(`[Sync] Local push complete. Processed ${pendingExpenses.length} expenses, ${pendingIncomes.length} incomes, and ${pendingRecurring.length} recurring.`);
}

/**
 * Sweeps the remote Supabase database and reconciles the local DB.
 * Only overwrites locally if the local item isn't pending an upload.
 */
export async function pullRemoteData() {
  const [expData, incData, catRes] = await Promise.all([
    fetchAllFromTable<Expense>('expenses', 'date'),
    fetchAllFromTable<Income>('incomes', 'date'),
    supabase.from('categories').select('*') // Categories rarely exceed 1000
  ]);

  if (expData) {
    const remoteIds = new Set(expData.map(e => e.id));
    const localItems = await db.expenses.toArray();
    
    // Safety check: Don't overwrite things that are currently pending an outgoing push
    const pendingIds = new Set(localItems.filter(e => e.sync_status !== 'synced').map(e => e.id));

    const toDelete = localItems
      .filter(e => e.sync_status === 'synced' && !remoteIds.has(e.id))
      .map(e => e.id);
    if (toDelete.length > 0) await db.expenses.bulkDelete(toDelete);

    const syncedExp = expData
      .filter(e => !pendingIds.has(e.id))
      .map(e => ({ ...e, sync_status: 'synced' as const }));
    await db.expenses.bulkPut(syncedExp);
  }
  
  if (incData) {
    const remoteIds = new Set(incData.map(i => i.id));
    const localItems = await db.incomes.toArray();
    const pendingIds = new Set(localItems.filter(i => i.sync_status !== 'synced').map(i => i.id));

    const toDelete = localItems
      .filter(i => i.sync_status === 'synced' && !remoteIds.has(i.id))
      .map(i => i.id);
    if (toDelete.length > 0) await db.incomes.bulkDelete(toDelete);

    const syncedInc = incData
      .filter(i => !pendingIds.has(i.id))
      .map(i => ({ ...i, sync_status: 'synced' as const }));
    await db.incomes.bulkPut(syncedInc);
  }

  if (catRes.data) {
    const remoteIds = new Set(catRes.data.map(c => c.id));
    const localItems = await db.categories.toArray();
    const toDelete = localItems
      .filter(c => c.sync_status === 'synced' && !remoteIds.has(c.id))
      .map(c => c.id);
    if (toDelete.length > 0) await db.categories.bulkDelete(toDelete);

    const syncedCat = catRes.data.map(c => ({ ...(c as Omit<LocalCategory, 'sync_status'>), sync_status: 'synced' as const }));
    await db.categories.bulkPut(syncedCat);
  }

  // Recurring transactions pull
  const recurringData = await fetchAllFromTable<RecurringTransaction>('recurring_transactions');
  if (recurringData) {
    const remoteIds = new Set(recurringData.map(r => r.id));
    const localItems = await db.recurring_transactions.toArray();
    const pendingIds = new Set(localItems.filter(r => r.sync_status !== 'synced').map(r => r.id));

    const toDelete = localItems
      .filter(r => r.sync_status === 'synced' && !remoteIds.has(r.id))
      .map(r => r.id);
    if (toDelete.length > 0) await db.recurring_transactions.bulkDelete(toDelete);

    const syncedRec = recurringData
      .filter(r => !pendingIds.has(r.id))
      .map(r => ({ ...r, sync_status: 'synced' as const }));
    await db.recurring_transactions.bulkPut(syncedRec);
  }
}

