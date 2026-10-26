'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}
