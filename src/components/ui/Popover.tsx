'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/lib/utils';

export interface PopoverTriggerProps {
  ref: RefObject<HTMLButtonElement>;
  id: string;
  open: boolean;
  toggle: () => void;
  'aria-haspopup': 'true';
  'aria-expanded': boolean;
  'aria-controls': string;
}

interface PopoverProps {
  label: string;
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  panelClassName?: string;
  className?: string;
}

export function Popover({
  label,
  trigger,
  children,
  align = 'end',
  panelClassName,
  className,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close(true);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, close]);

  const toggle = () => setOpen((current) => !current);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && !(next instanceof Node && event.currentTarget.contains(next))) {
          setOpen(false);
        }
      }}
    >
      {trigger({
        ref: triggerRef,
        id: `${panelId}-trigger`,
        open,
        toggle,
        'aria-haspopup': 'true',
        'aria-expanded': open,
        'aria-controls': panelId,
      })}
      {open ? (
        <div
          id={panelId}
          aria-label={label}
          className={cn(
            'card absolute top-full z-50 mt-2 min-w-[12rem] p-1.5 shadow-lift animate-popover-in',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName
          )}
        >
          {children(() => close(true))}
        </div>
      ) : null}
    </div>
  );
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  danger?: boolean;
}

export function MenuItem({ icon, danger, className, children, ...props }: MenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50',
        danger
          ? 'text-danger hover:bg-danger-soft'
          : 'text-ink hover:bg-surface-muted',
        className
      )}
      {...props}
    >
      {icon ? (
        <span className={cn('shrink-0', danger ? 'text-danger' : 'text-ink-faint')}>
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 border-t border-surface-column/70" role="separator" />;
}
