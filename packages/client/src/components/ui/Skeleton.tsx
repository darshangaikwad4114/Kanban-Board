'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { registerGsapPlugins, gsap } from '@/lib/gsap/registerPlugins';
import { useReducedMotion } from '@/hooks/animations/useReducedMotion';

registerGsapPlugins();

interface SkeletonProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const el = blockRef.current;
      if (!el || reducedMotion) return;
      gsap.to(el, { backgroundPosition: '200% 0', duration: 1.2, ease: 'none', repeat: -1 });
    },
    { scope: blockRef, dependencies: [reducedMotion] }
  );

  return (
    <div
      ref={blockRef}
      className={`rounded-2xl bg-gradient-to-r from-surface-column via-surface-muted to-surface-column bg-[length:200%_100%] ${className}`}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading boards">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <SkeletonBlock className="h-2 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <SkeletonBlock className="h-5 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-surface-muted" aria-busy="true" aria-label="Loading board">
      <div className="glass-header px-4 py-3 flex items-center gap-3">
        <SkeletonBlock className="h-8 w-8 rounded-xl" />
        <SkeletonBlock className="h-6 w-40" />
      </div>
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kanban-column w-72 shrink-0 p-4 space-y-3">
              <SkeletonBlock className="h-4 w-2/3" />
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} className="h-20 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-accent-soft flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    </div>
  );
}
