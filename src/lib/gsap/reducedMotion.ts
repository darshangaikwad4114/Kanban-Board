import gsap from 'gsap';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Functional UI feedback durations when motion is reduced */
export const REDUCED_MOTION_DEFAULTS = {
  duration: 0.12,
  ease: 'power1.out',
} as const;

/** Returns tween vars adjusted for reduced-motion preference */
export function motionVars(
  full: gsap.TweenVars,
  reduced?: gsap.TweenVars
): gsap.TweenVars {
  if (prefersReducedMotion()) {
    return {
      duration: REDUCED_MOTION_DEFAULTS.duration,
      ease: REDUCED_MOTION_DEFAULTS.ease,
      ...reduced,
    };
  }
  return full;
}
