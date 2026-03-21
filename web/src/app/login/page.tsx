'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
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
    <div className="flex flex-col min-h-dvh bg-surface-container max-w-md mx-auto relative overflow-hidden">
      {/* Top Panel (35%) */}
      <div className="h-[35vh] flex flex-col items-center justify-center text-center px-6">
        <h1 className="font-serif text-[44px] text-white leading-none mb-2">Sage</h1>
        <p className="text-sage-300 text-sm font-sans">Your money, made clear.</p>
      </div>

      {/* Bottom Card (65%) */}
      <div className="flex-1 bg-surface rounded-t-[28px] mt-[-20px] z-10 p-8 flex flex-col">
        <h2 className="font-serif text-[26px] text-on-surface mb-1">Welcome back</h2>
        <p className="text-ink-2 text-sm mb-8">Log in to your account to continue</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field ${error ? 'border-negative' : ''}`}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`input-field ${error ? 'border-negative' : ''}`}
              required
            />
          </div>

          {error && <p className="text-negative text-[12px] mt-1 ml-1">{error}</p>}

          <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <Link href="/register" className="text-primary text-sm font-medium">
            Don&apos;t have an account? Register
          </Link>
        </div>
      </div>
    </div>
  );
}
