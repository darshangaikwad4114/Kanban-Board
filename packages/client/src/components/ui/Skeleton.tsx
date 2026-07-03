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

      gsap.to(el, {
        backgroundPosition: '200% 0',
        duration: 1.2,
        ease: 'none',
        repeat: -1,
      });
    },
    { scope: blockRef, dependencies: [reducedMotion] }
  );

  return (
    <div
      ref={blockRef}
      className={`rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading boards">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <SkeletonBlock className="h-5 w-3/4" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-gray-100" aria-busy="true" aria-label="Loading board">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
        <SkeletonBlock className="h-6 w-6 rounded-full" />
        <SkeletonBlock className="h-6 w-40" />
      </div>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl w-72 shrink-0 p-3 space-y-3">
              <SkeletonBlock className="h-4 w-2/3" />
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} className="h-16 w-full rounded-xl" />
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
    <div className="flex items-center justify-center min-h-screen" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}
