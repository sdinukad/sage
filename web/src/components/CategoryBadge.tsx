import React from 'react';

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
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];

  if (dotOnly) {
    return (
      <div 
        className={`rounded-full ${className}`} 
        style={{ backgroundColor: color, width: '10px', height: '10px' }} 
      />
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${className}`}
         style={{ backgroundColor: `${color}1A`, color: color }}>
      <div className="rounded-full" style={{ backgroundColor: color, width: '6px', height: '6px' }} />
      {category}
    </div>
  );
};

export default CategoryBadge;
export { CATEGORY_COLORS };
