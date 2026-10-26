'use client';

import { useId, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { cn } from '@/lib/utils';
import { Portal } from './Portal';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
} as const;

export type ModalSize = keyof typeof sizeClasses;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  bodyClassName?: string;
  panelClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  initialFocusRef,
  bodyClassName,
  panelClassName,
}: ModalProps) {
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
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-ink/30 backdrop-blur-sm animate-fade-in"
        onMouseDown={(event) => {
          if (closeOnOverlayClick && event.target === event.currentTarget) onClose();
        }}
      >
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              'card relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden shadow-modal animate-modal-in focus-visible:outline-none sm:max-h-[calc(100vh-3rem)]',
              sizeClasses[size],
              panelClassName
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-surface-column/60 px-6 py-5">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mr-1 -mt-1 shrink-0 rounded-xl p-2 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-5', bodyClassName)}>
              {children}
            </div>
            {footer ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-surface-column/60 bg-surface/60 px-6 py-4">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}
