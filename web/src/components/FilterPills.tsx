'use client';

import React, { useMemo } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';

interface FilterPillsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => {
  const { categories, expenses } = useExpenseData();
  
  const filterList = useMemo(() => {
    // Standard expense categories from the settings
    const activeCats = categories.filter(c => c.type === 'expense').map(c => c.name);
    
    // Find any categories used in actual expenses that AREN'T in the active list
    const usedCats = Array.from(new Set(expenses.map(e => e.category)));
    const danglingCats = usedCats.filter(cat => !activeCats.includes(String(cat)) && String(cat) !== 'All');
    
    return ['All', ...activeCats, ...danglingCats];
  }, [categories, expenses]);
  return (
    <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar snap-x">
        {filterList.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 border snap-start ${
                isActive 
                ? 'bg-primary text-on-primary border-primary' 
                : 'bg-surface text-on-surface-variant border-outline-variant'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPills;
