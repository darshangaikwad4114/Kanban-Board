import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-gradient-to-r from-surface-column via-surface-muted to-surface-column bg-[length:200%_100%] animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-8 w-16" />
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card overflow-hidden">
            <Skeleton className="h-1.5 w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-surface-muted"
      aria-busy="true"
      aria-label="Loading board"
    >
      <div className="glass-header px-4 py-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-6 w-44" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="kanban-column w-72 shrink-0 space-y-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <Skeleton key={cardIndex} className="h-24 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </span>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
