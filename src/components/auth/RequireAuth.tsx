'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice';
import { PageSpinner } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/store/authStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isConfigured = useAuthStore((state) => state.isConfigured);

  useEffect(() => {
    if (isInitializing || !isConfigured || isAuthenticated) return;
    const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
    router.replace(`/auth/login${next}`);
  }, [isInitializing, isConfigured, isAuthenticated, pathname, router]);

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <SupabaseSetupNotice className="w-full max-w-xl" />
      </div>
    );
  }

  if (isInitializing || !isAuthenticated) {
    return (
      <PageSpinner
        label={isInitializing ? 'Loading your workspace…' : 'Redirecting to sign in…'}
      />
    );
  }

  return <>{children}</>;
}
