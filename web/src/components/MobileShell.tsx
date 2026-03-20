'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Clock, Sparkles, User, Plus, Bell, Sun, Moon, WifiOff, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

const AddExpenseModal = dynamic(() => import('./AddExpenseModal'), { ssr: false, loading: () => null });

// Theme Toggle Component
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-9 h-9" />; // Placeholder to avoid shift

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-on-surface-variant hover:text-on-surface transition-colors"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

interface MobileShellProps {
  children: React.ReactNode;
}

const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasRenderedModal, setHasRenderedModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isModalOpen && !hasRenderedModal) {
    setHasRenderedModal(true);
  }

  const navItems = [
    { label: 'Chat', icon: Sparkles, href: '/chat' },
    { label: 'Dashboard', icon: House, href: '/dashboard' },
    { label: 'History', icon: Clock, href: '/history' },
    { label: 'Tags', icon: Tag, href: '/categories' },
    { label: 'Profile', icon: User, href: '/profile' },
  ];

  const userInitial = user?.email?.[0].toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative shadow-xl">
      {/* Sticky Header */}
      <header className="sticky-header sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 flex items-center justify-between">
        <span className="font-serif text-[20px] font-semibold text-on-surface">Sage</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
            <Bell size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-medium text-sm ml-1">
            {userInitial}
          </div>
        </div>
      </header>

      {/* Global Offline Banner */}
      {isOffline && (
        <div className="bg-error text-on-error px-4 py-1.5 text-[13px] font-medium text-center flex items-center justify-center gap-2 z-50">
          <WifiOff size={14} />
          You are offline. Showing local data.
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* FAB */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-5 w-14 h-14 rounded-full flex items-center justify-center text-on-primary z-40 active:scale-90 transition-transform duration-200"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--on-primary-container) 100%)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)'
        }}
      >
        <Plus size={24} />
      </button>

      {/* Bottom Nav */}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface/80 backdrop-blur-[20px] border-t border-outline-variant/10 flex items-center justify-around h-[calc(64px+env(safe-area-inset-bottom))] z-40">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors duration-150 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {hasRenderedModal && (
        <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default MobileShell;
