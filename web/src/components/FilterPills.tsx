'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';

interface FilterPillsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => {
  const { categories, expenses, incomes } = useExpenseData();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filterList = useMemo(() => {
    const activeCats = categories.map(c => c.name);
    const usedCats = Array.from(new Set([
      ...expenses.map(e => e.category),
      ...incomes.map(i => i.category)
    ]));
    const danglingCats = usedCats.filter(
      cat => !activeCats.includes(String(cat)) && String(cat) !== 'All'
    );
    return ['All', ...activeCats, ...danglingCats];
  }, [categories, expenses, incomes]);

  // Click-and-drag scroll state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false); // Distinguish drag from click

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    hasDragged.current = false;
    scrollRef.current.classList.add('cursor-grabbing'); // Visual feedback
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.classList.remove('cursor-grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault(); // Prevent text selection
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; 
    
    // If we've moved more than 5px, consider it a drag so we can block clicks
    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }
    
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  // Intercept clicks if we were dragging
  const handleCaptureClick = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDragged.current = false; // Reset for next time
    }
  };

  // On desktop there's no touch, so redirect vertical mouse-wheel to horizontal scroll.
  // Must use a native listener with { passive: false } so preventDefault() is honoured.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Only intercept when vertical scroll is the dominant axis
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-30 bg-surface/90 backdrop-blur-md border-b border-border">
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClickCapture={handleCaptureClick}
        className="flex items-center gap-2 py-3 overflow-x-auto filter-scroll cursor-grab snap-x w-full before:content-[''] before:w-4 before:flex-shrink-0 after:content-[''] after:w-4 after:flex-shrink-0 select-none"
      >
        {filterList.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200 border snap-start flex-shrink-0 ${
                isActive
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-container-high'
              }`}
            >
              {cat !== 'All' && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'] }}
                />
              )}
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPills;
