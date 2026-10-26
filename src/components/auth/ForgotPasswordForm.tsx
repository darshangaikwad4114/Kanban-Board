'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { SupabaseSetupNotice } from '@/components/layout/SupabaseSetupNotice';
import { useAuthStore } from '@/stores/authStore';

export function ForgotPasswordForm() {
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const error = useAuthStore((state) => state.error);
  const fieldErrors = useAuthStore((state) => state.fieldErrors);
  const clearError = useAuthStore((state) => state.clearError);
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const sent = await requestPasswordReset(email);
    if (sent) {
      setSentEmail(email.trim().toLowerCase());
      toast.success('Reset link sent', 'Check your inbox for the next step.');
    }
  };

  const handleResend = async (address: string) => {
    const sent = await requestPasswordReset(address);
    if (sent) {
      toast.success('Reset link sent again', 'It may take a minute to arrive.');
    }
  };

  if (sentEmail) {
    return (
      <div className="card animate-scale-in p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-hover">
          <Send className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-ink">Check your email</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          If an account exists for{' '}
          <span className="font-medium text-ink">{sentEmail}</span>, a password reset link
          is on its way. It expires shortly, so use it soon.
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
            onClick={() => void handleResend(sentEmail)}
            isLoading={isLoading}
            loadingLabel="Sending reset link"
          >
            Resend reset link
          </Button>
          <Link
            href="/auth/login"
            className="btn-ghost w-full"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Wrong address?{' '}
          <button
            type="button"
            onClick={() => {
              clearError();
              setSentEmail(null);
            }}
            className="font-medium text-accent-hover hover:underline"
          >
            Try another email
          </button>
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
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          inputMode="email"
          required
          error={fieldErrors.email}
          hint="We'll email a secure link to reset your password."
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isLoading}
          loadingLabel="Sending reset link"
          disabled={!isConfigured}
        >
          Send reset link
        </Button>
      </form>

      <Link
        href="/auth/login"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to sign in
      </Link>
    </div>
  );
}
