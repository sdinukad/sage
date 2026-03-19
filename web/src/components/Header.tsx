'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User size={18} />
            <span className="text-sm font-medium">{email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} />
            <span className="sr-only sm:not-sr-only text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
