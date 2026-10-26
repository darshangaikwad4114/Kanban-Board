'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { acquireScrollLock } from '@/lib/scrollLock';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const dialogStack: string[] = [];

interface DialogA11yOptions {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Shared dialog behaviour: focus trap, Escape for the topmost dialog only,
 * focus restore, and a ref-counted body scroll lock.
 */
export function useDialogA11y<T extends HTMLElement>({
  open,
  onClose,
  initialFocusRef,
}: DialogA11yOptions) {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const dialogId = Math.random().toString(36).slice(2);
    dialogStack.push(dialogId);
    const release = acquireScrollLock();
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const target = initialFocusRef?.current ?? container;
      const firstFocusable =
        target === container
          ? container.querySelector<HTMLElement>(FOCUSABLE)
          : target;
      (firstFocusable ?? container).focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== dialogId) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.getClientRects().length > 0);

      if (focusables.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      const index = dialogStack.indexOf(dialogId);
      if (index >= 0) dialogStack.splice(index, 1);
      release();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);

  return containerRef;
}
