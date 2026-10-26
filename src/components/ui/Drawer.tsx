'use client';

import { useId, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { cn } from '@/lib/utils';
import { Portal } from './Portal';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  widthClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  widthClassName = 'max-w-md',
  initialFocusRef,
}: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogA11y<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef,
  });

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm animate-fade-in">
        <div
          className="absolute inset-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              'absolute inset-y-0 flex w-full flex-col bg-surface-raised shadow-modal focus-visible:outline-none',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              'border-surface-column/70',
              side === 'left' ? 'animate-drawer-in-left' : 'animate-drawer-in',
              widthClassName
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-column/60 px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="-mr-1 rounded-xl p-2 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer ? (
              <div className="shrink-0 border-t border-surface-column/60 bg-surface/60 px-5 py-4">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}
