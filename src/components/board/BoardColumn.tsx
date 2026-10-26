'use client';

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import type { DropEdge, DragOverInfo } from '@/lib/reorder';
import type { BoardList, BoardMember, Card } from '@/types/domain';
import { KanbanCard } from './KanbanCard';

interface BoardColumnProps {
  list: BoardList;
  cards: Card[];
  totalCount: number;
  index: number;
  listCount: number;
  members: BoardMember[];
  dragCardId: string | null;
  dragOverInfo: DragOverInfo | null;
  listDropEdge: DropEdge | null;
  draggedListId: string | null;
  onRename: (title: string) => Promise<boolean>;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onCreateCard: (title: string) => Promise<boolean>;
  onOpenCard: (card: Card) => void;
  onRequestDeleteCard: (card: Card) => void;
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
  onCardDragOver: (cardId: string, event: DragEvent<HTMLElement>) => void;
  onColumnDragOver: (event: DragEvent<HTMLElement>) => void;
  onColumnDrop: (event: DragEvent<HTMLElement>) => void;
  onListDragStart: (event: DragEvent<HTMLElement>) => void;
  onListDragEnd: () => void;
}

export function BoardColumn({
  list,
  cards,
  totalCount,
  index,
  listCount,
  members,
  dragCardId,
  dragOverInfo,
  listDropEdge,
  draggedListId,
  onRename,
  onDelete,
  onMove,
  onCreateCard,
  onOpenCard,
  onRequestDeleteCard,
  onCardDragStart,
  onCardDragEnd,
  onCardDragOver,
  onColumnDragOver,
  onColumnDrop,
  onListDragStart,
  onListDragEnd,
}: BoardColumnProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(list.title);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRenaming) setRenameValue(list.title);
  }, [list.title, isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isAdding) addRef.current?.focus();
  }, [isAdding]);

  const memberNames = new Map(members.map((member) => [member.userId, member.displayName]));
  const isBeingDragged = draggedListId === list.id;
  const isCardTarget = dragOverInfo?.listId === list.id;
  const countsDiffer = cards.length !== totalCount;

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === list.title) {
      setIsRenaming(false);
      return;
    }

    setIsSavingRename(true);
    const ok = await onRename(trimmed);
    setIsSavingRename(false);
    if (ok) setIsRenaming(false);
  };

  const submitCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    const ok = await onCreateCard(trimmed);
    setIsCreating(false);
    if (ok) {
      setNewTitle('');
      window.requestAnimationFrame(() => addRef.current?.focus());
    }
  };

  return (
    <section
      data-board-column
      aria-label={`${list.title} list`}
      onDragOver={onColumnDragOver}
      onDrop={onColumnDrop}
      className={cn(
        'relative flex max-h-full w-72 shrink-0 flex-col rounded-3xl border border-surface-column/80 bg-surface-muted/70 transition-all',
        isCardTarget && 'border-accent/40 bg-accent-soft/30',
        isBeingDragged && 'opacity-60',
        listDropEdge && 'border-accent/50'
      )}
    >
      {listDropEdge ? (
        <span
          className={cn(
            'absolute inset-y-3 w-1 rounded-full bg-accent shadow-sm',
            listDropEdge === 'before' ? '-left-2' : '-right-2'
          )}
          aria-hidden="true"
        />
      ) : null}

      <header className="flex items-start gap-1.5 px-3 pb-2 pt-3">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            onListDragStart(event);
          }}
          onDragEnd={onListDragEnd}
          aria-label={`Drag ${list.title} to reorder`}
          title="Drag to reorder list"
          className="mt-0.5 -ml-1 cursor-grab rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <form onSubmit={submitRename} className="flex items-center gap-1">
              <input
                ref={renameRef}
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={200}
                aria-label="List name"
                className="input min-w-0 flex-1 px-2 py-1 text-sm"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setIsRenaming(false);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSavingRename || !renameValue.trim()}
                aria-label="Save list name"
                className="rounded-lg p-1.5 text-success transition-colors hover:bg-success-soft disabled:opacity-50"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsRenaming(false)}
                aria-label="Cancel rename"
                className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-ink">{list.title}</h2>
              <span className="badge shrink-0 bg-surface-raised/80 text-[11px] text-ink-faint">
                {countsDiffer ? `${cards.length}/${totalCount}` : totalCount}
              </span>
            </div>
          )}
        </div>

        <Popover
          label={`${list.title} list actions`}
          trigger={({ ref, toggle, ...aria }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-label={`Actions for list ${list.title}`}
              className="-mr-1 mt-0.5 rounded-lg p-1 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              {...aria}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <div className="w-48 space-y-0.5">
              <MenuItem
                icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                onClick={() => {
                  close();
                  setRenameValue(list.title);
                  setIsRenaming(true);
                }}
              >
                Rename list
              </MenuItem>
              <MenuItem
                icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                disabled={index === 0}
                onClick={() => {
                  close();
                  onMove(-1);
                }}
              >
                Move left
              </MenuItem>
              <MenuItem
                icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                disabled={index === listCount - 1}
                onClick={() => {
                  close();
                  onMove(1);
                }}
              >
                Move right
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                danger
                onClick={() => {
                  close();
                  onDelete();
                }}
              >
                Delete list
              </MenuItem>
            </div>
          )}
        </Popover>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-2">
        {cards.map((card) => {
          const showBefore =
            dragOverInfo?.listId === list.id &&
            dragOverInfo.cardId === card.id &&
            dragOverInfo.position === 'before';
          const showAfter =
            dragOverInfo?.listId === list.id &&
            dragOverInfo.cardId === card.id &&
            dragOverInfo.position === 'after';

          return (
            <div key={card.id}>
              {showBefore ? (
                <div className="mb-1 h-0.5 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
              <KanbanCard
                card={card}
                assigneeName={
                  card.assigneeId ? memberNames.get(card.assigneeId) ?? 'Member' : null
                }
                isDragging={dragCardId === card.id}
                onDragStart={() => onCardDragStart(card.id)}
                onDragEnd={onCardDragEnd}
                onDragOverCard={(event) => onCardDragOver(card.id, event)}
                onOpen={() => onOpenCard(card)}
                onRequestDelete={() => onRequestDeleteCard(card)}
              />
              {showAfter ? (
                <div className="mt-1 h-0.5 rounded-full bg-accent" aria-hidden="true" />
              ) : null}
            </div>
          );
        })}

        {dragCardId && isCardTarget && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/20 px-3 py-7 text-center">
            <p className="text-xs font-medium text-accent-hover">Drop card here</p>
            <p className="text-[11px] text-ink-faint">It will be added to this list</p>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-column px-3 py-6 text-center">
            <p className="text-xs text-ink-faint">
              {totalCount > 0 ? 'No cards match the filters' : 'No cards yet'}
            </p>
          </div>
        ) : null}

        {dragOverInfo?.listId === list.id && dragOverInfo.cardId === null && cards.length > 0 ? (
          <div className="h-0.5 rounded-full bg-accent" aria-hidden="true" />
        ) : null}

        {isAdding ? (
          <form
            onSubmit={submitCard}
            className="rounded-2xl border border-surface-column/80 bg-surface-raised p-2.5 shadow-card"
          >
            <input
              ref={addRef}
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Card title…"
              maxLength={500}
              aria-label="New card title"
              className="input px-2.5 py-2 text-sm"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsAdding(false);
                  setNewTitle('');
                }
              }}
            />
            <div className="mt-2 flex items-center gap-1.5">
              <Button type="submit" size="sm" isLoading={isCreating}>
                Add card
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>

      {!isAdding ? (
        <div className="px-2.5 pb-2.5">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-left text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add a card
          </button>
        </div>
      ) : null}
    </section>
  );
}
