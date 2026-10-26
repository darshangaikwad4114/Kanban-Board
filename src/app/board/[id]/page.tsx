'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Kanban,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ActivityDrawer } from '@/components/board/ActivityDrawer';
import { BoardColumn } from '@/components/board/BoardColumn';
import {
  BoardSettingsModal,
  type BoardSaveResult,
} from '@/components/board/BoardSettingsModal';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { CardDetailModal } from '@/components/board/CardDetailModal';
import { MembersModal } from '@/components/board/MembersModal';
import { Alert } from '@/components/ui/Alert';
import { AvatarStack } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover';
import { BoardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useBoardEntrance } from '@/hooks/animations/useBoardEntrance';
import { useFlipCards } from '@/hooks/animations/useFlipCards';
import { formatRelativeTime } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import {
  computeDropPosition,
  computeListDropOrder,
  type DragOverInfo,
  type DropEdge,
} from '@/lib/reorder';
import { connectionStyles, getBoardColorStyle } from '@/config/theme';
import { cn } from '@/lib/utils';
import type { BoardUpdateInput, CardPatchInput } from '@/lib/validation';
import { deleteBoard as deleteBoardService } from '@/services/boards.service';
import { useAuthStore } from '@/stores/authStore';
import { useBoardStore } from '@/stores/boardStore';
import type { BoardList, Card, CardPriority } from '@/types/domain';

