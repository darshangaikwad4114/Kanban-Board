'use client';

import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { formatDueDate } from '@/lib/dates';
import { dueToneStyles, priorityStyles } from '@/config/theme';
import { cn } from '@/lib/utils';
import type { UpcomingCard } from '@/types/domain';

interface UpcomingDeadlinesProps {
  upcoming: UpcomingCard[];
  onOpenBoard: (boardId: string) => void;
}

export function UpcomingDeadlines({ upcoming, onOpenBoard }: UpcomingDeadlinesProps) {
  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Upcoming deadlines</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Due dates across all your boards</p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-soft text-sky">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-surface-column px-4 py-7 text-center">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-ink">All caught up</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            No due dates coming up. Add one to a card to see it here.
          </p>
        </div>
      ) : (
        <ul className="-mx-2 mt-2 space-y-0.5">
          {upcoming.map((card) => {
            const due = formatDueDate(card.dueDate);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => onOpenBoard(card.boardId)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <span
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      priorityStyles[card.priority].dot
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {card.title}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {card.boardTitle}
                    </span>
                  </span>
                  {due ? (
                    <span
                      className={cn(
                        'shrink-0 text-right text-[11px] font-medium',
                        dueToneStyles[due.tone]
                      )}
                    >
                      {due.text}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
