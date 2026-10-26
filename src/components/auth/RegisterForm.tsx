'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Lock, Mail, MailCheck, UserRound } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice';
import { authPath } from '@/lib/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useRedirectIfAuthenticated } from '@/hooks/auth/useRedirectIfAuthenticated';

export function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  useRedirectIfAuthenticated(next);

  const register = useAuthStore((state) => state.register);
  const resendConfirmationEmail = useAuthStore(
    (state) => state.resendConfirmationEmail
  );
  const isLoading = useAuthStore((state) => state.isLoading);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const error = useAuthStore((state) => state.error);
  const fieldErrors = useAuthStore((state) => state.fieldErrors);
  const clearError = useAuthStore((state) => state.clearError);
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const outcome = await register({ name, email, password, confirmPassword });
    if (outcome.needsEmailConfirmation) {
      setConfirmationEmail(email.trim().toLowerCase());
      return;
    }
    if (outcome.success) {
      toast.success('Welcome to Flowboard', 'Your workspace is ready.');
    }
  };

  const handleResend = async () => {
    if (!confirmationEmail) return;
    const sent = await resendConfirmationEmail(confirmationEmail);
    if (sent) {
      toast.success('Confirmation email sent', 'It should arrive within a minute.');
    }
  };

  if (confirmationEmail) {
    return (
      <div className="card animate-scale-in p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Check your inbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          We sent a confirmation link to{' '}
          <span className="font-medium text-ink">{confirmationEmail}</span>. Open it to
          finish setting up your account.
        </p>
        {error ? (
          <Alert variant="danger" onDismiss={clearError} className="mt-4 text-left">
            {error}
          </Alert>
        ) : null}
        <div className="mt-5 space-y-2">
          <Button
            fullWidth
            variant="secondary"
            onClick={() => void handleResend()}
            isLoading={isLoading}
            loadingLabel="Resending confirmation"
          >
            Resend confirmation email
          </Button>
          <Button
            fullWidth
            variant="ghost"
            onClick={() => {
              clearError();
              setConfirmationEmail(null);
            }}
          >
            Use a different email
          </Button>
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Already confirmed?{' '}
          <Link href="/auth/login" className="font-medium text-accent-hover hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

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
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          required
          error={fieldErrors.name}
          leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        />
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
          error={fieldErrors.password}
          hint="Use at least 8 characters."
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your password"
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
          loadingLabel="Creating your account"
          disabled={!isConfigured}
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href={next ? authPath('/auth/login', next) : '/auth/login'}
          className="font-semibold text-accent-hover hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
