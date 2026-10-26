let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/** Locks body scroll for the lifetime of the returned release function. */
export function acquireScrollLock(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    }
  };
}
