'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Clock,
  Sparkles,
  Sun,
  Moon,
  WifiOff,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

// ────────────────────────────────────────────────────────────
// Theme Toggle
// ────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg transition-all duration-150 hover:bg-surface-container-high"
      style={{ color: 'var(--on-surface-variant)' }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun size={17} strokeWidth={2} />
        : <Moon size={17} strokeWidth={2} />
      }
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
function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 w-[220px] xl:w-[248px] h-screen sticky top-0"
      style={{
        borderRight: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
        backgroundColor: 'var(--surface)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[22px] font-semibold text-on-surface tracking-tight">
            Sage
          </span>
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
            }}
          >
            AI
          </span>
        </div>
        <p className="text-[11px] text-on-surface-variant mt-1 opacity-60">
          Personal Finance
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 mb-3 h-px" style={{ backgroundColor: 'var(--outline-variant)', opacity: 0.4 }} />

      {/* Nav */}
      <nav className="flex-1 px-3 flex flex-col gap-0.5 overflow-y-auto thin-scrollbar">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group ${
                isActive
                  ? 'text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              style={
                isActive
                  ? { backgroundColor: 'var(--primary-container)' }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--surface-container)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }
              }}
            >
              <Icon
                size={17}
                strokeWidth={isActive ? 2.5 : 2}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? 'text-on-primary-container'
                    : 'text-on-surface-variant group-hover:text-on-surface'
                }`}
              />
              <span>{label}</span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--primary)',
                    animation: 'dotPop 0.2s ease-out',
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 flex flex-col gap-2">
        <div className="mx-1 mb-1 h-px" style={{ backgroundColor: 'var(--outline-variant)', opacity: 0.3 }} />
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] text-on-surface-variant opacity-40 font-medium">
            v1.0.0
          </span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Mobile Header
// ────────────────────────────────────────────────────────────
function MobileHeader() {
  return (
    <header
      className="lg:hidden sticky-header sticky top-0 z-40 backdrop-blur-md px-4 flex items-center justify-between"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface) 80%, transparent)',
        borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
      }}
    >
      <span className="font-serif text-[20px] font-semibold text-on-surface">Sage</span>
      <div className="flex items-center gap-1">
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
    <nav
      className="lg:hidden bottom-nav fixed bottom-0 left-0 right-0 backdrop-blur-[20px] flex items-center justify-around h-[calc(64px+env(safe-area-inset-bottom))] z-40"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--surface) 90%, transparent)',
        borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 25%, transparent)',
      }}
    >
      {navItems.map(({ label, icon: Icon, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 min-w-[64px] transition-all duration-150 relative"
            style={{ color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)' }}
          >
            {isActive && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                style={{ backgroundColor: 'var(--primary)' }}
              />
            )}
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
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

  const isChatPage = pathname === '/chat';

  return (
    <div
      className={`bg-background flex ${
        isChatPage ? 'h-dvh overflow-hidden' : 'min-h-dvh'
      }`}
    >
      {/* ── Desktop sidebar ── */}
      <DesktopSidebar pathname={pathname} />

      {/* ── Right side: header + content ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isChatPage ? 'h-full overflow-hidden' : ''
        }`}
      >
        {/* Mobile-only header */}
        <MobileHeader />

        {/* Offline banner */}
        {isOffline && (
          <div
            className="px-4 py-2 text-[13px] font-medium text-center flex items-center justify-center gap-2 z-50"
            style={{
              backgroundColor: 'var(--error-container)',
              color: 'var(--on-error-container)',
            }}
          >
            <WifiOff size={14} />
            You are offline — showing cached data
          </div>
        )}

        {/* Main content */}
        <main
          className={`${
            isChatPage
              ? 'flex-1 flex flex-col overflow-hidden chat-main'
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
    </div>
  );
};

export default AppShell;
