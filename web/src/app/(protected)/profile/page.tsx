'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Tag, ChevronRight, Palette } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

function ThemeOption({
  theme,
  label,
  current,
  onChange,
}: {
  theme: string;
  label: string;
  current: string | undefined;
  onChange: (t: string) => void;
}) {
  const isActive = current === theme;
  return (
    <button
      onClick={() => onChange(theme)}
      className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-medium transition-all duration-150 ${
        isActive
          ? 'bg-primary text-on-primary shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background px-4 lg:px-8 py-6 lg:py-8 animate-[fadeSlideUp_0.35s_ease-out]">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="font-serif text-[26px] font-semibold text-on-surface">Settings</h1>
        <p className="text-[13px] text-on-surface-variant mt-0.5 font-medium">{user?.email || 'User'}</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
        {/* ── Left Column: UI & Customization ── */}
        <div className="flex flex-col gap-8">
          {/* ── Appearance ── */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[12px] font-medium text-on-surface-variant px-1 uppercase tracking-widest">
              Appearance
            </h2>
            <div className="card overflow-hidden border border-outline-variant/20">
              <div className="p-4 bg-surface flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Palette size={20} className="text-primary" />
                  <span className="font-medium text-[15px] text-on-surface">Theme</span>
                </div>
                {mounted && (
                  <div className="flex gap-1 bg-surface-container-high rounded-xl p-1">
                    <ThemeOption
                      theme="light"
                      label="Light"
                      current={theme}
                      onChange={setTheme}
                    />
                    <ThemeOption
                      theme="dark"
                      label="Dark"
                      current={theme}
                      onChange={setTheme}
                    />
                    <ThemeOption
                      theme="system"
                      label="System"
                      current={theme}
                      onChange={setTheme}
                    />
                  </div>
                )}
                {mounted && (
                  <p className="text-[12px] text-on-surface-variant/60">
                    Currently using: <span className="font-medium text-on-surface-variant">{resolvedTheme}</span> mode
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Customization ── */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[12px] font-medium text-on-surface-variant px-1 uppercase tracking-widest">
              Customization
            </h2>
            <div className="card overflow-hidden divide-y divide-outline-variant/20 border border-outline-variant/20">
              <button
                onClick={() => router.push('/categories')}
                className="w-full flex items-center justify-between p-4 bg-surface hover:bg-surface-container-high transition-colors text-left text-on-surface"
              >
                <div className="flex items-center gap-3">
                  <Tag size={20} className="text-primary" />
                  <span className="font-medium text-[15px]">Manage Categories</span>
                </div>
                <ChevronRight size={18} className="text-on-surface-variant" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Account ── */}
        <div className="flex flex-col gap-8">
          {/* ── Account ── */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[12px] font-medium text-on-surface-variant px-1 uppercase tracking-widest">
              Account
            </h2>
            <div className="card overflow-hidden border border-outline-variant/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center p-4 bg-surface hover:bg-error/10 transition-colors text-left"
                style={{ color: 'var(--error)' }}
              >
                <div className="flex items-center gap-3">
                  <LogOut size={20} />
                  <span className="font-medium text-[15px]">Log Out</span>
                </div>
              </button>
            </div>
          </div>

          <p className="text-[12px] text-on-surface-variant/50 lg:text-left mt-4 px-1">
            Sage v1.0.0 · Personal Finance AI
          </p>
        </div>
      </div>
    </div>
  );
}
