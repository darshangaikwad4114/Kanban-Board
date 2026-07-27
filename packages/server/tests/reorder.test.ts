import { planCardMove } from '../src/utils/reorder';

describe('planCardMove', () => {
  it('is a no-op when the position does not change within the same list', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-a',
      oldPosition: 2,
      requestedPosition: 2,
      destCount: 5,
    });

    expect(result.position).toBe(2);
    expect(result.shifts).toEqual([]);
  });

  it('shifts cards up by one when moving down within the same list', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-a',
      oldPosition: 1,
      requestedPosition: 3,
      destCount: 4,
    });

    expect(result.position).toBe(3);
    expect(result.shifts).toEqual([
      { listId: 'list-a', from: 2, to: 3, delta: -1 },
    ]);
  });

  it('shifts cards down by one when moving up within the same list', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-a',
      oldPosition: 3,
      requestedPosition: 1,
      destCount: 4,
    });

    expect(result.position).toBe(1);
    expect(result.shifts).toEqual([
      { listId: 'list-a', from: 1, to: 2, delta: 1 },
    ]);
  });

  it('closes the gap in the source list and opens one in the destination list when moving across lists', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-b',
      oldPosition: 2,
      requestedPosition: 1,
      destCount: 3,
    });

    expect(result.position).toBe(1);
    expect(result.shifts).toEqual([
      { listId: 'list-a', from: 3, to: null, delta: -1 },
      { listId: 'list-b', from: 1, to: null, delta: 1 },
    ]);
  });

  it('clamps a requested position beyond the end of the destination list', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-b',
      oldPosition: 0,
      requestedPosition: 999,
      destCount: 3,
    });

    expect(result.position).toBe(3);
  });

  it('clamps a negative requested position to zero', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-a',
      oldPosition: 2,
      requestedPosition: -5,
      destCount: 4,
    });

    expect(result.position).toBe(0);
    expect(result.shifts).toEqual([
      { listId: 'list-a', from: 0, to: 1, delta: 1 },
    ]);
  });

  it('appends to the end of an empty destination list', () => {
    const result = planCardMove({
      sourceListId: 'list-a',
      targetListId: 'list-b',
      oldPosition: 0,
      requestedPosition: 0,
      destCount: 0,
    });

    expect(result.position).toBe(0);
    expect(result.shifts).toEqual([
      { listId: 'list-a', from: 1, to: null, delta: -1 },
      { listId: 'list-b', from: 0, to: null, delta: 1 },
    ]);
  });
});
