'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sage-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-8 animate-[fadeSlideUp_0.35s_ease-out]">
      <div className="w-24 h-24 rounded-full bg-secondary-container flex items-center justify-center border border-outline">
        <User size={48} className="text-on-secondary-container" />
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="font-serif text-[24px] text-on-surface">Profile</h1>
        <p className="text-[14px] text-ink-2 font-mono">{user?.email || 'User'}</p>
      </div>

      <button 
        onClick={handleLogout}
        className="btn-primary w-full bg-red-500 hover:bg-red-600 border-red-600 flex items-center justify-center gap-2 mt-4"
      >
        <LogOut size={18} />
        Log Out
      </button>

      <div className="mt-8 text-center">
        <p className="text-[12px] text-on-surface-variant">Sage v1.0.0</p>
        <p className="text-[11px] text-on-surface-variant mt-1 opacity-50 uppercase tracking-widest">Premium Mobile Web Experience</p>
      </div>
    </div>
  );
}
