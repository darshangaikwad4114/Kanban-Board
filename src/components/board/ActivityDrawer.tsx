'use client';

import { useMemo } from 'react';
import {
  Activity,
  History,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/types/domain';

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

const iconStyles: Record<string, { icon: LucideIcon; className: string }> = {
  created: { icon: Plus, className: 'bg-sage-soft text-sage' },
  renamed: { icon: Pencil, className: 'bg-sky-soft text-sky' },
  updated: { icon: Pencil, className: 'bg-accent-soft text-accent-hover' },
  moved: { icon: MoveRight, className: 'bg-warning-soft text-warning' },
  deleted: { icon: Trash2, className: 'bg-danger-soft text-danger' },
  removed: { icon: Trash2, className: 'bg-danger-soft text-danger' },
  invited: { icon: UserPlus, className: 'bg-accent-soft text-accent-hover' },
};

function styleForAction(action: string) {
  const key = Object.keys(iconStyles).find((candidate) => action.includes(candidate));
  return key ? iconStyles[key] : { icon: Activity, className: 'bg-surface-muted text-ink-muted' };
}

function dayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityDrawer({ open, onClose, logs }: ActivityDrawerProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: ActivityLog[] }>();
    for (const log of logs) {
      const key = dayKey(log.createdAt);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(log);
      } else {
        map.set(key, { label: dayLabel(log.createdAt), items: [log] });
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [logs]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Activity"
      description="Recent changes on this board."
      widthClassName="max-w-sm"
    >
      {logs.length === 0 ? (
        <EmptyState
          compact
          icon={History}
          title="No activity yet"
          description="Create a list or card and the changes will show up here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {group.label}
              </h3>
              <ol className="space-y-0">
                {group.items.map((log, index) => {
                  const { icon: Icon, className } = styleForAction(log.action);
                  const isLast = index === group.items.length - 1;

                  return (
                    <li key={log.id} className="relative flex gap-3">
                      {!isLast ? (
                        <span
                          className="absolute left-4 top-9 bottom-0 w-px bg-surface-column/70"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          className
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 pb-4">
                        <p className="text-sm leading-snug text-ink">
                          <span className="font-semibold">{log.userName}</span>{' '}
                          <span className="text-ink-muted">{log.action}</span>
                        </p>
                        {log.details ? (
                          <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-ink-muted">
                            {log.details}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-ink-faint">
                          {formatRelativeTime(log.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="border-t border-surface-column/60 pt-3 text-center text-[11px] text-ink-faint">
            Showing the latest {logs.length} events
          </p>
        </div>
      )}
    </Drawer>
  );
}
