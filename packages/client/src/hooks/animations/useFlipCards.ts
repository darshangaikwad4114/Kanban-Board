'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { registerGsapPlugins, Flip } from '@/lib/gsap/registerPlugins';
import { useReducedMotion } from './useReducedMotion';

registerGsapPlugins();

const FLIP_SELECTOR = '[data-flip-id]';

/**
 * Animates layout changes when `deps` update (card moves, creates, remote sync).
 * Captures Flip state at the end of each layout pass so the next render can tween from it.
 */
export function useFlipCards(
  containerRef: RefObject<HTMLElement | null>,
  deps: unknown[]
) {
  const flipStateRef = useRef<Flip.FlipState | null>(null);
  const isFirstRender = useRef(true);
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFirstRender.current && flipStateRef.current && !reducedMotion) {
      Flip.from(flipStateRef.current, {
        duration: 0.3,
        ease: 'power2.out',
        absolute: true,
        stagger: 0.015,
        prune: true,
      });
    }

    isFirstRender.current = false;
    const elements = gsap.utils.toArray<HTMLElement>(FLIP_SELECTOR, container);
    flipStateRef.current = Flip.getState(elements);
  }, deps);
}
