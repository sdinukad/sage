'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = 'auto';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-surface-container rounded-t-[28px] max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'} border-t ghost-border`}
        style={{ overscrollBehavior: 'contain' }}
      >
        {/* Handle Bar */}
        <div className="w-9 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-4" />
        
        {/* Header */}
        <div className="px-6 flex items-center justify-between mb-4">
          {title && <h2 className="text-[22px] font-serif font-semibold text-on-surface">{title}</h2>}
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
