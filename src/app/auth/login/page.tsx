import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open your boards and pick up right where you left off."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
