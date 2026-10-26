import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { PageSpinner } from '@/components/ui/Skeleton';

export const metadata: Metadata = {
  title: 'Signing in',
};

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageSpinner label="Verifying your link…" />}>
      <AuthCallback />
    </Suspense>
  );
}
