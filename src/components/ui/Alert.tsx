'use client';

import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const styles: Record<
  AlertVariant,
  { container: string; icon: string; Icon: LucideIcon }
> = {
  info: {
    container: 'border-sky/25 bg-sky-soft/70 text-ink',
    icon: 'text-sky',
    Icon: Info,
  },
  success: {
    container: 'border-success/25 bg-success-soft text-ink',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'border-warning/30 bg-warning-soft text-ink',
    icon: 'text-warning',
    Icon: AlertTriangle,
  },
  danger: {
    container: 'border-danger/25 bg-danger-soft text-ink',
    icon: 'text-danger',
    Icon: AlertCircle,
  },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}: AlertProps) {
  const { container, icon, Icon } = styles[variant];
  const assertive = variant === 'danger' || variant === 'warning';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        container,
        className
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className={cn('leading-relaxed text-ink-muted', title && 'mt-0.5')}>
            {children}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-lg p-1 text-ink-faint transition-colors hover:bg-black/5 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
