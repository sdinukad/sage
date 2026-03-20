import Dexie, { type EntityTable } from 'dexie';
import { Expense, Income } from '@/shared/models';

export type SyncStatus = 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';

export interface LocalExpense extends Expense {
  sync_status: SyncStatus;
}

export interface LocalIncome extends Income {
  sync_status: SyncStatus;
}

export interface LocalCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  color?: string;
  sync_status: SyncStatus;
}

const db = new Dexie('SageLocalDB') as Dexie & {
  expenses: EntityTable<LocalExpense, 'id'>;
  incomes: EntityTable<LocalIncome, 'id'>;
  categories: EntityTable<LocalCategory, 'id'>;
};

// Schema declaration:
// The first item is the explicitly primary key. The rest are indexed columns.
db.version(2).stores({
  expenses: 'id, date, sync_status',
  incomes: 'id, date, sync_status',
  categories: 'id, name, type, sync_status'
});

export { db };
