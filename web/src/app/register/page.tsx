'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    if (!error) {
      router.push('/chat');
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-[fadeSlideUp_0.4s_ease-out]">
        {/* Brand header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-[42px] leading-none text-on-surface mb-2">Sage</h1>
          <p className="text-[14px] text-on-surface-variant">Your money, made clear.</p>
        </div>

        {/* Form card */}
        <div className="bg-surface rounded-3xl p-8 shadow-lg border border-outline-variant/30">
          <div className="mb-7">
            <h2 className="font-serif text-[24px] text-on-surface mb-1">Create account</h2>
            <p className="text-[14px] text-on-surface-variant">Start spending smarter with Sage</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-medium text-on-surface-variant">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-on-surface-variant">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${error && error.includes('match') ? 'border-[var(--error)]' : ''}`}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-[13px] font-medium text-on-surface-variant">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-field ${error && error.includes('match') ? 'border-[var(--error)]' : ''}`}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-[13px] font-medium"
                style={{ backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-1 py-3.5"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-[14px] font-medium transition-opacity hover:opacity-75"
              style={{ color: 'var(--primary)' }}
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[12px] text-on-surface-variant/50 mt-6">
          Sage · Personal Finance AI
        </p>
      </div>
    </div>
  );
}
