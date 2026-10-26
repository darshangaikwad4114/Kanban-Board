'use client';

import { useRef, type RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { registerGsapPlugins, gsap } from '@/lib/gsap';
import { useReducedMotion } from './useReducedMotion';

registerGsapPlugins();

interface UseBoardEntranceOptions {
  isReady: boolean;
  columnSelector?: string;
  cardSelector?: string;
}

/**
 * One-shot staggered entrance when board data finishes loading.
 */
export function useBoardEntrance(
  containerRef: RefObject<HTMLElement | null>,
  { isReady, columnSelector = '[data-board-column]', cardSelector = '[data-flip-id]' }: UseBoardEntranceOptions
) {
  const hasPlayed = useRef(false);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (!isReady || hasPlayed.current || !containerRef.current) return;
      hasPlayed.current = true;

      const columns = gsap.utils.toArray<HTMLElement>(columnSelector, containerRef.current);
      const cards = gsap.utils.toArray<HTMLElement>(cardSelector, containerRef.current);

      if (reducedMotion) {
        gsap.set([...columns, ...cards], { opacity: 1, y: 0 });
        return;
      }

      gsap.set(columns, { opacity: 0, y: 16 });
      gsap.set(cards, { opacity: 0, y: 8 });

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.to(columns, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
      }      ).to(
        cards,
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.03,
        },
        '-=0.15'
      );
    },
    { scope: containerRef, dependencies: [isReady, reducedMotion] }
  );
}
