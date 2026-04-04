'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Loader2, Tag, ChevronRight, Palette, Coins } from 'lucide-react';
import RecurringList from '@/components/RecurringList';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { SUPPORTED_CURRENCIES } from '@/shared/models';

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
  const { currency: currentCurrency, updateCurrency, isConverting } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h2 className="section-label px-1">Appearance</h2>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
                  >
                    <Palette size={16} strokeWidth={2} />
                  </div>
                  <span className="font-medium text-[15px] text-on-surface">Theme</span>
                </div>
                {mounted && (
                  <div
                    className="flex gap-1 rounded-xl p-1"
                    style={{ backgroundColor: 'var(--surface-container-high)' }}
                  >
                    <ThemeOption theme="light" label="☀️ Light" current={theme} onChange={setTheme} />
                    <ThemeOption theme="dark" label="🌙 Dark" current={theme} onChange={setTheme} />
                    <ThemeOption theme="system" label="⚙️ System" current={theme} onChange={setTheme} />
                  </div>
                )}
                {mounted && (
                  <p className="text-[12px] px-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                    Currently: <span style={{ opacity: 1, fontWeight: 500 }}>{resolvedTheme} mode</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Currency Selection (Consolidated) ── */}
          <div className="flex flex-col gap-2">
            <h2 className="section-label px-1">Currency</h2>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' }}
                  >
                    <Coins size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="font-medium text-[15px] text-on-surface block">Home Currency</span>
                    <p className="text-[11px] text-on-surface-variant font-medium">Select your primary reporting currency</p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search currencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-high border-none rounded-xl py-2 padding-left pl-10 pr-4 text-[13px] outline-none focus:ring-2 ring-primary/20 transition-all font-medium placeholder:text-on-surface-variant/30 text-on-surface"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
                    </button>
                  )}
                </div>

                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1 thin-scrollbar"
                >
                  {filteredCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => updateCurrency(c.code)}
                      disabled={isConverting}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-[13px] font-medium transition-all ${
                        currentCurrency === c.code
                          ? 'bg-primary/10 border-primary text-primary shadow-sm scale-[0.98]'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      } ${isConverting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-[16px]">{c.flag}</span>
                      <span className="flex-1 text-left truncate">{c.code}</span>
                      {currentCurrency === c.code && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                  {filteredCurrencies.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/30">
                      <p className="text-[12px] text-on-surface-variant font-medium">No currencies found matching &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
                
                <p className="text-[11px] px-1 italic" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                  Changing your currency will update all existing transactions using historical exchange rates.
                </p>
              </div>
            </div>
          </div>

          {/* ── Customization ── */}
          <div className="flex flex-col gap-2">
            <h2 className="section-label px-1">Customization</h2>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <button
                onClick={() => router.push('/categories')}
                className="w-full flex items-center justify-between p-4 text-left transition-colors"
                style={{ color: 'var(--on-surface)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    'var(--surface-container-low)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = '')
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}
                  >
                    <Tag size={16} strokeWidth={2} />
                  </div>
                  <span className="font-medium text-[15px]">Manage Categories</span>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--on-surface-variant)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Account ── */}
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="section-label px-1">Account</h2>
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: '1px solid color-mix(in srgb, var(--outline-variant) 50%, transparent)',
                backgroundColor: 'var(--surface)',
              }}
            >
              <button
                onClick={handleLogout}
                className="w-full flex items-center p-4 text-left transition-colors"
                style={{ color: 'var(--error)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor =
                    'color-mix(in srgb, var(--error) 8%, transparent)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = '')
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}
                  >
                    <LogOut size={16} strokeWidth={2} />
                  </div>
                  <span className="font-medium text-[15px]">Log Out</span>
                </div>
              </button>
            </div>
          </div>

          {/* ── Recurring Transactions ── */}
          <div className="flex flex-col gap-2">
            <h2 className="section-label px-1">Recurring Transactions</h2>
            <div
              className="overflow-hidden rounded-2xl"
            >
              <RecurringList />
            </div>
          </div>

          <p className="text-[12px] px-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }}>
            Sage v1.0.0 · Personal Finance AI
          </p>
        </div>
      </div>
      {/* ── Re-conversion Overlay ── */}
      {isConverting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-surface border border-outline-variant shadow-2xl max-w-[280px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-on-surface">Updating Currency</h3>
              <p className="text-[13px] text-on-surface-variant mt-1">
                Recalculating all transactions using historical exchange rates...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
