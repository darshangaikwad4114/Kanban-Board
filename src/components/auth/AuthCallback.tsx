'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MailWarning } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { Alert } from '@/components/ui/Alert';
import { toUserMessage } from '@/lib/errors';
import { sanitizeNext } from '@/lib/navigation';
import { completeAuthRedirect } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';

export function AuthCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const started = useRef(false);

  const errorParam = params.get('error_description') ?? params.get('error');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  const next = sanitizeNext(
    params.get('next'),
    type === 'recovery' ? '/auth/reset-password' : '/dashboard'
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (errorParam) {
      if (isAuthenticated) {
        router.replace(next);
        return;
      }
      setErrorMessage(errorParam);
      return;
    }

    const run = async () => {
      try {
        await completeAuthRedirect({ code, tokenHash, type });
        const ready = await refreshSession();
        if (!ready) {
          throw new Error('Your session could not be established. Please sign in again.');
        }
        router.replace(next);
      } catch (error) {
        setErrorMessage(
          toUserMessage(error, 'We could not verify that link. Please request a new one.')
        );
      }
    };

    void run();
  }, [code, tokenHash, type, next, errorParam, isAuthenticated, refreshSession, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <Brand href="/" size="lg" />
      <div className="card mt-8 w-full max-w-md animate-scale-in p-7 text-center">
        {errorMessage ? (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <MailWarning className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-ink">Link couldn&apos;t be verified</h1>
            <Alert variant="danger" className="mt-4 text-left">
              {errorMessage}
            </Alert>
            <div className="mt-5 space-y-2">
              <Link href="/auth/forgot-password" className="btn-primary w-full">
                Request a new link
              </Link>
              <Link href="/auth/login" className="btn-ghost w-full">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-hover">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-lg font-semibold text-ink">Finishing sign in…</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Verifying your secure link and preparing your workspace.
            </p>
          </>
        )}
      </div>
      <p className="mt-6 text-[11px] text-ink-faint">Secure sign-in powered by Supabase Auth</p>
    </div>
  );
}
