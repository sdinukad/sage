'use client';

import { useState } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { Trash2, Plus, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';

  const PRESET_COLORS = ['#ff9f43', '#54a0ff', '#ee5253', '#5f27cd', '#1dd1a1', '#ff6b6b', '#10ac84', '#2e86de', '#f368e0', '#22a6b3', '#be2edd', '#4834d4'];
  const { categories, addCategory, deleteCategory } = useExpenseData();
  const [newName, setNewName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    await addCategory(newName.trim(), type, selectedColor);
    setNewName('');
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 h-[64px] flex items-center gap-4 border-b border-border">
        <Link href="/dashboard" className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-serif text-[24px] font-semibold text-on-surface">Categories</h1>
      </header>

      <div className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col gap-6">
        {/* Add Category Trigger */}
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/20 transition-colors"
          >
            <Plus size={20} />
            <span>Add New Category</span>
          </button>
        ) : (
          <form onSubmit={handleAdd} className="card p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Name</label>
              <input 
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Hobbies, Gym, Travel"
                className="bg-surface-container-lowest border border-border rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Type</label>
              <div className="flex gap-2 p-1 bg-surface-container rounded-xl">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'expense' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
                >
                  Expense
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2 text-[14px] font-medium rounded-lg transition-all ${type === 'income' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">Color</label>
              <div className="flex flex-wrap gap-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 text-[14px] font-medium text-on-surface-variant"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-[2] py-3 bg-primary text-on-primary rounded-xl font-medium shadow-lg active:scale-95 transition-transform"
              >
                Create Category
              </button>
            </div>
          </form>
        )}

        {/* Categories List */}
        <div className="flex flex-col gap-3 pb-24">
          <h2 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider px-1">Your Categories</h2>
          
          <div className="flex flex-col gap-2">
            {categories.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant opacity-60">
                <Tag size={32} className="mx-auto mb-2 opacity-20" />
                <p>No categories yet. Add one above.</p>
              </div>
            ) : (
              categories.sort((a,b) => a.name.localeCompare(b.name)).map((cat) => (
                <div key={cat.id} className="card p-4 flex items-center justify-between group h-[60px]">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color || '#8395a7' }} 
                    />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-medium text-on-surface">{cat.name}</span>
                      <span className="text-[11px] text-on-surface-variant uppercase tracking-tighter">{cat.type}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (confirm(`Delete "${cat.name}"? Existing expenses will keep this category name but lose their assigned color and will show up in filters as individual tags.`)) {
                        deleteCategory(cat.id);
                      }
                    }}
                    className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 transition-all rounded-lg opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
