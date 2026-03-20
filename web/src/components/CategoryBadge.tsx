import React, { useMemo } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';

const CATEGORY_COLORS: Record<string, string> = {
  'Food': '#ff9f43',
  'Transport': '#54a0ff',
  'Bills': '#ee5253',
  'Entertainment': '#5f27cd',
  'Health': '#1dd1a1',
  'Shopping': '#ff6b6b',
  'Other': '#8395a7',
  'All': '#4a7c59'
};

interface CategoryBadgeProps {
  category: string;
  dotOnly?: boolean;
  className?: string;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, dotOnly = false, className = "" }) => {
  const { categories } = useExpenseData();
  
  const color = useMemo(() => {
    if (category === 'All') return CATEGORY_COLORS['All'];
    const custom = categories.find(c => c.name === category);
    if (custom?.color) return custom.color;
    return CATEGORY_COLORS['Other']; // Gray fallback for dangling categories
  }, [category, categories]);

  const isDangling = useMemo(() => {
    if (category === 'All') return false;
    return !categories.find(c => c.name === category);
  }, [category, categories]);

  if (dotOnly) {
    return (
      <div 
        className={`rounded-full ${className}`} 
        style={{ backgroundColor: color, width: '10px', height: '10px' }} 
      />
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${isDangling ? 'border-dashed border-on-surface-variant/30' : 'border-transparent'} ${className}`}
         style={{ backgroundColor: `${color}1A`, color: color }}>
      <div className="rounded-full" style={{ backgroundColor: color, width: '6px', height: '6px' }} />
      {category}
    </div>
  );
};

export default CategoryBadge;
export { CATEGORY_COLORS };
