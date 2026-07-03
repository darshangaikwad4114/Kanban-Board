'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { registerGsapPlugins, gsap } from '@/lib/gsap/registerPlugins';
import { useReducedMotion } from '@/hooks/animations/useReducedMotion';

registerGsapPlugins();

interface AnimatedPanelProps {
  show: boolean;
  children: ReactNode;
  className?: string;
}

/** Keeps panel mounted through exit tween before unmounting. */
export function AnimatedPanel({ show, children, className = '' }: AnimatedPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(show);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (show) setRender(true);
  }, [show]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !render) return;

      if (show) {
        if (reducedMotion) {
          gsap.set(el, { opacity: 1, y: 0 });
        } else {
          gsap.fromTo(
            el,
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
          );
        }
      } else {
        if (reducedMotion) {
          setRender(false);
        } else {
          gsap.to(el, {
            opacity: 0,
            y: -8,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => setRender(false),
          });
        }
      }
    },
    { scope: ref, dependencies: [show, render, reducedMotion] }
  );

  if (!render) return null;

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
