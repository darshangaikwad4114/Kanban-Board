import {
  AlertTriangle,
  CalendarDays,
  Kanban,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import type { PortfolioStats } from '@/types/domain';
import { cn } from '@/lib/utils';

type Tone = 'accent' | 'sage' | 'warning' | 'danger';

const toneStyles: Record<Tone, { icon: string; blob: string; bar: string }> = {
  accent: {
    icon: 'bg-accent-soft text-accent-hover',
    blob: 'bg-accent/10',
    bar: 'bg-accent',
  },
  sage: {
    icon: 'bg-sage-soft text-sage',
    blob: 'bg-sage/10',
    bar: 'bg-sage',
  },
  warning: {
    icon: 'bg-warning-soft text-warning',
    blob: 'bg-warning/10',
    bar: 'bg-warning',
  },
  danger: {
    icon: 'bg-danger-soft text-danger',
    blob: 'bg-danger/10',
    bar: 'bg-danger',
  },
};

interface StatItem {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
}

export function StatCards({ stats }: { stats: PortfolioStats }) {
  const items: StatItem[] = [
    {
      label: 'Active boards',
      value: stats.boardCount,
      hint: `${stats.listCount} lists in your workspace`,
      icon: LayoutDashboard,
      tone: 'accent',
    },
    {
      label: 'Cards in flight',
      value: stats.cardCount,
      hint: `${stats.highPriorityCount} high priority`,
      icon: Kanban,
      tone: 'sage',
    },
    {
      label: 'Due today',
      value: stats.dueTodayCount,
      hint:
        stats.dueTodayCount === 0
          ? 'Nothing due today'
          : 'Keep these moving before the day ends',
      icon: CalendarDays,
      tone: 'warning',
    },
    {
      label: 'Overdue',
      value: stats.overdueCount,
      hint: stats.overdueCount === 0 ? 'Everything is on schedule' : 'Needs attention today',
      icon: AlertTriangle,
      tone: 'danger',
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace stats">
      {items.map((item) => {
        const styles = toneStyles[item.tone];
        return (
          <div key={item.label} className="card relative overflow-hidden p-5">
            <div
              className={cn(
                'pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl',
                styles.blob
              )}
              aria-hidden="true"
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
                  {item.value}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{item.hint}</p>
              </div>
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  styles.icon
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <span
              className={cn('absolute inset-x-0 bottom-0 h-1 opacity-70', styles.bar)}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </section>
  );
}

const priorityRows = [
  { key: 'high' as const, label: 'High', dot: 'bg-danger', segment: 'bg-danger' },
  { key: 'medium' as const, label: 'Medium', dot: 'bg-warning', segment: 'bg-warning' },
  { key: 'low' as const, label: 'Low', dot: 'bg-sage', segment: 'bg-sage' },
  { key: 'none' as const, label: 'None', dot: 'bg-ink-faint', segment: 'bg-surface-column' },
];

export function PriorityMix({ stats }: { stats: PortfolioStats }) {
  const counts = {
    high: stats.highPriorityCount,
    medium: stats.mediumPriorityCount,
    low: stats.lowPriorityCount,
    none: stats.nonePriorityCount,
  };
  const total = counts.high + counts.medium + counts.low + counts.none;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Priority mix</h2>
          <p className="mt-0.5 text-xs text-ink-muted">How work is weighted across boards</p>
        </div>
        <span className="badge bg-danger-soft text-danger">{counts.high} high</span>
      </div>

      {total === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-surface-column px-4 py-6 text-center text-xs text-ink-faint">
          Add cards to see your priority distribution.
        </p>
      ) : (
        <>
          <div
            className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-surface-muted"
            role="img"
            aria-label={`Priority distribution: ${counts.high} high, ${counts.medium} medium, ${counts.low} low, ${counts.none} none priority cards`}
          >
            {priorityRows.map((row) =>
              counts[row.key] > 0 ? (
                <span
                  key={row.key}
                  className={cn('h-full', row.segment)}
                  style={{ width: `${(counts[row.key] / total) * 100}%` }}
                  title={`${row.label}: ${counts[row.key]}`}
                />
              ) : null
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {priorityRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className={cn('h-2 w-2 rounded-full', row.dot)} aria-hidden="true" />
                  {row.label}
                </dt>
                <dd className="text-xs font-semibold tabular-nums text-ink">
                  {counts[row.key]}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-surface-column/60 pt-3 text-[11px] text-ink-faint">
            Based on {total} cards
          </p>
        </>
      )}
    </section>
  );
}
