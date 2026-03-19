import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const categoryStyles: Record<string, string> = {
  Food: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Transport: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Bills: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Entertainment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Health: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Shopping: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const styles = categoryStyles[category] || categoryStyles.Other;
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', styles, className)}>
      {category}
    </span>
  );
}
