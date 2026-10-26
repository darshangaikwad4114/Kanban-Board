'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

export function ResetPasswordForm() {
  const router = useRouter();
  const updatePassword = useAuthStore((state) => state.updatePassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const error = useAuthStore((state) => state.error);
  const fieldErrors = useAuthStore((state) => state.fieldErrors);
  const clearError = useAuthStore((state) => state.clearError);
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const success = await updatePassword(password, confirmPassword);
    if (success) {
      toast.success('Password updated', 'You can keep working with your new password.');
      router.replace('/dashboard');
    }
  };

  if (isInitializing) {
    return (
      <div className="card space-y-3 p-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">This link is no longer valid</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Password reset links can only be used once and expire quickly. Request a fresh link
          to continue.
        </p>
        <div className="mt-5 space-y-2">
          <Link href="/auth/forgot-password" className="btn-primary w-full">
            Request a new link
          </Link>
          <Link href="/auth/login" className="btn-ghost w-full">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <Alert variant="danger" onDismiss={clearError} className="animate-fade-in">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <PasswordField
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={fieldErrors.password}
          hint="Use at least 8 characters."
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
        />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          required
          error={fieldErrors.confirmPassword}
          leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          loadingLabel="Updating password"
        >
          Update password
        </Button>
      </form>
    </div>
  );
}
