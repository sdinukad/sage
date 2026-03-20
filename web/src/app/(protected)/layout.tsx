'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileShell from '@/components/MobileShell';
import { useAuth } from '@/context/AuthContext';
import { ExpenseDataProvider } from '@/context/ExpenseDataContext';

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

  return (
    <MobileShell>
      <ExpenseDataProvider>
        {children}
      </ExpenseDataProvider>
    </MobileShell>
  );
}
