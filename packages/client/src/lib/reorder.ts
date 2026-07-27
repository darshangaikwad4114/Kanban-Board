import type { Card } from '@kanban/shared';

export interface DragOverInfo {
  listId: string;
  cardId: string | null;
  position: 'before' | 'after';
}

/**
 * Computes the target position (0-based index) a dragged card should be
 * inserted at within `targetListId`, given the current cards and the
 * card/edge the user is hovering over. Falls back to appending at the end
 * of the target list when there's no relevant hover info.
 */
export function computeDropPosition(
  cards: Card[],
  draggedCardId: string,
  targetListId: string,
  dragOverInfo: DragOverInfo | null
): number {
  const targetCards = cards
    .filter((c) => c.listId === targetListId && c._id !== draggedCardId)
    .sort((a, b) => a.position - b.position);

  if (dragOverInfo && dragOverInfo.listId === targetListId && dragOverInfo.cardId) {
    const hoveredIndex = targetCards.findIndex((c) => c._id === dragOverInfo.cardId);
    if (hoveredIndex !== -1) {
      return dragOverInfo.position === 'before' ? hoveredIndex : hoveredIndex + 1;
    }
  }

  return targetCards.length;
}
