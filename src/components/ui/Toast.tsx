'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastApi {
  toast: (options: ToastOptions) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  info: (title: string, description?: string) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const variantStyles: Record<ToastVariant, { border: string; icon: string; Icon: typeof Info }> = {
  success: { border: 'border-l-success', icon: 'text-success', Icon: CheckCircle2 },
  error: { border: 'border-l-danger', icon: 'text-danger', Icon: AlertCircle },
  info: { border: 'border-l-accent', icon: 'text-accent-hover', Icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const sequence = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'info', duration }: ToastOptions) => {
      sequence.current += 1;
      const id = sequence.current;
      setToasts((current) => [...current, { id, title, description, variant }].slice(-4));
      const timeout = window.setTimeout(
        () => dismiss(id),
        duration ?? (variant === 'error' ? 6500 : 4200)
      );
      timers.current.set(id, timeout);
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, variant: 'success' }),
      error: (title, description) => toast({ title, description, variant: 'error' }),
      info: (title, description) => toast({ title, description, variant: 'info' }),
    }),
    [toast, dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5"
      >
        {toasts.map((item) => {
          const { border, icon, Icon } = variantStyles[item.variant];
          return (
            <div
              key={item.id}
              role={item.variant === 'error' ? 'alert' : 'status'}
              className={cn(
                'card pointer-events-auto flex w-full items-start gap-3 border-l-4 px-4 py-3 shadow-lift animate-toast-in sm:w-80',
                border
              )}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }
  return context;
}
