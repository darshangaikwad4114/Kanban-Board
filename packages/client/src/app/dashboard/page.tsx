'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import type { Board } from '@kanban/shared';
import { AnimatedPanel } from '@/components/ui/AnimatedPanel';
import { DashboardSkeleton, PageSpinner } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBoards();
    }
  }, [isAuthenticated]);

  const loadBoards = async () => {
    setIsLoadingBoards(true);
    const res = await api.get<Board[]>('/boards');
    if (res.success && res.data) {
      setBoards(res.data);
    }
    setIsLoadingBoards(false);
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;
    setIsCreating(true);
    const res = await api.post<Board>('/boards', { title: newBoardTitle.trim() });
    if (res.success && res.data) {
      setBoards((prev) => [res.data!, ...prev]);
      setNewBoardTitle('');
      setShowCreate(false);
    }
    setIsCreating(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const debugAuth = useAuthStore((s) => ({
    isAuthenticated: s.isAuthenticated,
    isLoading: s.isLoading,
    userEmail: s.user?.email,
  }));

  if (isLoading) {
    return <PageSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Not signed in</h2>
          <p className="text-sm text-gray-500 mb-4">Auth state says not authenticated.</p>
          <div className="text-xs text-gray-500 mb-4">
            <div>Auth state: {debugAuth.isAuthenticated ? 'authenticated' : 'not authenticated'}</div>
            <div>Loading: {String(debugAuth.isLoading)}</div>
            <div>User: {debugAuth.userEmail || 'none'}</div>
          </div>
          <button onClick={() => router.push('/auth/login')} className="btn-primary w-full">
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">Kanban Board</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.name || user?.email}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Boards</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + New Board
          </button>
        </div>

        <AnimatedPanel show={showCreate} className="mb-6">
          <div className="card p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="Board title..."
                className="input flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
              />
              <button
                onClick={handleCreateBoard}
                disabled={isCreating || !newBoardTitle.trim()}
                className="btn-primary"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewBoardTitle('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </AnimatedPanel>

        {isLoadingBoards ? (
          <DashboardSkeleton />
        ) : boards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No boards yet. Create your first board!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div
                key={board._id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/board/${board._id}`)}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{board.title}</h3>
                <p className="text-sm text-gray-500">
                  {board.memberIds.length} member{board.memberIds.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
