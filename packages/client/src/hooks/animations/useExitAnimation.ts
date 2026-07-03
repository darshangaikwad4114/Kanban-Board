'use client';

import { registerGsapPlugins, gsap } from '@/lib/gsap/registerPlugins';
import { prefersReducedMotion } from '@/lib/gsap/reducedMotion';

registerGsapPlugins();

/** Animate an element out, then run callback (e.g. delete from store). */
export function animateExit(
  element: HTMLElement | null,
  onComplete: () => void
): void {
  if (!element || prefersReducedMotion()) {
    onComplete();
    return;
  }

  gsap.to(element, {
    opacity: 0,
    scale: 0.95,
    duration: 0.2,
    ease: 'power2.in',
    onComplete,
  });
}
