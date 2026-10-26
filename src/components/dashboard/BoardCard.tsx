'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  Columns3,
  ListChecks,
  LogOut,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/dates';
import { getBoardColorStyle } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Board, DashboardView } from '@/types/domain';
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover';

interface BoardCardProps {
  board: Board;
  view: DashboardView;
  isOwner: boolean;
  onEdit: (board: Board) => void;
  onDelete: (board: Board) => void;
  onLeave: (board: Board) => void;
}

function BoardMenu({
  board,
  isOwner,
  onEdit,
  onDelete,
  onLeave,
}: Omit<BoardCardProps, 'view'>) {
  const router = useRouter();

  return (
    <Popover
      label={`${board.title} actions`}
      trigger={({ ref, toggle, ...aria }) => (
        <button
          ref={ref}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          aria-label={`Actions for ${board.title}`}
          className="relative z-20 rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          {...aria}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <div className="w-52 space-y-0.5">
          <MenuItem
            icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              close();
              router.push(`/board/${board.id}`);
            }}
          >
            Open board
          </MenuItem>
          {isOwner ? (
            <>
              <MenuItem
                icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                onClick={() => {
                  close();
                  onEdit(board);
                }}
              >
                Board settings
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                danger
                onClick={() => {
                  close();
                  onDelete(board);
                }}
              >
                Delete board
              </MenuItem>
            </>
          ) : (
            <>
              <MenuDivider />
              <MenuItem
                icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                danger
                onClick={() => {
                  close();
                  onLeave(board);
                }}
              >
                Leave board
              </MenuItem>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}

function BoardStats({ board }: { board: Board }) {
  const items = [
    { icon: ListChecks, value: board.stats.cardCount, label: 'cards' },
    { icon: Columns3, value: board.stats.listCount, label: 'lists' },
    { icon: Users, value: board.stats.memberCount, label: 'members' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <item.icon className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
          <span className="font-medium tabular-nums text-ink">{item.value}</span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function BoardCard(props: BoardCardProps) {
  const { board, view, isOwner } = props;
  const style = getBoardColorStyle(board.color);
  const shared = !isOwner;

  if (view === 'list') {
    return (
      <article className="group relative flex items-center gap-3 rounded-2xl border border-surface-column/80 bg-surface-raised px-4 py-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
        <span
          className={cn('h-9 w-1.5 shrink-0 rounded-full', style.bg)}
          aria-hidden="true"
        />
        <span className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', style.soft)}>
          <Columns3 className={cn('h-4 w-4', style.text)} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/board/${board.id}`}
              className="truncate text-sm font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-hover"
            >
              {board.title}
            </Link>
            {shared ? (
              <span className="badge shrink-0 bg-sky-soft text-sky">Shared</span>
            ) : null}
          </div>
          <p className="truncate text-xs text-ink-muted">
            {board.description || 'No description yet'}
          </p>
        </div>
        <div className="hidden shrink-0 md:block">
          <BoardStats board={board} />
        </div>
        <span className="hidden w-28 shrink-0 text-right text-[11px] text-ink-faint lg:block">
          {formatRelativeTime(board.updatedAt)}
        </span>
        <BoardMenu {...props} />
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-surface-column/80 bg-surface-raised shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <div className={cn('h-1.5 w-full', style.bg)} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', style.soft)}>
              <Columns3 className={cn('h-4 w-4', style.text)} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Link
                href={`/board/${board.id}`}
                className="block truncate text-sm font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-accent-hover"
              >
                {board.title}
              </Link>
              <p className="text-[11px] text-ink-faint">
                Updated {formatRelativeTime(board.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {shared ? (
              <span className="badge bg-sky-soft text-sky">Shared</span>
            ) : null}
            <BoardMenu {...props} />
          </div>
        </div>

        <p className="mt-3 min-h-[2.5rem] line-clamp-2 text-xs leading-relaxed text-ink-muted">
          {board.description || 'A fresh space for your next big idea.'}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-surface-column/60 pt-3">
          <BoardStats board={board} />
          {board.stats.overdueCount > 0 ? (
            <span className="badge shrink-0 bg-danger-soft text-danger">
              {board.stats.overdueCount} overdue
            </span>
          ) : board.stats.highPriorityCount > 0 ? (
            <span className="badge shrink-0 bg-warning-soft text-warning">
              {board.stats.highPriorityCount} high
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
