import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { AuthShell } from '@/components/auth/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create account',
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with a template, invite your team, and keep every card moving."
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
