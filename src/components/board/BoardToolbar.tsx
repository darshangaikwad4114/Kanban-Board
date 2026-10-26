'use client';

import { ChevronDown, Flag, Plus, Search, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { BoardMember, CardPriority } from '@/types/domain';

interface BoardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  priority: CardPriority | 'all';
  onPriorityChange: (value: CardPriority | 'all') => void;
  assignee: string;
  onAssigneeChange: (value: string) => void;
  members: BoardMember[];
  visibleCount: number;
  totalCount: number;
  hasFilters: boolean;
  onClear: () => void;
  onAddList: () => void;
}

const selectClassName =
  'input h-9 cursor-pointer appearance-none py-1.5 pl-8 pr-8 text-xs';

export function BoardToolbar({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  assignee,
  onAssigneeChange,
  members,
  visibleCount,
  totalCount,
  hasFilters,
  onClear,
  onAddList,
}: BoardToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search cards…"
          aria-label="Search cards on this board"
          className="input h-9 py-1.5 pl-9 pr-9 text-xs"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear card search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="relative">
        <Flag
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <select
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as CardPriority | 'all')}
          aria-label="Filter cards by priority"
          className={selectClassName}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="none">No priority</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
      </div>

      <div className="relative">
        <UserRound
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <select
          value={assignee}
          onChange={(event) => onAssigneeChange(event.target.value)}
          aria-label="Filter cards by assignee"
          className={selectClassName}
        >
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          leadingIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
          className="px-2.5 text-xs"
        >
          Clear
        </Button>
      ) : null}

      <span
        className={cn(
          'ml-auto hidden items-center gap-1 text-[11px] tabular-nums text-ink-faint sm:inline-flex',
          hasFilters && 'text-accent-hover'
        )}
        aria-live="polite"
      >
        {visibleCount === totalCount
          ? `${totalCount} ${totalCount === 1 ? 'card' : 'cards'}`
          : `${visibleCount} of ${totalCount} cards`}
      </span>

      <Button
        size="sm"
        onClick={onAddList}
        leadingIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
        className="shrink-0"
      >
        Add list
      </Button>
    </div>
  );
}
