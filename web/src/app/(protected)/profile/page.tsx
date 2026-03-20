'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Loader2, Settings, Tag, ChevronRight } from 'lucide-react';
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
      <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center border border-border">
        <Settings size={40} className="text-on-surface-variant" />
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="font-serif text-[28px] text-on-surface">Settings</h1>
        <p className="text-[14px] text-on-surface-variant font-medium">{user?.email || 'User'}</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6 mt-4">
        {/* Data & Customization Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[12px] font-medium text-on-surface-variant px-2 uppercase tracking-widest">Customization</h2>
          <div className="card overflow-hidden divide-y divide-border/50 border border-border">
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

        {/* Account Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[12px] font-medium text-on-surface-variant px-2 uppercase tracking-widest">Account</h2>
          <div className="card overflow-hidden border border-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center p-4 bg-surface hover:bg-error/10 transition-colors text-left text-error"
            >
              <div className="flex items-center gap-3">
                <LogOut size={20} />
                <span className="font-medium text-[15px]">Log Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[12px] text-on-surface-variant">Sage v1.0.0</p>
        <p className="text-[11px] text-on-surface-variant mt-1 opacity-50 uppercase tracking-widest">Premium Mobile Web Experience</p>
      </div>
    </div>
  );
}
