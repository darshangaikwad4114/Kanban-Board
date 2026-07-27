import type { Socket } from 'socket.io-client';
import { useBoardStore } from '@/store/boardStore';
import { api } from '@/lib/api';
import { connectSocket, onConnectionStatusChange } from '@/lib/socket';
import { ServerEvent } from '@kanban/shared';
import type {
  Board,
  List,
  Card,
  ActivityLog,
  CardChangedPayload,
  CardDeletedPayload,
  ListChangedPayload,
  ListDeletedPayload,
  BoardUpdatedPayload,
} from '@kanban/shared';

jest.mock('@/lib/api');
jest.mock('@/lib/socket');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedConnectSocket = connectSocket as jest.MockedFunction<typeof connectSocket>;
const mockedOnConnectionStatusChange = onConnectionStatusChange as jest.MockedFunction<
  typeof onConnectionStatusChange
>;

function makeBoard(id: string): Board {
  return {
    _id: id,
    title: 'Test Board',
    description: '',
    color: 'lavender',
    ownerId: 'user-1',
    memberIds: ['user-1'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function makeList(id: string, boardId: string, position: number): List {
  return {
    _id: id,
    title: `List ${id}`,
    boardId,
    position,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

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

function makeActivityLog(id: string, boardId: string): ActivityLog {
  return {
    _id: id,
    boardId,
    userId: 'user-1',
    userName: 'Ada',
    action: 'created card',
    entityType: 'card',
    entityId: 'card-1',
    createdAt: '2024-01-01T00:00:00.000Z',
  };
}

interface FakeSocket {
  on: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
}

function getHandler<T>(mockOn: jest.Mock, event: string): (payload: T) => void {
  const call = mockOn.mock.calls.find(([eventName]) => eventName === event);
  if (!call) throw new Error(`No handler registered for event "${event}"`);
  return call[1];
}

const resetStoreState = () => {
  useBoardStore.setState({
    currentBoard: null,
    lists: [],
    cards: [],
    activityLogs: [],
    presence: [],
    connectionStatus: 'disconnected',
    isSocketConnected: false,
    isLoading: false,
    error: null,
  });
};

describe('boardStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStoreState();
  });

  describe('loadBoard', () => {
    it('populates board data on success', async () => {
      const board = makeBoard('board-1');
      const lists = [makeList('list-1', 'board-1', 0)];
      const cards = [makeCard('card-1', 'list-1', 0)];
      const activityLogs = [makeActivityLog('log-1', 'board-1')];
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: { board, lists, cards, activityLogs },
      });

      await useBoardStore.getState().loadBoard('board-1');

      const state = useBoardStore.getState();
      expect(state.currentBoard).toEqual(board);
      expect(state.lists).toEqual(lists);
      expect(state.cards).toEqual(cards);
      expect(state.activityLogs).toEqual(activityLogs);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets an error when the API call fails', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: false,
        error: { message: 'Board not found', code: 'NOT_FOUND', status: 404 },
      });

      await useBoardStore.getState().loadBoard('missing-board');

      const state = useBoardStore.getState();
      expect(state.error).toBe('Board not found');
      expect(state.isLoading).toBe(false);
      expect(state.currentBoard).toBeNull();
    });
  });

  describe('createCard', () => {
    it('appends the created card from the API response', async () => {
      const newCard = makeCard('card-2', 'list-1', 1);
      mockedApi.post.mockResolvedValueOnce({ success: true, data: newCard });

      await useBoardStore.getState().createCard('Card card-2', 'list-1', 'board-1');

      expect(useBoardStore.getState().cards).toEqual([newCard]);
    });
  });

  describe('createList', () => {
    it('appends the created list from the API response', async () => {
      const newList = makeList('list-2', 'board-1', 1);
      mockedApi.post.mockResolvedValueOnce({ success: true, data: newList });

      await useBoardStore.getState().createList('List list-2', 'board-1');

      expect(useBoardStore.getState().lists).toEqual([newList]);
    });
  });

  describe('updateCard', () => {
    it('merges the updated fields into the matching card', async () => {
      const card = makeCard('card-1', 'list-1', 0);
      useBoardStore.setState({ cards: [card] });
      mockedApi.patch.mockResolvedValueOnce({ success: true, data: { title: 'Updated title' } as Card });

      await useBoardStore.getState().updateCard('card-1', { title: 'Updated title' });

      const updated = useBoardStore.getState().cards.find((c) => c._id === 'card-1');
      expect(updated?.title).toBe('Updated title');
    });
  });

  describe('updateList', () => {
    it('merges the updated fields into the matching list', async () => {
      const list = makeList('list-1', 'board-1', 0);
      useBoardStore.setState({ lists: [list] });
      mockedApi.patch.mockResolvedValueOnce({ success: true, data: { title: 'Renamed' } as List });

      await useBoardStore.getState().updateList('list-1', { title: 'Renamed' });

      const updated = useBoardStore.getState().lists.find((l) => l._id === 'list-1');
      expect(updated?.title).toBe('Renamed');
    });
  });

  describe('deleteCard', () => {
    it('removes the card on a successful response', async () => {
      const card = makeCard('card-1', 'list-1', 0);
      useBoardStore.setState({ cards: [card] });
      mockedApi.delete.mockResolvedValueOnce({ success: true });

      await useBoardStore.getState().deleteCard('card-1');

      expect(useBoardStore.getState().cards).toEqual([]);
    });
  });

  describe('deleteList', () => {
    it('removes the list and its cards on a successful response', async () => {
      const list = makeList('list-1', 'board-1', 0);
      const cardInList = makeCard('card-1', 'list-1', 0);
      const cardInOtherList = makeCard('card-2', 'list-2', 0);
      useBoardStore.setState({ lists: [list], cards: [cardInList, cardInOtherList] });
      mockedApi.delete.mockResolvedValueOnce({ success: true });

      await useBoardStore.getState().deleteList('list-1');

      const state = useBoardStore.getState();
      expect(state.lists).toEqual([]);
      expect(state.cards).toEqual([cardInOtherList]);
    });
  });

  describe('moveCard', () => {
    it('optimistically updates listId/position before the API call resolves', async () => {
      const card = makeCard('card-1', 'list-1', 0);
      useBoardStore.setState({ cards: [card] });

      let resolvePost: (value: { success: boolean }) => void = () => {};
      mockedApi.post.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePost = resolve;
        })
      );

      const pending = useBoardStore.getState().moveCard('card-1', 'list-2', 3);

      const moved = useBoardStore.getState().cards.find((c) => c._id === 'card-1');
      expect(moved?.listId).toBe('list-2');
      expect(moved?.position).toBe(3);

      resolvePost({ success: true });
      await pending;
    });
  });

  describe('joinBoard socket event handling', () => {
    let fakeSocket: FakeSocket;

    beforeEach(() => {
      fakeSocket = { on: jest.fn(), off: jest.fn(), emit: jest.fn() };
      mockedConnectSocket.mockReturnValue(fakeSocket as unknown as Socket);
      mockedOnConnectionStatusChange.mockReturnValue(jest.fn());
      useBoardStore.getState().joinBoard('board-1');
    });

    it('emits JOIN_BOARD on the socket', () => {
      expect(fakeSocket.emit).toHaveBeenCalledWith('board:join', { boardId: 'board-1' });
    });

    it('updates a card on CARD_CHANGED', () => {
      const card = makeCard('card-1', 'list-1', 0);
      useBoardStore.setState({ cards: [card] });
      const handler = getHandler<CardChangedPayload>(fakeSocket.on, ServerEvent.CARD_CHANGED);

      handler({
        cardId: 'card-1',
        boardId: 'board-1',
        listId: 'list-1',
        changes: { title: 'Changed via socket' },
        updatedAt: '2024-02-01T00:00:00.000Z',
        updatedBy: 'user-2',
      });

      const updated = useBoardStore.getState().cards.find((c) => c._id === 'card-1');
      expect(updated?.title).toBe('Changed via socket');
      expect(updated?.updatedAt).toBe('2024-02-01T00:00:00.000Z');
    });

    it('removes a card on CARD_DELETED', () => {
      const card = makeCard('card-1', 'list-1', 0);
      useBoardStore.setState({ cards: [card] });
      const handler = getHandler<CardDeletedPayload>(fakeSocket.on, ServerEvent.CARD_DELETED);

      handler({ cardId: 'card-1', boardId: 'board-1', listId: 'list-1' });

      expect(useBoardStore.getState().cards).toEqual([]);
    });

    it('updates a list on LIST_CHANGED', () => {
      const list = makeList('list-1', 'board-1', 0);
      useBoardStore.setState({ lists: [list] });
      const handler = getHandler<ListChangedPayload>(fakeSocket.on, ServerEvent.LIST_CHANGED);

      handler({ listId: 'list-1', boardId: 'board-1', changes: { title: 'Renamed via socket' } });

      const updated = useBoardStore.getState().lists.find((l) => l._id === 'list-1');
      expect(updated?.title).toBe('Renamed via socket');
    });

    it('removes a list and its cards on LIST_DELETED', () => {
      const list = makeList('list-1', 'board-1', 0);
      const cardInList = makeCard('card-1', 'list-1', 0);
      const cardInOtherList = makeCard('card-2', 'list-2', 0);
      useBoardStore.setState({ lists: [list], cards: [cardInList, cardInOtherList] });
      const handler = getHandler<ListDeletedPayload>(fakeSocket.on, ServerEvent.LIST_DELETED);

      handler({ listId: 'list-1', boardId: 'board-1' });

      const state = useBoardStore.getState();
      expect(state.lists).toEqual([]);
      expect(state.cards).toEqual([cardInOtherList]);
    });

    it('merges changes into currentBoard on BOARD_UPDATED', () => {
      const board = makeBoard('board-1');
      useBoardStore.setState({ currentBoard: board });
      const handler = getHandler<BoardUpdatedPayload>(fakeSocket.on, ServerEvent.BOARD_UPDATED);

      handler({ boardId: 'board-1', changes: { title: 'New board title' } });

      expect(useBoardStore.getState().currentBoard?.title).toBe('New board title');
    });
  });
});
