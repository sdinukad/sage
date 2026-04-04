import Dexie, { type EntityTable } from 'dexie';
import { Expense, Income, RecurringTransaction } from '@/shared/models';

export type SyncStatus = 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';

export interface LocalExpense extends Expense {
  sync_status: SyncStatus;
}

export interface LocalIncome extends Income {
  sync_status: SyncStatus;
}

export interface LocalRecurringTransaction extends RecurringTransaction {
  sync_status: SyncStatus;
}

export interface LocalCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  color?: string;
  ai_hints?: string;
  sync_status: SyncStatus;
}

export interface LocalExchangeRate {
  from_currency: string;
  to_currency: string;
  date: string; // YYYY-MM-DD
  rate: number;
}

const db = new Dexie('SageLocalDB') as Dexie & {
  expenses: EntityTable<LocalExpense, 'id'>;
  incomes: EntityTable<LocalIncome, 'id'>;
  categories: EntityTable<LocalCategory, 'id'>;
  exchange_rates: EntityTable<LocalExchangeRate, 'from_currency'>;
  recurring_transactions: EntityTable<LocalRecurringTransaction, 'id'>;
};

// v2: Original schema
db.version(2).stores({
  expenses: 'id, date, sync_status',
  incomes: 'id, date, sync_status',
  categories: 'id, name, type, sync_status'
});

// v3: Multi-currency support
db.version(3).stores({
  expenses: 'id, date, sync_status, currency',
  incomes: 'id, date, sync_status, currency',
  categories: 'id, name, type, sync_status',
  exchange_rates: '[from_currency+to_currency+date], date'
}).upgrade(tx => {
  // Backfill existing expenses with LKR defaults
  tx.table('expenses').toCollection().modify(exp => {
    if (!exp.currency) {
      exp.currency = 'LKR';
      exp.base_amount = exp.amount;
      exp.base_currency = 'LKR';
      exp.exchange_rate = 1;
    }
  });
  // Backfill existing incomes with LKR defaults
  tx.table('incomes').toCollection().modify(inc => {
    if (!inc.currency) {
      inc.currency = 'LKR';
      inc.base_amount = inc.amount;
      inc.base_currency = 'LKR';
      inc.exchange_rate = 1;
    }
  });
});

// v5: Better transaction ordering with created_at
db.version(5).stores({
  expenses: 'id, date, sync_status, currency, created_at',
  incomes: 'id, date, sync_status, currency, created_at',
  categories: 'id, name, type, sync_status',
  exchange_rates: '[from_currency+to_currency+date], date',
  recurring_transactions: 'id, user_id, active, frequency, type, sync_status'
}).upgrade(tx => {
  // Backfill created_at for expenses using date if missing
  tx.table('expenses').toCollection().modify(exp => {
    if (!exp.created_at) {
      exp.created_at = new Date(exp.date).toISOString();
    }
  });
  // Backfill created_at for incomes using date if missing
  tx.table('incomes').toCollection().modify(inc => {
    if (!inc.created_at) {
      inc.created_at = new Date(inc.date).toISOString();
    }
  });
});

export { db };
