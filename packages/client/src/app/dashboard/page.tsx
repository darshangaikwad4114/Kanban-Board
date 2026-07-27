'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { BOARD_TEMPLATES, type Board } from '@kanban/shared';
import { AppHeader } from '@/components/layout/AppHeader';
import { CreateBoardModal } from '@/components/board/CreateBoardModal';
import { DashboardSkeleton, PageSpinner } from '@/components/ui/Skeleton';
import { getBoardColorStyle, formatRelativeTime } from '@/lib/theme';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, loadUser, logout } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) router.push('/auth/login');
  }, [isInitializing, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadBoards();
  }, [isAuthenticated]);

  const loadBoards = async () => {
    setIsLoadingBoards(true);
    const res = await api.get<Board[]>('/boards');
    if (res.success && res.data) setBoards(res.data);
    setIsLoadingBoards(false);
  };

  const handleDeleteBoard = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this board? This cannot be undone.')) return;
    const res = await api.delete(`/boards/${boardId}`);
    if (res.success) setBoards((prev) => prev.filter((b) => b._id !== boardId));
  };

  const filteredBoards = useMemo(
    () => boards.filter((b) => b.title.toLowerCase().includes(search.toLowerCase())),
    [boards, search]
  );

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (isInitializing) return <PageSpinner />;

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader userName={user?.name || user?.email} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="rounded-3xl bg-gradient-to-r from-accent-soft via-surface-raised to-peach-soft border border-surface-column/60 p-8 mb-10 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-ink">
                Good {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h2>
              <p className="text-ink-muted mt-1">
                {boards.length === 0
                  ? 'Create your first board with a built-in template'
                  : `You have ${boards.length} board${boards.length !== 1 ? 's' : ''} · pick up where you left off`}
              </p>
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
              + New board
            </button>
          </div>
        </div>

        {/* Quick templates */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">Quick start templates</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {BOARD_TEMPLATES.filter((t) => t.id !== 'blank').map((template) => {
              const style = getBoardColorStyle(template.color);
              return (
                <button
                  key={template.id}
                  onClick={() => setShowCreate(true)}
                  className={`text-left p-4 rounded-2xl border border-surface-column hover:shadow-soft transition-all hover:-translate-y-0.5 ${style.soft}`}
                >
                  <span className="text-xl block mb-2">{template.icon}</span>
                  <p className="text-sm font-medium text-ink">{template.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{template.lists.length} lists</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Board list */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-semibold text-ink">Your boards</h3>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards…"
            className="input sm:max-w-xs"
          />
        </div>

        {isLoadingBoards ? (
          <DashboardSkeleton />
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-16 card">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-ink-muted mb-4">
              {search ? 'No boards match your search' : 'No boards yet — create one with a template!'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                Create your first board
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBoards.map((board) => {
              const style = getBoardColorStyle(board.color);
              return (
                <div
                  key={board._id}
                  className="card overflow-hidden hover:shadow-soft transition-all cursor-pointer group hover:-translate-y-0.5"
                  onClick={() => router.push(`/board/${board._id}`)}
                >
                  <div className={`h-2 ${style.bg}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-ink group-hover:text-accent-hover transition-colors">
                        {board.title}
                      </h3>
                      <button
                        onClick={(e) => handleDeleteBoard(e, board._id)}
                        className="text-ink-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                        aria-label={`Delete ${board.title}`}
                      >
                        🗑
                      </button>
                    </div>
                    {board.description && (
                      <p className="text-sm text-ink-muted mt-1 line-clamp-2">{board.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-4 text-xs text-ink-faint">
                      <span>{board.memberIds.length} member{board.memberIds.length !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>Updated {formatRelativeTime(board.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CreateBoardModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadBoards} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}