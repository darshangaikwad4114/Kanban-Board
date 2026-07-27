'use client';

import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useErrorReveal } from '@/hooks/animations/useErrorReveal';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  useErrorReveal(errorRef, error);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent-soft via-surface to-peach-soft p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-white font-bold">F</div>
          <span className="text-xl font-semibold text-ink">Flowboard</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-ink leading-tight mb-4">
            Organize work,<br />beautifully.
          </h2>
          <p className="text-ink-muted text-lg max-w-md">
            Collaborative kanban boards with built-in templates, real-time sync, and a calm workspace designed for focus.
          </p>
          <div className="flex gap-3 mt-8">
            {['📋 Templates', '⚡ Real-time', '🎨 Soft UI'].map((f) => (
              <span key={f} className="badge bg-surface-raised/80 text-ink-muted border border-surface-column">
                {f}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-faint">© Flowboard — Kanban for teams</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-accent-soft flex items-center justify-center text-accent-hover font-bold">F</div>
            <span className="text-lg font-semibold text-ink">Flowboard</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-ink-muted mb-8">Sign in to continue to your boards</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div ref={errorRef} role="alert" className="bg-danger-soft border border-danger/20 text-danger px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required minLength={8} autoComplete="current-password" />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-accent-hover font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
