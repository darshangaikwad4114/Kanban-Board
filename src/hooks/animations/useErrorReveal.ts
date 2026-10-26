'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { registerGsapPlugins, gsap } from '@/lib/gsap/registerPlugins';
import { useReducedMotion } from './useReducedMotion';

registerGsapPlugins();

/** Fade/slide auth (or other) error banners when message changes. */
export function useErrorReveal(
  errorRef: RefObject<HTMLElement | null>,
  error: string | null
) {
  const reducedMotion = useReducedMotion();
  const prevError = useRef<string | null>(null);

  useGSAP(
    () => {
      const el = errorRef.current;
      if (!el || !error || error === prevError.current) return;

      if (reducedMotion) {
        gsap.set(el, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          el,
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
        );
      }

      prevError.current = error;
    },
    { scope: errorRef, dependencies: [error, reducedMotion] }
  );
}
