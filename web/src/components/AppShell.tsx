'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Clock,
  Sparkles,
  Plus,
  Sun,
  Moon,
  WifiOff,
  Settings,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

const ExpenseModal = dynamic(() => import('./ExpenseModal'), { ssr: false, loading: () => null });

// ────────────────────────────────────────────────────────────
// Theme Toggle
// ────────────────────────────────────────────────────────────
function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className={compact ? 'w-9 h-9' : 'w-9 h-9'} />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
      title="Toggle theme"
    >
      {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Nav items
// ────────────────────────────────────────────────────────────
const navItems = [
  { label: 'Chat', icon: Sparkles, href: '/chat' },
  { label: 'Dashboard', icon: House, href: '/dashboard' },
  { label: 'History', icon: Clock, href: '/history' },
  { label: 'Settings', icon: Settings, href: '/profile' },
];

// ────────────────────────────────────────────────────────────
// Desktop Sidebar
// ────────────────────────────────────────────────────────────
function DesktopSidebar({
  pathname,
  onAddExpense,
}: {
  pathname: string;
  onAddExpense: () => void;
}) {
  return (
    <aside className="hidden lg:flex flex-col shrink-0 w-[220px] xl:w-[240px] h-screen sticky top-0 border-r border-outline-variant/20 bg-surface/60 backdrop-blur-md">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <span className="font-serif text-[22px] font-semibold text-on-surface tracking-tight">
          Sage
        </span>
        <p className="text-[11px] text-on-surface-variant mt-0.5 font-medium uppercase tracking-widest">
          Finance AI
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-1 mt-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors ${
                  isActive
                    ? 'text-on-primary-container'
                    : 'text-on-surface-variant group-hover:text-on-surface'
                }`}
              />
              {label}
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}

      </nav>

      {/* Add Expense CTA */}
      <div className="px-3 pb-4 flex flex-col gap-3">
        {/* 
        <button
          onClick={onAddExpense}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--on-primary-container) 100%)',
            color: 'var(--on-primary)',
          }}
        >
          <Plus size={16} />
          Add Expense
        </button> 
        */}

        {/* Theme + version */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-on-surface-variant opacity-60">v1.0.0</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Mobile Header
// ────────────────────────────────────────────────────────────
function MobileHeader({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <header className="lg:hidden sticky-header sticky top-0 z-40 bg-surface/80 backdrop-blur-md px-4 flex items-center justify-between border-b border-outline-variant/10">
      <span className="font-serif text-[20px] font-semibold text-on-surface">Sage</span>
      <div className="flex items-center gap-1">
        {/* 
        <button
          onClick={onAddExpense}
          className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container-high"
          title="Add expense"
        >
          <Plus size={20} />
        </button> 
        */}
        <ThemeToggle />
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────
// Mobile Bottom Nav
// ────────────────────────────────────────────────────────────
function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="lg:hidden bottom-nav fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-[20px] border-t border-outline-variant/10 flex items-center justify-around h-[calc(64px+env(safe-area-inset-bottom))] z-40">
      {navItems.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-colors duration-150 ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Icon size={22} />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ────────────────────────────────────────────────────────────
// AppShell
// ────────────────────────────────────────────────────────────
interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  useAuth();
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

  const openModal = () => {
    if (!hasRenderedModal) setHasRenderedModal(true);
    setIsModalOpen(true);
  };

  const isChatPage = pathname === '/chat';

  return (
    <div className="min-h-dvh bg-background flex">
      {/* ── Desktop sidebar ── */}
      <DesktopSidebar pathname={pathname} onAddExpense={openModal} />

      {/* ── Right side: header + content ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isChatPage ? 'lg:h-screen lg:overflow-hidden' : ''
        }`}
      >
        {/* Mobile-only header */}
        <MobileHeader onAddExpense={openModal} />

        {/* Offline banner */}
        {isOffline && (
          <div className="bg-error text-on-error px-4 py-1.5 text-[13px] font-medium text-center flex items-center justify-center gap-2 z-50">
            <WifiOff size={14} />
            You are offline. Showing local data.
          </div>
        )}

        {/* Desktop page title bar (hidden on chat) */}
        {!isChatPage && (
          <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-2">
            <div className="flex flex-col">
              {/* Intentionally empty — pages render their own headings */}
            </div>
          </div>
        )}

        {/* Main content */}
        <main
          className={`${
            isChatPage
              ? 'flex-1 flex flex-col overflow-hidden'
              : 'flex-1 overflow-y-auto pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-8'
          }`}
        >
          {isChatPage ? (
            children
          ) : (
            <div className="max-w-[1200px] mx-auto w-full">
              {children}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav pathname={pathname} />

      {/* Expense Modal */}
      {hasRenderedModal && (
        <ExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default AppShell;
