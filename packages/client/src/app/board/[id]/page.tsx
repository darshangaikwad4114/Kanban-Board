"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useBoardStore } from "@/store/boardStore";
import { KanbanCard } from "@/components/board/KanbanCard";
import { AnimatedPanel } from "@/components/ui/AnimatedPanel";
import { BoardSkeleton } from "@/components/ui/Skeleton";
import { ActivitySidebar } from "@/components/board/ActivitySidebar";
import { CardDetailModal } from "@/components/board/CardDetailModal";
import { useFlipCards } from "@/hooks/animations/useFlipCards";
import { useBoardEntrance } from "@/hooks/animations/useBoardEntrance";
import { animateExit } from "@/hooks/animations/useExitAnimation";
import { getBoardColorStyle } from "@/lib/theme";
import { computeDropPosition, type DragOverInfo } from "@/lib/reorder";
import type { Card } from "@kanban/shared";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const boardContentRef = useRef<HTMLDivElement>(null);

  const {
    isAuthenticated,
    isInitializing: authLoading,
    loadUser,
  } = useAuthStore();
  const {
    currentBoard,
    lists,
    cards,
    presence,
    connectionStatus,
    activityLogs,
    isLoading,
    error,
    loadBoard,
    joinBoard,
    leaveBoard,
    createList,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    deleteList,
  } = useBoardStore();

  const [newListTitle, setNewListTitle] = useState("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>(
    {},
  );
  const [showNewCardInput, setShowNewCardInput] = useState<
    Record<string, boolean>
  >({});
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/auth/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && boardId) {
      loadBoard(boardId);
      joinBoard(boardId);
    }
    return () => {
      leaveBoard();
    };
  }, [isAuthenticated, boardId]);

  const isBoardReady = !authLoading && !isLoading && !error;
  useFlipCards(boardContentRef, [cards]);
  useBoardEntrance(boardContentRef, { isReady: isBoardReady });

  const filteredCards = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.label?.toLowerCase().includes(q),
    );
  }, [cards, search]);

  const getCardsForList = useCallback(
    (listId: string) =>
      filteredCards
        .filter((c) => c.listId === listId)
        .sort((a, b) => a.position - b.position),
    [filteredCards],
  );

  const boardStyle = getBoardColorStyle(currentBoard?.color);

  const handleAddList = async () => {
    if (!newListTitle.trim() || !boardId) return;
    await createList(newListTitle.trim(), boardId);
    setNewListTitle("");
    setShowNewListInput(false);
  };

  const handleAddCard = async (listId: string) => {
    const title = newCardTitles[listId]?.trim();
    if (!title || !boardId) return;
    await createCard(title, listId, boardId);
    setNewCardTitles((prev) => ({ ...prev, [listId]: "" }));
    setShowNewCardInput((prev) => ({ ...prev, [listId]: false }));
  };

  const handleCardDragOver =
    (targetListId: string) => (hoveredCardId: string, e: React.DragEvent) => {
      if (!dragCardId || hoveredCardId === dragCardId) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const position: "before" | "after" =
        e.clientY - rect.top < rect.height / 2 ? "before" : "after";
      setDragOverInfo({
        listId: targetListId,
        cardId: hoveredCardId,
        position,
      });
    };

  const handleDrop = (targetListId: string) => {
    if (!dragCardId) {
      setDragOverInfo(null);
      return;
    }
    const card = cards.find((c) => c._id === dragCardId);
    if (!card) {
      setDragCardId(null);
      setDragOverInfo(null);
      return;
    }

    const newPosition = computeDropPosition(
      cards,
      dragCardId,
      targetListId,
      dragOverInfo,
    );

    moveCard(dragCardId, targetListId, newPosition);
    setDragCardId(null);
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    setDragCardId(null);
    setDragOverInfo(null);
  };

  const handleDeleteList = (listId: string) => {
    const el = boardContentRef.current?.querySelector(
      `[data-list-id="${listId}"]`,
    ) as HTMLElement | null;
    animateExit(el, () => deleteList(listId));
  };

  const connectionBadge = {
    connected: { color: "bg-success", label: "Live" },
    connecting: { color: "bg-warning", label: "Connecting…" },
    reconnecting: { color: "bg-warning", label: "Reconnecting…" },
    disconnected: { color: "bg-danger", label: "Offline" },
  }[connectionStatus];

  if (authLoading || isLoading) return <BoardSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="card p-8 text-center max-w-md">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-danger mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-surface-muted">
      {/* Header */}
      <header className="glass-header shrink-0">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-ghost !p-2 rounded-xl shrink-0"
            >
              ←
            </button>
            <div className={`w-3 h-8 rounded-full ${boardStyle.bg} shrink-0`} />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ink truncate">
                {currentBoard?.title || "Board"}
              </h1>
              {currentBoard?.description && (
                <p className="text-xs text-ink-muted truncate">
                  {currentBoard.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
              className="input !py-1.5 !px-3 text-sm hidden sm:block w-44 lg:w-56"
            />

            <div className="flex -space-x-2">
              {presence.slice(0, 4).map((p) => (
                <div
                  key={p.userId}
                  title={p.userName}
                  className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-medium ring-2 ring-surface-raised"
                >
                  {p.userName.charAt(0).toUpperCase()}
                </div>
              ))}
              {presence.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-ink-faint text-white flex items-center justify-center text-xs ring-2 ring-surface-raised">
                  +{presence.length - 4}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted border border-surface-column/60">
              <div
                className={`w-2 h-2 rounded-full ${connectionBadge.color}`}
              />
              <span className="text-xs text-ink-muted hidden sm:inline">
                {connectionBadge.label}
              </span>
            </div>

            <button
              onClick={() => setShowActivity(true)}
              className="btn-secondary !py-1.5 !px-3 text-sm"
            >
              Activity
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div ref={boardContentRef} className="flex-1 overflow-x-auto p-4 lg:p-6">
        <div className="flex gap-4 h-full min-h-0">
          {lists
            .sort((a, b) => a.position - b.position)
            .map((list) => {
              const listCards = getCardsForList(list._id);
              return (
                <div
                  key={list._id}
                  data-board-column
                  data-list-id={list._id}
                  className="kanban-column w-72 shrink-0 flex flex-col max-h-full"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(list._id)}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink text-sm">
                        {list.title}
                      </h3>
                      <span className="badge bg-surface-raised/80 text-ink-faint text-xs">
                        {listCards.length}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteList(list._id)}
                      className="text-ink-faint hover:text-danger text-sm opacity-60 hover:opacity-100"
                      aria-label={`Delete list ${list.title}`}
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2.5">
                    {listCards.length === 0 && search && (
                      <p className="text-xs text-ink-faint text-center py-4">
                        No matching cards
                      </p>
                    )}
                    {listCards.map((card) => (
                      <div
                        key={card._id}
                        className={
                          dragOverInfo?.listId === list._id &&
                          dragOverInfo?.cardId === card._id
                            ? dragOverInfo.position === "before"
                              ? "border-t-2 border-accent rounded-t-2xl"
                              : "border-b-2 border-accent rounded-b-2xl"
                            : undefined
                        }
                      >
                        <KanbanCard
                          card={card}
                          onDragStart={setDragCardId}
                          onDragOverCard={handleCardDragOver(list._id)}
                          onDragEnd={handleDragEnd}
                          onDelete={deleteCard}
                          onClick={setSelectedCard}
                        />
                      </div>
                    ))}

                    <AnimatedPanel show={!!showNewCardInput[list._id]}>
                      <div className="card p-3">
                        <input
                          type="text"
                          value={newCardTitles[list._id] || ""}
                          onChange={(e) =>
                            setNewCardTitles((prev) => ({
                              ...prev,
                              [list._id]: e.target.value,
                            }))
                          }
                          placeholder="Card title…"
                          className="input text-sm mb-2"
                          autoFocus
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddCard(list._id)
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddCard(list._id)}
                            className="btn-primary text-xs !py-1.5 !px-3"
                          >
                            Add
                          </button>
                          <button
                            onClick={() =>
                              setShowNewCardInput((prev) => ({
                                ...prev,
                                [list._id]: false,
                              }))
                            }
                            className="btn-secondary text-xs !py-1.5 !px-3"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </AnimatedPanel>
                  </div>

                  <div className="px-3 pb-3">
                    <button
                      onClick={() =>
                        setShowNewCardInput((prev) => ({
                          ...prev,
                          [list._id]: true,
                        }))
                      }
                      className="w-full text-left text-sm text-ink-muted hover:text-ink py-2 px-3 rounded-2xl hover:bg-surface-raised/60 transition-colors"
                    >
                      + Add card
                    </button>
                  </div>
                </div>
              );
            })}

          {/* Add list */}
          <div className="kanban-column w-72 shrink-0 self-start">
            <AnimatedPanel show={showNewListInput}>
              <div className="p-4">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="List title…"
                  className="input text-sm mb-2"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddList}
                    className="btn-primary text-xs !py-1.5 !px-3"
                  >
                    Add list
                  </button>
                  <button
                    onClick={() => {
                      setShowNewListInput(false);
                      setNewListTitle("");
                    }}
                    className="btn-secondary text-xs !py-1.5 !px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </AnimatedPanel>
            {!showNewListInput && (
              <button
                onClick={() => setShowNewListInput(true)}
                className="w-full text-left text-sm text-ink-muted hover:text-ink p-4 rounded-3xl hover:bg-surface-raised/40 transition-colors"
              >
                + Add another list
              </button>
            )}
          </div>
        </div>
      </div>

      <CardDetailModal
        card={selectedCard}
        lists={lists}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onSave={updateCard}
        onDelete={deleteCard}
      />

      <ActivitySidebar
        open={showActivity}
        onClose={() => setShowActivity(false)}
        logs={activityLogs}
      />
    </div>
  );
}
