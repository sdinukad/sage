'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/localdb';
import { RecurringTransaction } from '@/shared/models';
import { Trash2, Edit2, Calendar, Repeat, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { syncDeleteRecurring } from '@/lib/sync';
import { useState } from 'react';
import ExpenseModal from './ExpenseModal';

export default function RecurringList() {
  const recurring = useLiveQuery(() => db.recurring_transactions.toArray()) || [];
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring transaction?')) {
      await syncDeleteRecurring(id);
    }
  };

  if (recurring.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
        <div className="w-12 h-12 rounded-full bg-surface-variant/30 flex items-center justify-center mb-4 text-on-surface-variant/50">
          <Repeat size={24} />
        </div>
        <h3 className="text-sm font-medium text-on-surface">No recurring transactions</h3>
        <p className="text-xs text-on-surface-variant mt-1 max-w-[200px]">
          Create one from the add expense menu to automate your tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recurring.map((t) => (
        <div 
          key={t.id}
          className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-outline-variant/50 hover:border-primary/30 transition-all group"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            t.type === 'income' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {t.type === 'income' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-on-surface truncate">{t.note || t.category}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-variant text-on-surface-variant font-bold uppercase tracking-wider">
                {t.frequency}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-mono font-medium text-on-surface-variant">
                {t.currency} {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-on-surface-variant/60 flex items-center gap-1">
                <Calendar size={10} />
                Starts {new Date(t.start_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingTransaction(t)}
              className="p-2 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      {editingTransaction && (
        <ExpenseModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          initialData={editingTransaction}
        />
      )}
    </div>
  );
}
