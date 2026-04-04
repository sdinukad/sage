'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { ExpenseDataProvider } from '@/context/ExpenseDataContext';
import { SettingsProvider } from '@/context/SettingsContext';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <AppShell>
      <ExpenseDataProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </ExpenseDataProvider>
    </AppShell>
  );
}

