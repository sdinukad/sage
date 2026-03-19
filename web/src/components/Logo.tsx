import React from 'react';

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-[#16a34a] rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-xl">S</span>
      </div>
      <span className="text-2xl font-serif font-semibold tracking-tight text-gray-900 dark:text-white">
        Sage
      </span>
    </div>
  );
};

export default Logo;
