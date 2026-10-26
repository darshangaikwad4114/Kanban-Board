'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  RefreshCw,
  SearchX,
  Sparkles,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppHeader } from '@/components/layout/AppHeader';
import { BoardSettingsModal, type BoardSaveResult } from '@/components/board/BoardSettingsModal';
import { CreateBoardModal } from '@/components/board/CreateBoardModal';
import { BoardCard } from '@/components/dashboard/BoardCard';
import { BoardFilters } from '@/components/dashboard/BoardFilters';
import { PriorityMix, StatCards } from '@/components/dashboard/DashboardStats';
import { TemplateStrip } from '@/components/dashboard/TemplateStrip';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { deleteBoard, removeBoardMember, updateBoard } from '@/services/boards.service';
import { fetchDashboard } from '@/services/dashboard.service';
import { toUserMessage } from '@/lib/errors';
import { pluralize } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import type { BoardUpdateInput } from '@/lib/validation';
import type {
  Board,
  BoardFilter,
  BoardSort,
  DashboardData,
  DashboardView,
} from '@/types/domain';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function DashboardContent() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [sort, setSort] = useState<BoardSort>('updated');
  const [view, setView] = useState<DashboardView>('grid');

  const [createOpen, setCreateOpen] = useState(false);
  const [createTemplate, setCreateTemplate] = useState<string | null>(null);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Board | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const didLoad = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const next = await fetchDashboard();
        setData(next);
        setError(null);
      } catch (cause) {
        const message = toUserMessage(cause, 'Your dashboard could not be loaded.');
        if (mode === 'initial') setError(message);
        else toast.error('Refresh failed', message);
      } finally {
        if (mode === 'initial') setIsLoading(false);
        else setIsRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    void load('initial');
  }, [load]);

  const boards = useMemo(() => data?.boards ?? [], [data]);
  const stats = data?.stats;
  const upcoming = useMemo(() => data?.upcoming ?? [], [data]);

  const counts = useMemo(() => {
    const owned = boards.filter((board) => board.ownerId === user?.id).length;
    return { all: boards.length, owned, shared: boards.length - owned };
  }, [boards, user?.id]);

  const visibleBoards = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = boards.filter((board) => {
      if (filter === 'owned' && board.ownerId !== user?.id) return false;
      if (filter === 'shared' && board.ownerId === user?.id) return false;
      if (!query) return true;
      return (
        board.title.toLowerCase().includes(query) ||
        board.description.toLowerCase().includes(query)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'created') return b.createdAt.localeCompare(a.createdAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [boards, filter, search, sort, user?.id]);

  const hasActiveFilters = search.trim().length > 0 || filter !== 'all';

  const firstName = user?.name.trim().split(/\s+/)[0] || 'there';
  const greeting = greetingForHour(new Date().getHours());

  const openCreate = (templateId?: string) => {
    setCreateTemplate(templateId ?? null);
    setCreateOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
  };

  const handleDeleteBoard = async () => {
    const target = deleteTarget;
    if (!target) return;

    setIsWorking(true);
    try {
      await deleteBoard(target.id);
      setData((previous) =>
        previous
          ? {
              ...previous,
              boards: previous.boards.filter((board) => board.id !== target.id),
              upcoming: previous.upcoming.filter((card) => card.boardId !== target.id),
            }
          : previous
      );
      setDeleteTarget(null);
      toast.success('Board deleted', `“${target.title}” was permanently removed.`);
      void load('refresh');
    } catch (cause) {
      toast.error(
        'Could not delete board',
        toUserMessage(cause, 'The board could not be deleted.')
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleLeaveBoard = async () => {
    const target = leaveTarget;
    if (!target || !user) return;

    setIsWorking(true);
    try {
      await removeBoardMember(target.id, user.id);
      setData((previous) =>
        previous
          ? {
              ...previous,
              boards: previous.boards.filter((board) => board.id !== target.id),
              upcoming: previous.upcoming.filter((card) => card.boardId !== target.id),
            }
          : previous
      );
      setLeaveTarget(null);
      toast.success('You left the board', `You no longer have access to “${target.title}”.`);
      void load('refresh');
    } catch (cause) {
      toast.error(
        'Could not leave board',
        toUserMessage(cause, 'Your membership could not be removed.')
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleSaveBoard = async (input: BoardUpdateInput): Promise<BoardSaveResult> => {
    const board = editingBoard;
    if (!board) return { ok: false, error: 'That board no longer exists.' };

    try {
      await updateBoard(board.id, input);
    } catch (cause) {
      return { ok: false, error: toUserMessage(cause, 'The board could not be updated.') };
    }

    setData((previous) =>
      previous
        ? {
            ...previous,
            boards: previous.boards.map((item) =>
              item.id === board.id
                ? {
                    ...item,
                    title: input.title,
                    description: input.description,
                    color: input.color,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            ),
            upcoming: previous.upcoming.map((card) =>
              card.boardId === board.id ? { ...card, boardTitle: input.title } : card
            ),
          }
        : previous
    );
    toast.success('Board updated', 'Your changes are visible to everyone with access.');
    return { ok: true };
  };

  const summary =
    boards.length === 0
      ? 'Set up your first board and bring your work into focus.'
      : `${pluralize(stats?.boardCount ?? 0, 'board')} · ${pluralize(
          stats?.cardCount ?? 0,
          'card'
        )}${
          stats && stats.dueTodayCount > 0
            ? ` · ${pluralize(stats.dueTodayCount, 'card')} due today`
            : ''
        }`;

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void load('refresh')}
          disabled={isLoading || isRefreshing}
          isLoading={isRefreshing}
          loadingLabel="Refreshing dashboard"
          aria-label="Refresh dashboard"
          className="gap-1.5 px-2.5 sm:px-3"
        >
          <RefreshCw
            className="h-4 w-4 sm:hidden"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </AppHeader>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {isLoading && !data ? (
          <DashboardSkeleton />
        ) : !data ? (
          <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
            <p className="text-lg font-semibold text-ink">Dashboard unavailable</p>
            <p className="mt-2 text-sm text-ink-muted">
              {error ?? 'Your workspace could not be loaded right now.'}
            </p>
            <Button className="mt-5" onClick={() => void load('initial')}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-8">
            <section className="relative overflow-hidden rounded-3xl border border-surface-column/70 bg-gradient-to-br from-accent-soft via-surface-raised to-peach-soft p-6 shadow-soft sm:p-8">
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-peach/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-surface-raised/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-hover">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Workspace overview
                  </span>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                    Good {greeting}, {firstName}
                  </h1>
                  <p className="mt-1.5 text-sm text-ink-muted">{summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    size="lg"
                    onClick={() => openCreate()}
                    leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  >
                    New board
                  </Button>
                </div>
              </div>
            </section>

            {error ? (
              <Alert variant="danger" title="Showing cached data" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            ) : null}

            {stats ? <StatCards stats={stats} /> : null}

            <TemplateStrip onSelect={(templateId) => openCreate(templateId)} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <section className="min-w-0 space-y-4">
                <BoardFilters
                  search={search}
                  onSearchChange={setSearch}
                  filter={filter}
                  onFilterChange={setFilter}
                  sort={sort}
                  onSortChange={setSort}
                  view={view}
                  onViewChange={setView}
                  counts={counts}
                />

                {boards.length === 0 ? (
                  <EmptyState
                    icon={LayoutDashboard}
                    title="Your workspace is waiting"
                    description="Create a blank board or pick one of the templates above to get moving in seconds."
                    action={
                      <Button
                        onClick={() => openCreate()}
                        leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                      >
                        Create your first board
                      </Button>
                    }
                  />
                ) : visibleBoards.length === 0 ? (
                  <EmptyState
                    compact
                    icon={SearchX}
                    title="No boards match"
                    description="Try a different search term or switch the ownership filter."
                    action={
                      <Button variant="secondary" size="sm" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : view === 'grid' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visibleBoards.map((board) => (
                      <BoardCard
                        key={board.id}
                        board={board}
                        view="grid"
                        isOwner={board.ownerId === user?.id}
                        onEdit={setEditingBoard}
                        onDelete={setDeleteTarget}
                        onLeave={setLeaveTarget}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {visibleBoards.map((board) => (
                      <BoardCard
                        key={board.id}
                        board={board}
                        view="list"
                        isOwner={board.ownerId === user?.id}
                        onEdit={setEditingBoard}
                        onDelete={setDeleteTarget}
                        onLeave={setLeaveTarget}
                      />
                    ))}
                  </div>
                )}

                {boards.length > 0 ? (
                  <p className="px-1 pt-1 text-[11px] text-ink-faint">
                    Showing {visibleBoards.length} of {boards.length}{' '}
                    {boards.length === 1 ? 'board' : 'boards'}
                    {hasActiveFilters ? ' · filters applied' : ''}
                  </p>
                ) : null}
              </section>

              <aside className="space-y-4">
                {stats ? <PriorityMix stats={stats} /> : null}
                <UpcomingDeadlines
                  upcoming={upcoming}
                  onOpenBoard={(boardId) => router.push(`/board/${boardId}`)}
                />
              </aside>
            </div>
          </div>
        )}
      </main>

      <CreateBoardModal
        open={createOpen}
        initialTemplateId={createTemplate}
        onClose={() => setCreateOpen(false)}
        onCreated={(boardId) => router.push(`/board/${boardId}`)}
      />

      <BoardSettingsModal
        open={Boolean(editingBoard)}
        board={editingBoard}
        onClose={() => setEditingBoard(null)}
        onSave={handleSaveBoard}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this board?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” and all of its lists, cards, and activity will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete board"
        isLoading={isWorking}
        onConfirm={() => void handleDeleteBoard()}
        onCancel={() => {
          if (!isWorking) setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(leaveTarget)}
        title="Leave this board?"
        description={
          leaveTarget
            ? `You will lose access to “${leaveTarget.title}” and its cards. The owner can invite you again later.`
            : ''
        }
        confirmLabel="Leave board"
        tone="primary"
        isLoading={isWorking}
        onConfirm={() => void handleLeaveBoard()}
        onCancel={() => {
          if (!isWorking) setLeaveTarget(null);
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
