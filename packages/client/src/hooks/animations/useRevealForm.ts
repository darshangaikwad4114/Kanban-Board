'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { registerGsapPlugins, gsap } from '@/lib/gsap/registerPlugins';
import { useReducedMotion } from './useReducedMotion';

registerGsapPlugins();

/** Enter/exit animation for inline form panels toggled by boolean state. */
export function useRevealForm(
  formRef: RefObject<HTMLElement | null>,
  isVisible: boolean
) {
  const reducedMotion = useReducedMotion();
  const wasVisible = useRef(isVisible);

  useGSAP(
    () => {
      const el = formRef.current;
      if (!el) return;

      if (isVisible) {
        if (reducedMotion) {
          gsap.set(el, { opacity: 1, y: 0, display: 'block' });
        } else {
          gsap.fromTo(
            el,
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
          );
        }
      } else if (wasVisible.current) {
        if (reducedMotion) {
          gsap.set(el, { opacity: 0, display: 'none' });
        } else {
          gsap.to(el, {
            opacity: 0,
            y: -8,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => gsap.set(el, { display: 'none' }),
          });
        }
      }

      wasVisible.current = isVisible;
    },
    { scope: formRef, dependencies: [isVisible, reducedMotion] }
  );
}
