'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sanitizeNext } from '@/lib/navigation';
import { useAuthStore } from '@/stores/authStore';

export function useRedirectIfAuthenticated(next?: string | null) {
  const router = useRouter();
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      router.replace(sanitizeNext(next));
    }
  }, [isInitializing, isAuthenticated, next, router]);

  return { isInitializing, isAuthenticated };
}
