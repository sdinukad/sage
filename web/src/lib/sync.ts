import { supabase } from './supabase';
import { db, LocalCategory } from './localdb';
import { Expense, Income } from '@/shared/models';

/**
 * Optimistically adds an expense to the local IndexedDB.
 * The UI (`useLiveQuery`) will instantly update in 0ms.
 * Then it silently attempts to push to Supabase.
 */
export async function syncAddExpense(expense: Expense) {
  // 1. 0ms optimistic UI write
  await db.expenses.put({ ...expense, sync_status: 'pending_insert' });
  
  // 2. Background push
  try {
    const { error } = await supabase.from('expenses').insert(expense);
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
  await db.incomes.put({ ...income, sync_status: 'pending_insert' });
  try {
    const { error } = await supabase.from('incomes').insert(income);
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
    const toDelete = localItems
      .filter(e => e.sync_status === 'synced' && !remoteIds.has(e.id))
      .map(e => e.id);
    if (toDelete.length > 0) await db.expenses.bulkDelete(toDelete);

    const syncedExp = expData.map(e => ({ ...e, sync_status: 'synced' as const }));
    await db.expenses.bulkPut(syncedExp);
  }
  
  if (incData) {
    const remoteIds = new Set(incData.map(i => i.id));
    const localItems = await db.incomes.toArray();
    const toDelete = localItems
      .filter(i => i.sync_status === 'synced' && !remoteIds.has(i.id))
      .map(i => i.id);
    if (toDelete.length > 0) await db.incomes.bulkDelete(toDelete);

    const syncedInc = incData.map(i => ({ ...i, sync_status: 'synced' as const }));
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
}