function BoardView() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const boardId = typeof params.id === 'string' ? params.id : '';
  const user = useAuthStore((state) => state.user);

  const {
    currentBoard,
    lists,
    cards,
    members,
    activityLogs,
    presence,
    connectionStatus,
    isLoading,
    error,
    actionError,
    openBoard,
    closeBoard,
    refresh,
    clearActionError,
    createList,
    renameList,
    deleteList,
    reorderLists,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    updateBoard,
    inviteMember,
    removeMember,
  } = useBoardStore();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<CardPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  const [showActivity, setShowActivity] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [deleteCardTarget, setDeleteCardTarget] = useState<Card | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [deleteListTarget, setDeleteListTarget] = useState<BoardList | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);

  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [isDeletingBoard, setIsDeletingBoard] = useState(false);
  const [leaveBoardOpen, setLeaveBoardOpen] = useState(false);
  const [isLeavingBoard, setIsLeavingBoard] = useState(false);

  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOverInfo | null>(null);
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [listDrop, setListDrop] = useState<{ listId: string; edge: DropEdge } | null>(null);

  const boardContentRef = useRef<HTMLDivElement>(null);
  const addListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!boardId) return;
    void openBoard(boardId);
    return () => closeBoard();
  }, [boardId, openBoard, closeBoard]);

  const boardTitle = currentBoard?.title;
  useEffect(() => {
    if (boardTitle) document.title = `${boardTitle} · Flowboard`;
    return () => {
      document.title = 'Flowboard — Calm kanban for teams';
    };
  }, [boardTitle]);

  useEffect(() => {
    if (addingList) addListInputRef.current?.focus();
  }, [addingList]);

  useFlipCards(boardContentRef, [cards]);
  useBoardEntrance(boardContentRef, {
    isReady: !isLoading && !error && Boolean(currentBoard),
  });

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => a.position - b.position),
    [lists]
  );

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cards.filter((card) => {
      if (priorityFilter !== 'all' && card.priority !== priorityFilter) return false;
      if (assigneeFilter === 'unassigned' && card.assigneeId) return false;
      if (
        assigneeFilter !== 'all' &&
        assigneeFilter !== 'unassigned' &&
        card.assigneeId !== assigneeFilter
      ) {
        return false;
      }
      if (!query) return true;
      return (
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        (card.label ?? '').toLowerCase().includes(query)
      );
    });
  }, [cards, search, priorityFilter, assigneeFilter]);

  const totalByList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      counts.set(card.listId, (counts.get(card.listId) ?? 0) + 1);
    }
    return counts;
  }, [cards]);

  const cardsByList = useMemo(() => {
    const grouped = new Map<string, Card[]>();
    for (const card of filteredCards) {
      const bucket = grouped.get(card.listId);
      if (bucket) bucket.push(card);
      else grouped.set(card.listId, [card]);
    }
    for (const bucket of grouped.values()) {
      bucket.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [filteredCards]);

  const selectedCard = selectedCardId
    ? cards.find((card) => card.id === selectedCardId) ?? null
    : null;

  const hasFilters =
    search.trim().length > 0 || priorityFilter !== 'all' || assigneeFilter !== 'all';

  const isOwner = Boolean(currentBoard && user && currentBoard.ownerId === user.id);
  const boardStyle = getBoardColorStyle(currentBoard?.color);

  const deleteListCardCount = deleteListTarget
    ? cards.filter((card) => card.listId === deleteListTarget.id).length
    : 0;

  const resetDrag = () => {
    setDragCardId(null);
    setDragOver(null);
    setDragListId(null);
    setListDrop(null);
  };

  const handleCardDragStart = (cardId: string) => {
    setDragCardId(cardId);
    setDragOver(null);
    setDragListId(null);
    setListDrop(null);
  };

  const handleCardDragOver = (
    targetListId: string,
    hoveredCardId: string,
    event: DragEvent<HTMLElement>
  ) => {
    event.preventDefault();
    if (!dragCardId || hoveredCardId === dragCardId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const position: DropEdge =
      event.clientY - rect.top < rect.height / 2 ? 'before' : 'after';

    if (
      dragOver?.listId === targetListId &&
      dragOver.cardId === hoveredCardId &&
      dragOver.position === position
    ) {
      return;
    }
    setDragOver({ listId: targetListId, cardId: hoveredCardId, position });
  };

  const handleColumnDragOver = (targetListId: string, event: DragEvent<HTMLElement>) => {
    if (dragCardId) {
      event.preventDefault();
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-flip-id]')) return;
      if (dragOver?.listId === targetListId && dragOver.cardId === null) return;
      setDragOver({ listId: targetListId, cardId: null, position: 'after' });
      return;
    }

    if (!dragListId) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const edge: DropEdge =
      event.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    if (listDrop?.listId !== targetListId || listDrop?.edge !== edge) {
      setListDrop({ listId: targetListId, edge });
    }
  };

  const handleCardDrop = (targetListId: string) => {
    const draggedId = dragCardId;
    const hoverInfo = dragOver;
    resetDrag();
    if (!draggedId) return;

    const dragged = cards.find((card) => card.id === draggedId);
    if (!dragged) return;

    const position = computeDropPosition(cards, draggedId, targetListId, hoverInfo);
    if (dragged.listId === targetListId && dragged.position === position) return;
    void moveCard(draggedId, targetListId, position);
  };

  const handleListDrop = (targetListId: string, edge: DropEdge) => {
    const draggedId = dragListId;
    resetDrag();
    if (!draggedId || draggedId === targetListId) return;

    const ordered = computeListDropOrder(sortedLists, draggedId, targetListId, edge);
    void reorderLists(ordered);
  };

  const handleColumnDrop = (targetListId: string, event: DragEvent<HTMLElement>) => {
    event.preventDefault();

    if (dragListId) {
      const rect = event.currentTarget.getBoundingClientRect();
      const edge: DropEdge =
        listDrop?.listId === targetListId
          ? listDrop.edge
          : event.clientX < rect.left + rect.width / 2
            ? 'before'
            : 'after';
      handleListDrop(targetListId, edge);
      return;
    }

    if (dragCardId) handleCardDrop(targetListId);
  };

  const handleListDragStart = (listId: string, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', listId);
    const column = event.currentTarget.closest('[data-board-column]');
    if (column instanceof HTMLElement) {
      event.dataTransfer.setDragImage(column, 24, 20);
    }
    setDragListId(listId);
    setDragCardId(null);
    setDragOver(null);
    setListDrop(null);
  };

  const handleMoveList = (listId: string, direction: -1 | 1) => {
    const ordered = sortedLists.map((list) => list.id);
    const index = ordered.indexOf(listId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    void reorderLists(ordered);
  };

  const clearFilters = () => {
    setSearch('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
  };

  const handleAddList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newListTitle.trim();
    if (!title || isCreatingList) return;

    setIsCreatingList(true);
    const ok = await createList(title);
    setIsCreatingList(false);

    if (ok) {
      setNewListTitle('');
      window.requestAnimationFrame(() => addListInputRef.current?.focus());
    }
  };

  const handleSaveBoard = async (input: BoardUpdateInput): Promise<BoardSaveResult> => {
    const ok = await updateBoard(input);
    if (!ok) {
      return {
        ok: false,
        error: useBoardStore.getState().actionError ?? 'The board could not be updated.',
      };
    }
    toast.success('Board updated', 'Your changes are visible to everyone with access.');
    return { ok: true };
  };

  const handleDeleteBoard = async () => {
    if (!currentBoard || isDeletingBoard) return;
    setIsDeletingBoard(true);

    try {
      await deleteBoardService(currentBoard.id);
      toast.success('Board deleted', `“${currentBoard.title}” was permanently removed.`);
      closeBoard();
      router.replace('/dashboard');
    } catch (cause) {
      toast.error(
        'Could not delete board',
        toUserMessage(cause, 'The board could not be deleted.')
      );
      setIsDeletingBoard(false);
      setDeleteBoardOpen(false);
    }
  };

  const performLeave = async (): Promise<boolean> => {
    if (!user) return false;
    const title = currentBoard?.title ?? 'this board';
    const ok = await removeMember(user.id);

    if (!ok) {
      toast.error(
        'Could not leave board',
        useBoardStore.getState().actionError ?? 'Your membership could not be removed.'
      );
      return false;
    }

    setShowMembers(false);
    closeBoard();
    toast.success('You left the board', `You no longer have access to “${title}”.`);
    router.replace('/dashboard');
    return true;
  };

  const handleLeaveBoard = async () => {
    setIsLeavingBoard(true);
    await performLeave();
    setIsLeavingBoard(false);
    setLeaveBoardOpen(false);
  };

  const handleSaveCard = async (cardId: string, patch: CardPatchInput) =>
    updateCard(cardId, patch);

  const handleDeleteCardFromModal = async (cardId: string) => {
    const ok = await deleteCard(cardId);
    if (ok) toast.success('Card deleted');
    return ok;
  };

  const handleDeleteCard = async () => {
    if (!deleteCardTarget || isDeletingCard) return;
    setIsDeletingCard(true);
    const ok = await deleteCard(deleteCardTarget.id);
    setIsDeletingCard(false);
    setDeleteCardTarget(null);
    if (ok) toast.success('Card deleted');
  };

  const handleDeleteList = async () => {
    if (!deleteListTarget || isDeletingList) return;
    setIsDeletingList(true);
    const ok = await deleteList(deleteListTarget.id);
    setIsDeletingList(false);
    setDeleteListTarget(null);
    if (ok) toast.success('List deleted');
  };

  const handleCopyLink = async (close: () => void) => {
    close();
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied', 'Share it with a member who already has access.');
    } catch {
      toast.error('Could not copy link', 'Copy the address from your browser instead.');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-ink">Could not open this board</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
            <Button onClick={() => void openBoard(boardId)}>Try again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !currentBoard) return <BoardSkeleton />;

  return (
    <div className="flex h-screen flex-col bg-surface-muted">
      <header className="glass-header z-30 shrink-0">
        <div className="mx-auto max-w-[1700px] px-3 sm:px-6">
          <div className="flex items-center gap-2 py-2.5 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>

            <span
              className={cn('h-10 w-1.5 shrink-0 rounded-full', boardStyle.bg)}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
                  {currentBoard.title}
                </h1>
                <span className="badge hidden shrink-0 bg-surface-raised text-[11px] text-ink-muted sm:inline-flex">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {lists.length}{' '}
                  {lists.length === 1 ? 'list' : 'lists'}
                </span>
              </div>
              <p className="truncate text-[11px] text-ink-muted sm:text-xs">
                {currentBoard.description ||
                  `Updated ${formatRelativeTime(currentBoard.updatedAt)}`}
              </p>
            </div>

            {presence.length > 0 ? (
              <div
                className="hidden items-center gap-1.5 md:flex"
                title={presence.map((person) => person.userName).join(', ')}
              >
                <AvatarStack
                  people={presence.map((person) => ({
                    id: person.userId,
                    name: person.userName,
                  }))}
                  max={3}
                  size="xs"
                />
                <span className="text-[11px] text-ink-faint">
                  {presence.length} online
                </span>
              </div>
            ) : null}

            <div
              role="status"
              className="hidden items-center gap-1.5 rounded-full border border-surface-column/70 bg-surface-raised px-2.5 py-1 lg:flex"
              title={`Realtime connection: ${connectionStyles[connectionStatus].label}`}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  connectionStyles[connectionStatus].dot
                )}
                aria-hidden="true"
              />
              <span className="text-[11px] text-ink-muted">
                {connectionStyles[connectionStatus].label}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowMembers(true)}
              aria-label="View board members"
              className="shrink-0 gap-1.5 px-2 sm:px-3"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-xs tabular-nums sm:inline">{members.length}</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowActivity(true)}
              aria-label="Open activity feed"
              className="shrink-0 gap-1.5 px-2 sm:px-3"
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-xs md:inline">Activity</span>
            </Button>

            <Popover
              label="Board actions"
              trigger={({ ref, toggle, ...aria }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={toggle}
                  aria-label="Board actions"
                  className="shrink-0 rounded-xl border border-surface-column bg-surface-raised p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  {...aria}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            >
              {(close) => (
                <div className="w-52 space-y-0.5">
                  <MenuItem
                    icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => {
                      close();
                      void refresh();
                    }}
                  >
                    Refresh board
                  </MenuItem>
                  <MenuItem
                    icon={<Copy className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => void handleCopyLink(close)}
                  >
                    Copy board link
                  </MenuItem>
                  {isOwner ? (
                    <MenuItem
                      icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => {
                        close();
                        setSettingsOpen(true);
                      }}
                    >
                      Board settings
                    </MenuItem>
                  ) : null}
                  <MenuDivider />
                  {isOwner ? (
                    <MenuItem
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      danger
                      onClick={() => {
                        close();
                        setDeleteBoardOpen(true);
                      }}
                    >
                      Delete board
                    </MenuItem>
                  ) : (
                    <MenuItem
                      icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                      danger
                      onClick={() => {
                        close();
                        setLeaveBoardOpen(true);
                      }}
                    >
                      Leave board
                    </MenuItem>
                  )}
                </div>
              )}
            </Popover>
          </div>

          <BoardToolbar
            search={search}
            onSearchChange={setSearch}
            priority={priorityFilter}
            onPriorityChange={setPriorityFilter}
            assignee={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            members={members}
            visibleCount={filteredCards.length}
            totalCount={cards.length}
            hasFilters={hasFilters}
            onClear={clearFilters}
            onAddList={() => setAddingList(true)}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {actionError ? (
          <div className="shrink-0 px-3 pt-3 sm:px-6">
            <Alert
              variant="danger"
              title="That action did not complete"
              onDismiss={clearActionError}
              className="mx-auto max-w-[1700px]"
            >
              {actionError}
            </Alert>
          </div>
        ) : null}

        <div
          ref={boardContentRef}
          className="kanban-scroll min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        >
          {sortedLists.length === 0 && !addingList ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={Kanban}
                title="No lists yet"
                description="Lists are the columns on your board. Add your first one to start organising cards."
                action={
                  <Button
                    onClick={() => setAddingList(true)}
                    leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                  >
                    Add your first list
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex h-full min-w-full items-start gap-4 p-4 sm:p-5 lg:p-6">
              {sortedLists.map((list, index) => (
                <BoardColumn
                  key={list.id}
                  list={list}
                  cards={cardsByList.get(list.id) ?? []}
                  totalCount={totalByList.get(list.id) ?? 0}
                  index={index}
                  listCount={sortedLists.length}
                  members={members}
                  dragCardId={dragCardId}
                  dragOverInfo={dragOver}
                  listDropEdge={listDrop?.listId === list.id ? listDrop.edge : null}
                  draggedListId={dragListId}
                  onRename={(title) => renameList(list.id, title)}
                  onDelete={() => setDeleteListTarget(list)}
                  onMove={(direction) => handleMoveList(list.id, direction)}
                  onCreateCard={(title) => createCard(list.id, title)}
                  onOpenCard={(card) => setSelectedCardId(card.id)}
                  onRequestDeleteCard={(card) => setDeleteCardTarget(card)}
                  onCardDragStart={handleCardDragStart}
                  onCardDragEnd={resetDrag}
                  onCardDragOver={(cardId, event) =>
                    handleCardDragOver(list.id, cardId, event)
                  }
                  onColumnDragOver={(event) => handleColumnDragOver(list.id, event)}
                  onColumnDrop={(event) => handleColumnDrop(list.id, event)}
                  onListDragStart={(event) => handleListDragStart(list.id, event)}
                  onListDragEnd={resetDrag}
                />
              ))}

              <div className="w-72 shrink-0 self-start">
                {addingList ? (
                  <form
                    onSubmit={handleAddList}
                    className="rounded-3xl border border-surface-column/80 bg-surface-raised p-3.5 shadow-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">New list</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingList(false);
                          setNewListTitle('');
                        }}
                        aria-label="Cancel new list"
                        className="rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <input
                      ref={addListInputRef}
                      value={newListTitle}
                      onChange={(event) => setNewListTitle(event.target.value)}
                      placeholder="List title…"
                      maxLength={200}
                      aria-label="New list title"
                      className="input mt-2.5 px-2.5 py-2 text-sm"
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setAddingList(false);
                          setNewListTitle('');
                        }
                      }}
                    />
                    <div className="mt-2 flex items-center gap-1.5">
                      <Button type="submit" size="sm" isLoading={isCreatingList}>
                        Add list
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAddingList(false);
                          setNewListTitle('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingList(true)}
                    className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-surface-column/80 bg-surface-raised/50 px-3.5 py-3 text-left text-sm font-medium text-ink-muted transition-colors hover:border-accent/40 hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add another list
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CardDetailModal
        open={Boolean(selectedCard)}
        card={selectedCard}
        lists={sortedLists}
        members={members}
        onClose={() => setSelectedCardId(null)}
        onSave={handleSaveCard}
        onDelete={handleDeleteCardFromModal}
      />

      <ActivityDrawer
        open={showActivity}
        onClose={() => setShowActivity(false)}
        logs={activityLogs}
      />

      <MembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        boardTitle={currentBoard.title}
        members={members}
        currentUserId={user?.id ?? ''}
        isOwner={isOwner}
        onInvite={(email) => inviteMember(email)}
        onRemove={(userId) => removeMember(userId)}
        onLeave={async () => {
          await performLeave();
        }}
      />

      {isOwner ? (
        <BoardSettingsModal
          open={settingsOpen}
          board={currentBoard}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveBoard}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteCardTarget)}
        title="Delete this card?"
        description={
          deleteCardTarget
            ? `“${deleteCardTarget.title}” will be permanently removed from this board.`
            : ''
        }
        confirmLabel="Delete card"
        isLoading={isDeletingCard}
        onConfirm={() => void handleDeleteCard()}
        onCancel={() => {
          if (!isDeletingCard) setDeleteCardTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteListTarget)}
        title="Delete this list?"
        description={
          deleteListTarget
            ? `“${deleteListTarget.title}”${
                deleteListCardCount > 0
                  ? ` and its ${deleteListCardCount} ${
                      deleteListCardCount === 1 ? 'card' : 'cards'
                    }`
                  : ''
              } will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete list"
        isLoading={isDeletingList}
        onConfirm={() => void handleDeleteList()}
        onCancel={() => {
          if (!isDeletingList) setDeleteListTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteBoardOpen}
        title="Delete this board?"
        description={`“${currentBoard.title}” and all of its lists, cards, and activity will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete board"
        isLoading={isDeletingBoard}
        onConfirm={() => void handleDeleteBoard()}
        onCancel={() => {
          if (!isDeletingBoard) setDeleteBoardOpen(false);
        }}
      />

      <ConfirmDialog
        open={leaveBoardOpen}
        title="Leave this board?"
        description={`You will lose access to “${currentBoard.title}” and its cards. The owner can add you back later.`}
        confirmLabel="Leave board"
        tone="primary"
        isLoading={isLeavingBoard}
        onConfirm={() => void handleLeaveBoard()}
        onCancel={() => {
          if (!isLeavingBoard) setLeaveBoardOpen(false);
        }}
      />
    </div>
  );
}

export default function BoardPage() {
  return (
    <RequireAuth>
      <BoardView />
    </RequireAuth>
  );
}
