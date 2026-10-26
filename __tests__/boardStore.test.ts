import { useBoardStore } from '@/store/boardStore';
import * as boardsService from '@/services/boards.service';
import * as cardsService from '@/services/cards.service';
import * as listsService from '@/services/lists.service';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ServiceError } from '@/lib/errors';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Board, BoardList, BoardMember, BoardSnapshot, Card } from '@/types/domain';

jest.mock('@/services/boards.service', () => ({
  fetchBoardSnapshot: jest.fn(),
  inviteBoardMember: jest.fn(),
  listMembers: jest.fn(),
  removeBoardMember: jest.fn(),
  updateBoard: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock('@/services/cards.service', () => ({
  createCard: jest.fn(),
  updateCard: jest.fn(),
  moveCard: jest.fn(),
  deleteCard: jest.fn(),
}));

jest.mock('@/services/lists.service', () => ({
  createList: jest.fn(),
  renameList: jest.fn(),
  deleteList: jest.fn(),
  reorderLists: jest.fn(),
}));

jest.mock('@/services/activity.service', () => ({
  logActivity: jest.fn(() => Promise.resolve()),
}));

const BOARD: Board = {
  id: 'board-1',
  title: 'Product',
  description: '',
  color: 'lavender',
  templateId: 'basic-kanban',
  ownerId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: {
    listCount: 2,
    cardCount: 3,
    overdueCount: 0,
    dueTodayCount: 0,
    highPriorityCount: 0,
    mediumPriorityCount: 0,
    lowPriorityCount: 0,
    nonePriorityCount: 3,
    memberCount: 2,
  },
};

function makeList(id: string, position: number): BoardList {
  return {
    id,
    boardId: BOARD.id,
    title: `List ${id}`,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeCard(
  id: string,
  listId: string,
  position: number,
  overrides: Partial<Card> = {}
): Card {
  return {
    id,
    boardId: BOARD.id,
    listId,
    title: `Card ${id}`,
    description: '',
    position,
    assigneeId: null,
    priority: 'none',
    dueDate: null,
    label: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeMember(userId: string, role: BoardMember['role'] = 'member'): BoardMember {
  return {
    boardId: BOARD.id,
    userId,
    role,
    displayName: userId === 'user-1' ? 'Ada' : 'Grace',
    joinedAt: '2026-01-01T00:00:00.000Z',
  };
}

function seedState({
  lists = [makeList('list-1', 0), makeList('list-2', 1)],
  cards = [
    makeCard('card-1', 'list-1', 0),
    makeCard('card-2', 'list-1', 1),
    makeCard('card-3', 'list-2', 0),
  ],
  members = [makeMember('user-1', 'owner'), makeMember('user-2')],
  board = BOARD,
}: {
  lists?: BoardList[];
  cards?: Card[];
  members?: BoardMember[];
  board?: Board;
} = {}): void {
  useBoardStore.setState({
    boardId: board.id,
    currentBoard: board,
    lists,
    cards,
    members,
    activityLogs: [],
    presence: [],
    connectionStatus: 'disconnected',
    isLoading: false,
    error: null,
    actionError: null,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const mockedCards = jest.mocked(cardsService);
const mockedLists = jest.mocked(listsService);
const mockedBoards = jest.mocked(boardsService);
const mockedSupabase = jest.mocked(getSupabaseClient);

function createChannel() {
  return {
    on: () => undefined,
    subscribe: () => undefined,
    unsubscribe: () => Promise.resolve('ok'),
    presenceState: () => ({}),
    track: () => Promise.resolve('ok'),
  };
}

function stubSupabase(): void {
  mockedSupabase.mockReturnValue({
    channel: () => createChannel(),
    removeChannel: () => Promise.resolve('ok'),
  } as unknown as SupabaseClient);
}

function makeSnapshot(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    board: BOARD,
    lists: [makeList('list-1', 0), makeList('list-2', 1)],
    cards: [
      makeCard('card-1', 'list-1', 0),
      makeCard('card-2', 'list-1', 1),
      makeCard('card-3', 'list-2', 0),
    ],
    activityLogs: [],
    members: [makeMember('user-1', 'owner'), makeMember('user-2')],
    ...overrides,
  };
}

describe('boardStore optimistic mutations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    seedState();
  });

  it('inserts a temporary card immediately and reconciles the server row', async () => {
    const pending = deferred<Card>();
    mockedCards.createCard.mockReturnValue(pending.promise);

    const request = useBoardStore.getState().createCard('list-1', 'Write docs');

    const optimistic = useBoardStore.getState().cards;
    expect(optimistic).toHaveLength(4);
    expect(optimistic[3]).toMatchObject({
      title: 'Write docs',
      listId: 'list-1',
      position: 2,
      priority: 'none',
    });
    expect(optimistic[3].id).not.toBe('card-1');

    pending.resolve(makeCard('server-card', 'list-1', 2, { title: 'Write docs' }));
    await expect(request).resolves.toBe(true);

    const cards = useBoardStore.getState().cards;
    expect(cards.map((card) => card.id)).toEqual([
      'card-1',
      'card-3',
      'card-2',
      'server-card',
    ]);
    expect(mockedCards.createCard).toHaveBeenCalledWith('board-1', 'list-1', 'Write docs');
  });

  it('rolls back a failed card creation and exposes the error', async () => {
    mockedCards.createCard.mockRejectedValue(new ServiceError('denied', '42501'));

    const ok = await useBoardStore.getState().createCard('list-1', 'Write docs');

    expect(ok).toBe(false);
    expect(useBoardStore.getState().cards.map((card) => card.id)).toEqual([
      'card-1',
      'card-2',
      'card-3',
    ]);
    expect(useBoardStore.getState().actionError).toBe(
      'You do not have permission to do that.'
    );
  });

  it('adds a temporary list and reconciles the server list', async () => {
    const pending = deferred<BoardList>();
    mockedLists.createList.mockReturnValue(pending.promise);

    const request = useBoardStore.getState().createList('Review');

    expect(useBoardStore.getState().lists).toHaveLength(3);
    expect(useBoardStore.getState().lists[2]).toMatchObject({ title: 'Review', position: 2 });

    pending.resolve(makeList('server-list', 2));
    await expect(request).resolves.toBe(true);

    expect(useBoardStore.getState().lists.map((list) => list.id)).toEqual([
      'list-1',
      'list-2',
      'server-list',
    ]);
  });

  it('moves a card optimistically across lists', async () => {
    const pending = deferred<void>();
    mockedCards.moveCard.mockReturnValue(pending.promise);

    const request = useBoardStore.getState().moveCard('card-1', 'list-2', 1);

    const moved = useBoardStore.getState().cards.find((card) => card.id === 'card-1');
    expect(moved).toMatchObject({ listId: 'list-2', position: 1 });
    expect(
      useBoardStore.getState().cards.find((card) => card.id === 'card-2')
    ).toMatchObject({ listId: 'list-1', position: 0 });

    pending.resolve();
    await request;

    expect(mockedCards.moveCard).toHaveBeenCalledWith('card-1', 'list-2', 1);
  });

  it('restores cards when a move fails', async () => {
    mockedCards.moveCard.mockRejectedValue(new ServiceError('offline'));

    await useBoardStore.getState().moveCard('card-1', 'list-2', 1);

    const restored = useBoardStore.getState().cards.find((card) => card.id === 'card-1');
    expect(restored).toMatchObject({ listId: 'list-1', position: 0 });
    expect(useBoardStore.getState().actionError).toBe('offline');
  });

  it('applies card edits optimistically and keeps the local list', async () => {
    const pending = deferred<Card>();
    mockedCards.updateCard.mockReturnValue(pending.promise);

    const request = useBoardStore
      .getState()
      .updateCard('card-1', { title: 'Renamed', priority: 'high' });

    expect(
      useBoardStore.getState().cards.find((card) => card.id === 'card-1')
    ).toMatchObject({ title: 'Renamed', priority: 'high', listId: 'list-1' });

    pending.resolve(makeCard('card-1', 'list-1', 0, { title: 'Renamed', priority: 'high' }));
    await expect(request).resolves.toEqual({ ok: true });

    expect(mockedCards.updateCard).toHaveBeenCalledWith('card-1', {
      title: 'Renamed',
      priority: 'high',
    });
    expect(useBoardStore.getState().cards.find((card) => card.id === 'card-1')?.title).toBe(
      'Renamed'
    );
  });

  it('rolls back card edits when the save fails', async () => {
    mockedCards.updateCard.mockRejectedValue(new ServiceError('invalid', 'validation_failed'));

    const result = await useBoardStore.getState().updateCard('card-1', { title: 'Renamed' });

    expect(result).toEqual({
      ok: false,
      error: 'Please check the information you entered and try again.',
    });
    expect(useBoardStore.getState().cards.find((card) => card.id === 'card-1')?.title).toBe(
      'Card card-1'
    );
  });

  it('restores a deleted card when the request fails', async () => {
    mockedCards.deleteCard.mockRejectedValue(new ServiceError('denied', '42501'));

    const ok = await useBoardStore.getState().deleteCard('card-2');

    expect(ok).toBe(false);
    expect(useBoardStore.getState().cards.map((card) => card.id)).toEqual([
      'card-1',
      'card-2',
      'card-3',
    ]);
  });

  it('reorders lists optimistically and rolls back on failure', async () => {
    const pending = deferred<void>();
    mockedLists.reorderLists.mockReturnValue(pending.promise);

    const request = useBoardStore.getState().reorderLists(['list-2', 'list-1']);

    expect(useBoardStore.getState().lists.map((list) => [list.id, list.position])).toEqual([
      ['list-2', 0],
      ['list-1', 1],
    ]);

    pending.resolve();
    await expect(request).resolves.toBe(true);

    mockedLists.reorderLists.mockRejectedValue(new ServiceError('denied', '42501'));
    const failed = await useBoardStore.getState().reorderLists(['list-1', 'list-2']);

    expect(failed).toBe(false);
    expect(useBoardStore.getState().lists.map((list) => [list.id, list.position])).toEqual([
      ['list-2', 0],
      ['list-1', 1],
    ]);
  });

  it('updates board settings optimistically and restores them on failure', async () => {
    mockedBoards.updateBoard.mockRejectedValueOnce(new ServiceError('denied', '42501'));

    const ok = await useBoardStore.getState().updateBoard({
      title: 'Renamed board',
      description: '',
      color: 'sage',
    });

    expect(ok).toBe(false);
    expect(useBoardStore.getState().currentBoard).toMatchObject({
      title: 'Product',
      color: 'lavender',
    });
    expect(useBoardStore.getState().actionError).toBe(
      'You do not have permission to do that.'
    );

    mockedBoards.updateBoard.mockResolvedValueOnce();
    await expect(
      useBoardStore.getState().updateBoard({
        title: 'Renamed board',
        description: 'New description',
        color: 'sage',
      })
    ).resolves.toBe(true);
    expect(useBoardStore.getState().currentBoard).toMatchObject({
      title: 'Renamed board',
      description: 'New description',
      color: 'sage',
    });
  });

  it('removes a member optimistically and restores them on failure', async () => {
    mockedBoards.removeBoardMember.mockRejectedValueOnce(new ServiceError('denied', '42501'));

    const ok = await useBoardStore.getState().removeMember('user-2');

    expect(ok).toBe(false);
    expect(useBoardStore.getState().members.map((member) => member.userId)).toEqual([
      'user-1',
      'user-2',
    ]);

    mockedBoards.removeBoardMember.mockResolvedValueOnce(true);
    await expect(useBoardStore.getState().removeMember('user-2')).resolves.toBe(true);
    expect(useBoardStore.getState().members.map((member) => member.userId)).toEqual([
      'user-1',
    ]);
    expect(mockedBoards.removeBoardMember).toHaveBeenCalledWith('board-1', 'user-2');
  });
});

describe('boardStore snapshot loading', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    stubSupabase();
    seedState();
  });

  afterEach(() => {
    useBoardStore.getState().closeBoard();
  });

  it('publishes the fetched board into currentBoard on open', async () => {
    mockedBoards.fetchBoardSnapshot.mockResolvedValue(makeSnapshot());

    await useBoardStore.getState().openBoard('board-1');

    const state = useBoardStore.getState();
    expect(state.boardId).toBe('board-1');
    expect(state.currentBoard).toEqual(BOARD);
    expect(state.lists.map((list) => list.id)).toEqual(['list-1', 'list-2']);
    expect(state.cards).toHaveLength(3);
    expect(state.members).toHaveLength(2);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('surfaces an error and stops loading when the board cannot be fetched', async () => {
    mockedBoards.fetchBoardSnapshot.mockRejectedValue(
      new ServiceError('This board does not exist.', 'not_found')
    );

    await useBoardStore.getState().openBoard('missing-board');

    const state = useBoardStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.currentBoard).toBeNull();
    expect(state.boardId).toBe('missing-board');
    expect(state.error).toBe('That item no longer exists.');
  });

  it('refreshes currentBoard from the latest snapshot', async () => {
    mockedBoards.fetchBoardSnapshot.mockResolvedValueOnce(makeSnapshot());
    await useBoardStore.getState().openBoard('board-1');

    const renamed = { ...BOARD, title: 'Product v2' };
    mockedBoards.fetchBoardSnapshot.mockResolvedValueOnce(
      makeSnapshot({ board: renamed, lists: [], cards: [], members: [] })
    );

    await useBoardStore.getState().refresh();

    const state = useBoardStore.getState();
    expect(state.currentBoard).toEqual(renamed);
    expect(state.lists).toEqual([]);
  });
});
