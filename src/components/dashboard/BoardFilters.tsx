'use client';

import { ArrowUpDown, ChevronDown, LayoutGrid, List, Search, X } from 'lucide-react';
import type { BoardFilter, BoardSort, DashboardView } from '@/types/domain';
import { cn } from '@/lib/utils';

interface BoardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: BoardFilter;
  onFilterChange: (value: BoardFilter) => void;
  sort: BoardSort;
  onSortChange: (value: BoardSort) => void;
  view: DashboardView;
  onViewChange: (value: DashboardView) => void;
  counts: { all: number; owned: number; shared: number };
}

const filterOptions: { value: BoardFilter; label: string; countKey: keyof BoardFiltersProps['counts'] }[] = [
  { value: 'all', label: 'All', countKey: 'all' },
  { value: 'owned', label: 'Owned', countKey: 'owned' },
  { value: 'shared', label: 'Shared', countKey: 'shared' },
];

export function BoardFilters({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  counts,
}: BoardFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink">Your boards</h2>
          <span className="badge bg-surface-muted text-ink-muted">{counts.all}</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-surface-column bg-surface-raised p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('grid')}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            className={cn(
              'rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              view === 'grid'
                ? 'bg-accent-soft text-accent-hover'
                : 'text-ink-faint hover:text-ink'
            )}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange('list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
            className={cn(
              'rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
              view === 'list'
                ? 'bg-accent-soft text-accent-hover'
                : 'text-ink-faint hover:text-ink'
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search boards…"
            aria-label="Search boards"
            className="input py-2 pl-9 pr-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-faint transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div
          className="inline-flex items-center gap-0.5 rounded-xl border border-surface-column bg-surface-raised p-0.5"
          role="group"
          aria-label="Filter boards by ownership"
        >
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                filter === option.value
                  ? 'bg-accent-soft text-accent-hover'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              )}
            >
              {option.label}
              <span className="ml-1 text-[10px] opacity-60">{counts[option.countKey]}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <ArrowUpDown
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as BoardSort)}
            aria-label="Sort boards"
            className="input cursor-pointer appearance-none py-1.5 pl-8 pr-8 text-xs"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Name A–Z</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
