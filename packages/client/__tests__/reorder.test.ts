import { computeDropPosition, type DragOverInfo } from '@/lib/reorder';
import type { Card } from '@kanban/shared';

function makeCard(id: string, listId: string, position: number): Card {
  return {
    _id: id,
    title: `Card ${id}`,
    listId,
    boardId: 'board-1',
    description: '',
    position,
    assigneeId: null,
    priority: 'none',
    dueDate: null,
    label: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('computeDropPosition', () => {
  const cards: Card[] = [
    makeCard('a', 'list-1', 0),
    makeCard('b', 'list-1', 1),
    makeCard('c', 'list-1', 2),
    makeCard('d', 'list-2', 0),
  ];

  it('appends to the end of the target list when there is no hover info', () => {
    const position = computeDropPosition(cards, 'a', 'list-2', null);
    expect(position).toBe(1);
  });

  it('appends to the end when hovering a list with no matching card', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'nonexistent', position: 'before' };
    const position = computeDropPosition(cards, 'd', 'list-1', dragOverInfo);
    expect(position).toBe(3);
  });

  it('inserts before the hovered card', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'before' };
    const position = computeDropPosition(cards, 'd', 'list-1', dragOverInfo);
    expect(position).toBe(1);
  });

  it('inserts after the hovered card', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'after' };
    const position = computeDropPosition(cards, 'd', 'list-1', dragOverInfo);
    expect(position).toBe(2);
  });

  it('excludes the dragged card itself from the target list when computing the index', () => {
    // "a" is dragged and dropped after itself within the same list; since
    // it's excluded from targetCards, "before b" resolves to index 0.
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'before' };
    const position = computeDropPosition(cards, 'a', 'list-1', dragOverInfo);
    expect(position).toBe(0);
  });

  it('ignores hover info from a different list than the drop target', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-2', cardId: 'd', position: 'before' };
    const position = computeDropPosition(cards, 'a', 'list-1', dragOverInfo);
    // Falls back to appending at the end of list-1 (excluding 'a' itself: b, c).
    expect(position).toBe(2);
  });
});
