'use client';

import React from 'react';

const categories = ['All', 'Food', 'Transport', 'Bills', 'Entertainment', 'Health', 'Shopping', 'Other'];

interface FilterPillsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar snap-x">
        {categories.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 border snap-start ${
                isActive 
                ? 'bg-sage-500 text-white border-sage-500' 
                : 'bg-white dark:bg-gray-900 text-ink-2 border-border'
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
