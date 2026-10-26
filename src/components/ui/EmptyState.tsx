'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-surface-column bg-surface-raised/60 text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-2xl bg-accent-soft text-accent-hover',
          compact ? 'h-10 w-10' : 'h-12 w-12'
        )}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
