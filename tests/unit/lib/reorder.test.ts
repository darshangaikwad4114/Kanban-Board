import {
  applyListOrder,
  applyOptimisticMove,
  computeDropPosition,
  computeListDropOrder,
  sortCards,
  type DragOverInfo,
} from '@/lib/reorder';
import type { BoardList, Card } from '@/types/domain';

function makeCard(id: string, listId: string, position: number): Card {
  return {
    id,
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

function makeList(id: string, position: number): BoardList {
  return {
    id,
    boardId: 'board-1',
    title: `List ${id}`,
    position,
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
    expect(computeDropPosition(cards, 'a', 'list-2', null)).toBe(1);
  });

  it('appends to the end when the hovered card is not in the target list', () => {
    const dragOverInfo: DragOverInfo = {
      listId: 'list-1',
      cardId: 'nonexistent',
      position: 'before',
    };
    expect(computeDropPosition(cards, 'd', 'list-1', dragOverInfo)).toBe(3);
  });

  it('inserts before the hovered card', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'before' };
    expect(computeDropPosition(cards, 'd', 'list-1', dragOverInfo)).toBe(1);
  });

  it('inserts after the hovered card', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'after' };
    expect(computeDropPosition(cards, 'd', 'list-1', dragOverInfo)).toBe(2);
  });

  it('excludes the dragged card itself when computing its own index', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-1', cardId: 'b', position: 'before' };
    expect(computeDropPosition(cards, 'a', 'list-1', dragOverInfo)).toBe(0);
  });

  it('ignores hover info from a different list than the drop target', () => {
    const dragOverInfo: DragOverInfo = { listId: 'list-2', cardId: 'd', position: 'before' };
    expect(computeDropPosition(cards, 'a', 'list-1', dragOverInfo)).toBe(2);
  });
});

describe('applyOptimisticMove', () => {
  it('reorders cards within the same list and keeps positions contiguous', () => {
    const cards = [
      makeCard('a', 'list-1', 0),
      makeCard('b', 'list-1', 1),
      makeCard('c', 'list-1', 2),
    ];

    const next = sortCards(applyOptimisticMove(cards, 'c', 'list-1', 0));

    expect(next.map((card) => card.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((card) => card.position)).toEqual([0, 1, 2]);
  });

  it('moves a card across lists and closes the gap in the source list', () => {
    const cards = [
      makeCard('a', 'list-1', 0),
      makeCard('b', 'list-1', 1),
      makeCard('c', 'list-2', 0),
    ];

    const next = applyOptimisticMove(cards, 'a', 'list-2', 1);
    const byId = new Map(next.map((card) => [card.id, card]));

    expect(byId.get('a')).toMatchObject({ listId: 'list-2', position: 1 });
    expect(byId.get('b')).toMatchObject({ listId: 'list-1', position: 0 });
    expect(byId.get('c')).toMatchObject({ listId: 'list-2', position: 0 });
  });

  it('clamps an out-of-range target index to the end of the target list', () => {
    const cards = [makeCard('a', 'list-1', 0), makeCard('b', 'list-2', 0)];

    const next = applyOptimisticMove(cards, 'b', 'list-1', 99);

    expect(next.find((card) => card.id === 'b')).toMatchObject({
      listId: 'list-1',
      position: 1,
    });
  });

  it('returns the original array when the card does not exist', () => {
    const cards = [makeCard('a', 'list-1', 0)];
    expect(applyOptimisticMove(cards, 'missing', 'list-1', 0)).toBe(cards);
  });
});

describe('computeListDropOrder', () => {
  const lists = [makeList('a', 0), makeList('b', 1), makeList('c', 2)];

  it('inserts before the target list', () => {
    expect(computeListDropOrder(lists, 'c', 'a', 'before')).toEqual(['c', 'a', 'b']);
  });

  it('inserts after the target list', () => {
    expect(computeListDropOrder(lists, 'a', 'c', 'after')).toEqual(['b', 'c', 'a']);
  });

  it('returns the current order for unknown ids', () => {
    expect(computeListDropOrder(lists, 'missing', 'a', 'before')).toEqual(['a', 'b', 'c']);
  });
});

describe('applyListOrder', () => {
  it('applies positions from the ordered ids without mutating the input', () => {
    const lists = [makeList('a', 0), makeList('b', 1), makeList('c', 2)];

    const next = applyListOrder(lists, ['c', 'a', 'b']);

    expect(next).not.toBe(lists);
    expect(lists.map((list) => list.position)).toEqual([0, 1, 2]);
    expect(
      [...next]
        .sort((left, right) => left.position - right.position)
        .map((list) => list.id)
    ).toEqual(['c', 'a', 'b']);
  });
});
