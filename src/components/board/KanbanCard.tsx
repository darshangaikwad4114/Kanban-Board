'use client';

import type { DragEvent } from 'react';
import { CalendarDays, GripVertical, MoreHorizontal, SquarePen, Trash2 } from 'lucide-react';
import { formatDueDate } from '@/lib/dates';
import { dueToneStyles, getLabelStyle, priorityStyles } from '@/config/theme';
import { cn } from '@/lib/utils';
import type { Card } from '@/types/domain';
import { Avatar } from '@/components/ui/Avatar';
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover';

interface KanbanCardProps {
  card: Card;
  assigneeName?: string | null;
  isDragging?: boolean;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOverCard: (event: DragEvent<HTMLElement>) => void;
  onOpen: () => void;
  onRequestDelete: () => void;
}

export function KanbanCard({
  card,
  assigneeName,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onOpen,
  onRequestDelete,
}: KanbanCardProps) {
  const priority = priorityStyles[card.priority];
  const due = formatDueDate(card.dueDate);
  const showPriority = card.priority !== 'none';

  return (
    <article
      data-flip-id={card.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', card.id);
        onDragStart(event);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOverCard(event);
      }}
      className={cn(
        'group/card relative rounded-2xl border border-surface-column/70 bg-surface-raised p-3.5 shadow-card transition-all hover:border-accent/30 hover:shadow-lift',
        isDragging && 'opacity-50 ring-2 ring-accent/30'
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open card ${card.title}`}
        className="absolute inset-0 z-0 cursor-grab rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 active:cursor-grabbing"
      />

      <div className="pointer-events-none relative z-10">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {(card.label || showPriority) && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {card.label ? (
                  <span className={cn('badge', getLabelStyle(card.label))}>{card.label}</span>
                ) : null}
                {showPriority ? (
                  <span className={cn('badge', priority.badge)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} aria-hidden="true" />
                    {priority.label}
                  </span>
                ) : null}
              </div>
            )}
            <p className="pr-4 text-sm font-medium leading-snug text-ink">{card.title}</p>
          </div>

          <div className="pointer-events-auto -mr-1 -mt-1 shrink-0">
            <Popover
              label={`${card.title} actions`}
              trigger={({ ref, toggle, ...aria }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle();
                  }}
                  aria-label={`Actions for ${card.title}`}
                  className="rounded-lg p-1.5 text-ink-faint opacity-0 transition-all hover:bg-surface-muted hover:text-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 group-hover/card:opacity-100"
                  {...aria}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            >
              {(close) => (
                <div className="w-44 space-y-0.5">
                  <MenuItem
                    icon={<SquarePen className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => {
                      close();
                      onOpen();
                    }}
                  >
                    Open card
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem
                    icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    danger
                    onClick={() => {
                      close();
                      onRequestDelete();
                    }}
                  >
                    Delete card
                  </MenuItem>
                </div>
              )}
            </Popover>
          </div>
        </div>

        {card.description ? (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
            {card.description}
          </p>
        ) : null}

        {due || assigneeName ? (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-surface-column/50 pt-2.5">
            {due ? (
              <span
                className={cn(
                  'inline-flex min-w-0 items-center gap-1 text-[11px] font-medium',
                  dueToneStyles[due.tone]
                )}
              >
                <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{due.text}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
                <GripVertical className="h-3 w-3" aria-hidden="true" />
                Drag to move
              </span>
            )}
            {assigneeName ? (
              <span className="flex shrink-0 items-center gap-1.5">
                <Avatar name={assigneeName} seed={card.assigneeId ?? undefined} size="xs" />
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
