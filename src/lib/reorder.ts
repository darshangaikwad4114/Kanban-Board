import type { BoardList, Card } from '@/types/domain';

export interface DragOverInfo {
  listId: string;
  cardId: string | null;
  position: 'before' | 'after';
}

export type DropEdge = 'before' | 'after';

function byPosition<T extends { position: number }>(a: T, b: T): number {
  return a.position - b.position;
}

/**
 * Computes the target position (0-based index) for a dragged card within
 * `targetListId`, excluding the dragged card itself. Falls back to appending
 * at the end when there is no relevant hover information.
 */
export function computeDropPosition(
  cards: Card[],
  draggedCardId: string,
  targetListId: string,
  dragOverInfo: DragOverInfo | null
): number {
  const targetCards = cards
    .filter((card) => card.listId === targetListId && card.id !== draggedCardId)
    .sort(byPosition);

  if (dragOverInfo && dragOverInfo.listId === targetListId && dragOverInfo.cardId) {
    const hoveredIndex = targetCards.findIndex((card) => card.id === dragOverInfo.cardId);
    if (hoveredIndex !== -1) {
      return dragOverInfo.position === 'before' ? hoveredIndex : hoveredIndex + 1;
    }
  }

  return targetCards.length;
}

/**
 * Mirrors the database move_card behaviour locally so the UI can update before
 * the RPC round-trip. Positions are kept contiguous in both affected lists.
 */
export function applyOptimisticMove(
  cards: Card[],
  cardId: string,
  targetListId: string,
  newPosition: number
): Card[] {
  const card = cards.find((item) => item.id === cardId);
  if (!card) return cards;

  const targetCards = cards
    .filter((item) => item.listId === targetListId && item.id !== cardId)
    .sort(byPosition);
  const index = Math.max(0, Math.min(newPosition, targetCards.length));

  if (card.listId === targetListId) {
    const ordered = [...targetCards];
    ordered.splice(index, 0, card);
    const positions = new Map(ordered.map((item, position) => [item.id, position]));
    return cards.map((item) => {
      const position = positions.get(item.id);
      return position === undefined ? item : { ...item, position };
    });
  }

  const sourceCards = cards
    .filter((item) => item.listId === card.listId && item.id !== cardId)
    .sort(byPosition);

  const positions = new Map<string, number>();
  sourceCards.forEach((item, position) => positions.set(item.id, position));
  targetCards.forEach((item, targetIndex) => {
    positions.set(item.id, targetIndex < index ? targetIndex : targetIndex + 1);
  });

  return cards.map((item) => {
    if (item.id === cardId) {
      return { ...item, listId: targetListId, position: index };
    }
    const position = positions.get(item.id);
    return position === undefined ? item : { ...item, position };
  });
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(byPosition);
}

export function sortLists(lists: BoardList[]): BoardList[] {
  return [...lists].sort(byPosition);
}

/** Returns the ids of `lists` with `draggedListId` moved next to the target. */
export function computeListDropOrder(
  lists: BoardList[],
  draggedListId: string,
  targetListId: string,
  position: DropEdge
): string[] {
  const ordered = sortLists(lists).map((list) => list.id);
  if (!ordered.includes(draggedListId) || !ordered.includes(targetListId)) {
    return ordered;
  }

  const withoutDragged = ordered.filter((id) => id !== draggedListId);
  const targetIndex = withoutDragged.indexOf(targetListId);
  const insertAt = position === 'before' ? targetIndex : targetIndex + 1;
  withoutDragged.splice(insertAt, 0, draggedListId);
  return withoutDragged;
}

export function applyListOrder(lists: BoardList[], orderedIds: string[]): BoardList[] {
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  return lists.map((list) => {
    const position = positions.get(list.id);
    return position === undefined ? list : { ...list, position };
  });
}
