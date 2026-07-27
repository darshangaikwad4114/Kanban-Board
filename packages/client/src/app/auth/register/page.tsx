'use client';

import { useState, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useErrorReveal } from '@/hooks/animations/useErrorReveal';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  useErrorReveal(errorRef, error);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await register(email, password, name);
    if (success) router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sage-soft via-surface to-accent-soft p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage flex items-center justify-center text-white font-bold">F</div>
          <span className="text-xl font-semibold text-ink">Flowboard</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-ink leading-tight mb-4">
            Start with a<br />template, ship faster.
          </h2>
          <p className="text-ink-muted text-lg max-w-md">
            Choose from Scrum, Content Calendar, Bug Tracker, and more — or start blank. Your workflow, ready in seconds.
          </p>
        </div>
        <p className="text-sm text-ink-faint">Free to use · No credit card</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sage-soft flex items-center justify-center text-sage font-bold">F</div>
            <span className="text-lg font-semibold text-ink">Flowboard</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Create your account</h1>
          <p className="text-ink-muted mb-8">Get started with beautiful kanban boards</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div ref={errorRef} role="alert" className="bg-danger-soft border border-danger/20 text-danger px-4 py-3 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">Full name</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Your name" required autoComplete="name" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full !py-3">
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-8">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent-hover font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
