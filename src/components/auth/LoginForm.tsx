'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice';
import { authPath } from '@/lib/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useRedirectIfAuthenticated } from '@/hooks/auth/useRedirectIfAuthenticated';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  useRedirectIfAuthenticated(next);

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const error = useAuthStore((state) => state.error);
  const fieldErrors = useAuthStore((state) => state.fieldErrors);
  const clearError = useAuthStore((state) => state.clearError);
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const success = await login(email, password);
    if (success) {
      toast.success('Welcome back', 'Your boards are ready.');
    }
  };

  return (
    <div className="space-y-5">
      {!isConfigured ? <SupabaseSetupNotice /> : null}

      {error && isConfigured ? (
        <Alert variant="danger" onDismiss={clearError} className="animate-fade-in">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          required
          error={fieldErrors.email}
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          error={fieldErrors.password}
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          labelExtra={
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-accent-hover hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          loadingLabel="Signing in"
          disabled={!isConfigured}
        >
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        New to Flowboard?{' '}
        <Link
          href={authPath('/auth/register', next)}
          className="font-semibold text-accent-hover hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
