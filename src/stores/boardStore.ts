'use client';

import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toUserMessage } from '@/lib/errors';
import {
  mapActivityRow,
  mapBoardColor,
  mapCardRow,
  mapListRow,
} from '@/services/mappers';
import { applyListOrder, applyOptimisticMove, sortCards, sortLists } from '@/lib/reorder';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { BoardUpdateInput, CardPatchInput } from '@/lib/validation';
import { useAuthStore } from '@/stores/authStore';
import { logActivity } from '@/services/activity.service';
import {
  fetchBoardSnapshot,
  inviteBoardMember,
  listMembers,
  removeBoardMember,
  updateBoard as updateBoardService,
} from '@/services/boards.service';
import {
  createCard as createCardService,
  deleteCard as deleteCardService,
  moveCard as moveCardService,
  updateCard as updateCardService,
  type CardFields,
} from '@/services/cards.service';
import {
  createList as createListService,
  deleteList as deleteListService,
  renameList as renameListService,
  reorderLists as reorderListsService,
} from '@/services/lists.service';
import type {
  ActivityLogRow,
  BoardMemberRow,
  BoardRow,
  CardRow,
  ListRow,
} from '@/types/database';
import type {
  ActivityLog,
  Board,
  BoardList,
  BoardMember,
  Card,
  ConnectionStatus,
  EntityType,
  InviteResult,
  PresenceUser,
} from '@/types/domain';

interface BoardState {
  boardId: string | null;
  currentBoard: Board | null;
  lists: BoardList[];
  cards: Card[];
  members: BoardMember[];
  activityLogs: ActivityLog[];
  presence: PresenceUser[];
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  actionError: string | null;
  openBoard: (boardId: string) => Promise<void>;
  closeBoard: () => void;
  refresh: () => Promise<void>;
  clearActionError: () => void;
  createList: (title: string) => Promise<boolean>;
  renameList: (listId: string, title: string) => Promise<boolean>;
  deleteList: (listId: string) => Promise<boolean>;
  reorderLists: (orderedIds: string[]) => Promise<boolean>;
  createCard: (listId: string, title: string) => Promise<boolean>;
  updateCard: (
    cardId: string,
    patch: CardPatchInput
  ) => Promise<{ ok: boolean; error?: string }>;
  moveCard: (cardId: string, targetListId: string, newPosition: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<boolean>;
  updateBoard: (input: BoardUpdateInput) => Promise<boolean>;
  inviteMember: (email: string) => Promise<InviteResult | null>;
  removeMember: (userId: string) => Promise<boolean>;
}

interface PresenceMeta {
  user_id?: unknown;
  user_name?: unknown;
  joined_at?: unknown;
}

let channel: RealtimeChannel | null = null;
let activeBoardId: string | null = null;
let hasConnectedOnce = false;
let openToken = 0;

function makeTempId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function replaceById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];
}

function mergeCreated<T extends { id: string }>(items: T[], tempId: string, item: T): T[] {
  const withoutTemp = items.filter((existing) => existing.id !== tempId);
  if (withoutTemp.some((existing) => existing.id === item.id)) {
    return withoutTemp.map((existing) => (existing.id === item.id ? item : existing));
  }
  return [...withoutTemp, item];
}

function teardownChannel(): void {
  const current = channel;
  channel = null;
  hasConnectedOnce = false;
  if (!current) return;

  void current
    .unsubscribe()
    .then(() => {
      try {
        void getSupabaseClient().removeChannel(current);
      } catch {
        // The client can be unavailable while the app is tearing down.
      }
    })
    .catch(() => {});
}

function pickCardFields(patch: CardPatchInput): CardFields {
  const fields: CardFields = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.description !== undefined) fields.description = patch.description;
  if (patch.priority !== undefined) fields.priority = patch.priority;
  if (patch.dueDate !== undefined) fields.dueDate = patch.dueDate;
  if (patch.label !== undefined) fields.label = patch.label;
  if (patch.assigneeId !== undefined) fields.assigneeId = patch.assigneeId;
  return fields;
}

function toLocalFields(fields: CardFields): Partial<Card> {
  const local: Partial<Card> = {};
  if (fields.title !== undefined) local.title = fields.title;
  if (fields.description !== undefined) local.description = fields.description;
  if (fields.priority !== undefined) local.priority = fields.priority;
  if (fields.dueDate !== undefined) local.dueDate = fields.dueDate;
  if (fields.label !== undefined) local.label = fields.label;
  if (fields.assigneeId !== undefined) local.assigneeId = fields.assigneeId;
  return local;
}

export const useBoardStore = create<BoardState>((set, get) => {
  async function recordActivity(
    action: string,
    entityType: EntityType,
    entityId: string | null,
    details: string
  ): Promise<void> {
    const boardId = activeBoardId;
    const user = useAuthStore.getState().user;
    if (!boardId || !user) return;

    try {
      await logActivity({
        boardId,
        userId: user.id,
        userName: user.name,
        action,
        entityType,
        entityId,
        details,
      });
    } catch {
      // Activity logging is best-effort; the mutation already succeeded.
    }
  }

  function fail(error: unknown, fallback: string): string {
    const message = toUserMessage(error, fallback);
    set({ actionError: message });
    return message;
  }

  function syncPresence(current: RealtimeChannel): void {
    if (channel !== current) return;

    const raw = current.presenceState() as Record<string, PresenceMeta[]>;
    const seen = new Set<string>();
    const next: PresenceUser[] = [];

    for (const entries of Object.values(raw)) {
      for (const entry of entries) {
        const userId = typeof entry.user_id === 'string' ? entry.user_id : '';
        if (!userId || seen.has(userId)) continue;
        seen.add(userId);
        next.push({
          userId,
          userName: typeof entry.user_name === 'string' ? entry.user_name : 'Member',
          joinedAt:
            typeof entry.joined_at === 'string'
              ? entry.joined_at
              : new Date().toISOString(),
          isActive: true,
        });
      }
    }

    next.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    set({ presence: next });
  }

  async function refreshMembers(): Promise<void> {
    const boardId = activeBoardId;
    if (!boardId) return;

    try {
      const next = await listMembers(boardId);
      if (activeBoardId !== boardId) return;
      set({ members: next });

      const currentUser = useAuthStore.getState().user;
      if (currentUser && !next.some((member) => member.userId === currentUser.id)) {
        activeBoardId = null;
        set({
          error: 'You no longer have access to this board.',
          connectionStatus: 'disconnected',
        });
        teardownChannel();
      }
    } catch {
      // A transient member refresh failure should not disrupt the board.
    }
  }

  function subscribe(boardId: string): void {
    teardownChannel();

    const supabase = getSupabaseClient();
    const user = useAuthStore.getState().user;
    set({ connectionStatus: 'connecting', presence: [] });

    const current = supabase.channel(`board:${boardId}`, {
      config: { presence: { key: user?.id ?? 'guest' } },
    });

    current.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<CardRow>;
          if (!oldRow.id) return;
          set((state) => ({
            cards: state.cards.filter((card) => card.id !== oldRow.id),
          }));
          return;
        }

        const row = payload.new as CardRow;
        if (!row?.id) return;
        const card = mapCardRow(row);
        set((state) => ({ cards: replaceById(state.cards, card) }));
      }
    );

    current.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<ListRow>;
          if (!oldRow.id) return;
          set((state) => ({
            lists: state.lists.filter((list) => list.id !== oldRow.id),
            cards: state.cards.filter((card) => card.listId !== oldRow.id),
          }));
          return;
        }

        const row = payload.new as ListRow;
        if (!row?.id) return;
        const list = mapListRow(row);
        set((state) => ({ lists: replaceById(state.lists, list) }));
      }
    );

    current.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          if (activeBoardId !== boardId) return;
          activeBoardId = null;
          set({
            currentBoard: null,
            error: 'This board was deleted.',
            connectionStatus: 'disconnected',
          });
          teardownChannel();
          return;
        }

        const row = payload.new as BoardRow;
        if (!row?.id) return;
        set((state) => {
          if (!state.currentBoard || state.currentBoard.id !== row.id) return {};
          return {
            currentBoard: {
              ...state.currentBoard,
              title: row.title,
              description: row.description,
              color: mapBoardColor(row.color),
              templateId: row.template_id,
              updatedAt: row.updated_at,
            },
          };
        });
      }
    );

    current.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` },
      () => {
        void refreshMembers();
      }
    );

    current.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `board_id=eq.${boardId}` },
      (payload) => {
        const row = payload.new as ActivityLogRow;
        if (!row?.id) return;
        const log = mapActivityRow(row);
        set((state) => {
          const next = [log, ...state.activityLogs.filter((item) => item.id !== log.id)];
          next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return { activityLogs: next.slice(0, 50) };
        });
      }
    );

    const handlePresence = () => syncPresence(current);
    current.on('presence', { event: 'sync' }, handlePresence);
    current.on('presence', { event: 'join' }, handlePresence);
    current.on('presence', { event: 'leave' }, handlePresence);

    current.subscribe((status) => {
      if (channel !== current) return;

      if (status === 'SUBSCRIBED') {
        set({ connectionStatus: 'connected' });
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          void current.track({
            user_id: currentUser.id,
            user_name: currentUser.name,
            joined_at: new Date().toISOString(),
            is_active: true,
          });
        }
        if (hasConnectedOnce) void get().refresh();
        hasConnectedOnce = true;
        return;
      }

      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        set({ connectionStatus: hasConnectedOnce ? 'reconnecting' : 'disconnected' });
        return;
      }

      if (status === 'CLOSED') {
        set({ connectionStatus: 'disconnected', presence: [] });
      }
    });

    channel = current;
  }

  return {
    boardId: null,
    currentBoard: null,
    lists: [],
    cards: [],
    members: [],
    activityLogs: [],
    presence: [],
    connectionStatus: 'disconnected',
    isLoading: false,
    error: null,
    actionError: null,

    openBoard: async (boardId) => {
      const token = ++openToken;
      teardownChannel();
      activeBoardId = boardId;
      hasConnectedOnce = false;

      set({
        boardId,
        currentBoard: null,
        lists: [],
        cards: [],
        members: [],
        activityLogs: [],
        presence: [],
        connectionStatus: 'disconnected',
        isLoading: true,
        error: null,
        actionError: null,
      });

      try {
        const { board, ...snapshot } = await fetchBoardSnapshot(boardId);
        if (token !== openToken) return;
        set({ ...snapshot, currentBoard: board, isLoading: false });
        subscribe(boardId);
      } catch (error) {
        if (token !== openToken) return;
        activeBoardId = null;
        set({
          isLoading: false,
          error: toUserMessage(error, 'This board could not be loaded.'),
        });
      }
    },

    closeBoard: () => {
      openToken += 1;
      activeBoardId = null;
      teardownChannel();
      set({
        boardId: null,
        currentBoard: null,
        lists: [],
        cards: [],
        members: [],
        activityLogs: [],
        presence: [],
        connectionStatus: 'disconnected',
        isLoading: false,
        error: null,
        actionError: null,
      });
    },

    refresh: async () => {
      const boardId = activeBoardId;
      if (!boardId) return;

      try {
        const { board, ...snapshot } = await fetchBoardSnapshot(boardId);
        if (activeBoardId !== boardId) return;
        set({ ...snapshot, currentBoard: board, error: null });
      } catch (error) {
        if (activeBoardId !== boardId) return;
        set({ actionError: toUserMessage(error, 'The board could not be refreshed.') });
      }
    },

    clearActionError: () => set({ actionError: null }),

    createList: async (title) => {
      const board = get().currentBoard;
      const trimmed = title.trim();
      if (!board || !trimmed) return false;

      const now = new Date().toISOString();
      const tempId = makeTempId('list');
      const temp: BoardList = {
        id: tempId,
        boardId: board.id,
        title: trimmed,
        position: get().lists.reduce((max, list) => Math.max(max, list.position), -1) + 1,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({ lists: [...state.lists, temp], actionError: null }));

      try {
        const created = await createListService(board.id, trimmed);
        set((state) => ({
          lists: sortLists(mergeCreated(state.lists, tempId, created)),
        }));
        void recordActivity('created list', 'list', created.id, `Added "${created.title}"`);
        return true;
      } catch (error) {
        set((state) => ({ lists: state.lists.filter((list) => list.id !== tempId) }));
        fail(error, 'The list could not be created.');
        return false;
      }
    },

    renameList: async (listId, title) => {
      const existing = get().lists.find((list) => list.id === listId);
      const trimmed = title.trim();
      if (!existing || !trimmed) return false;

      set((state) => ({
        lists: state.lists.map((list) =>
          list.id === listId ? { ...list, title: trimmed } : list
        ),
        actionError: null,
      }));

      try {
        const updated = await renameListService(listId, trimmed);
        set((state) => ({
          lists: sortLists(replaceById(state.lists, updated)),
        }));
        void recordActivity('renamed list', 'list', listId, `Renamed a list to "${updated.title}"`);
        return true;
      } catch (error) {
        set((state) => ({
          lists: state.lists.map((list) => (list.id === listId ? existing : list)),
        }));
        fail(error, 'The list could not be renamed.');
        return false;
      }
    },

    deleteList: async (listId) => {
      const list = get().lists.find((item) => item.id === listId);
      if (!list) return false;

      const previousLists = get().lists;
      const previousCards = get().cards;

      set((state) => ({
        lists: state.lists.filter((item) => item.id !== listId),
        cards: state.cards.filter((card) => card.listId !== listId),
        actionError: null,
      }));

      try {
        await deleteListService(listId);
        void recordActivity('deleted list', 'list', listId, `Deleted "${list.title}"`);
        return true;
      } catch (error) {
        set({ lists: previousLists, cards: previousCards });
        fail(error, 'The list could not be deleted.');
        return false;
      }
    },

    reorderLists: async (orderedIds) => {
      const board = get().currentBoard;
      if (!board) return false;

      const previous = get().lists;
      set({
        lists: sortLists(applyListOrder(previous, orderedIds)),
        actionError: null,
      });

      try {
        await reorderListsService(board.id, orderedIds);
        return true;
      } catch (error) {
        set({ lists: previous });
        fail(error, 'The lists could not be reordered.');
        return false;
      }
    },

    createCard: async (listId, title) => {
      const board = get().currentBoard;
      const trimmed = title.trim();
      if (!board || !trimmed) return false;

      const now = new Date().toISOString();
      const tempId = makeTempId('card');
      const temp: Card = {
        id: tempId,
        boardId: board.id,
        listId,
        title: trimmed,
        description: '',
        position:
          get()
            .cards.filter((card) => card.listId === listId)
            .reduce((max, card) => Math.max(max, card.position), -1) + 1,
        assigneeId: null,
        priority: 'none',
        dueDate: null,
        label: null,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({ cards: [...state.cards, temp], actionError: null }));

      try {
        const created = await createCardService(board.id, listId, trimmed);
        set((state) => ({
          cards: sortCards(mergeCreated(state.cards, tempId, created)),
        }));
        void recordActivity('created card', 'card', created.id, `Added "${created.title}"`);
        return true;
      } catch (error) {
        set((state) => ({ cards: state.cards.filter((card) => card.id !== tempId) }));
        fail(error, 'The card could not be created.');
        return false;
      }
    },

    updateCard: async (cardId, patch) => {
      const board = get().currentBoard;
      const existing = get().cards.find((card) => card.id === cardId);
      if (!board || !existing) {
        return { ok: false, error: 'That card no longer exists.' };
      }

      const previousCards = get().cards;
      const fields = pickCardFields(patch);
      const hasFieldChanges = Object.keys(fields).length > 0;
      const targetListId = patch.listId;
      const listChanged = Boolean(targetListId && targetListId !== existing.listId);
      const now = new Date().toISOString();

      let optimistic = previousCards;
      if (listChanged && targetListId) {
        const targetPosition = previousCards.filter(
          (card) => card.listId === targetListId && card.id !== cardId
        ).length;
        optimistic = applyOptimisticMove(optimistic, cardId, targetListId, targetPosition);
      }
      optimistic = optimistic.map((card) =>
        card.id === cardId
          ? { ...card, ...toLocalFields(fields), updatedAt: now }
          : card
      );

      set({ cards: optimistic, actionError: null });

      try {
        let updated: Card | null = null;
        if (hasFieldChanges) {
          updated = await updateCardService(cardId, fields);
        }

        if (listChanged && targetListId) {
          const targetPosition = previousCards.filter(
            (card) => card.listId === targetListId && card.id !== cardId
          ).length;
          await moveCardService(cardId, targetListId, targetPosition);
        }

        if (updated) {
          set((state) => ({
            cards: state.cards.map((card) =>
              card.id === cardId
                ? { ...card, ...updated, listId: card.listId, position: card.position }
                : card
            ),
          }));
          void recordActivity(
            'updated card',
            'card',
            cardId,
            `Updated "${updated.title}"`
          );
        }

        return { ok: true };
      } catch (error) {
        set({ cards: previousCards });
        const message = fail(error, 'The card could not be saved.');
        return { ok: false, error: message };
      }
    },

    moveCard: async (cardId, targetListId, newPosition) => {
      const card = get().cards.find((item) => item.id === cardId);
      if (!card) return;

      const previous = get().cards;
      set({
        cards: applyOptimisticMove(previous, cardId, targetListId, newPosition),
        actionError: null,
      });

      try {
        await moveCardService(cardId, targetListId, newPosition);
      } catch (error) {
        set({ cards: previous });
        fail(error, 'The card could not be moved.');
      }
    },

    deleteCard: async (cardId) => {
      const card = get().cards.find((item) => item.id === cardId);
      if (!card) return false;

      const previous = get().cards;
      set((state) => ({
        cards: state.cards.filter((item) => item.id !== cardId),
        actionError: null,
      }));

      try {
        await deleteCardService(cardId);
        void recordActivity('deleted card', 'card', cardId, `Deleted "${card.title}"`);
        return true;
      } catch (error) {
        set({ cards: previous });
        fail(error, 'The card could not be deleted.');
        return false;
      }
    },

    updateBoard: async (input) => {
      const board = get().currentBoard;
      if (!board) return false;

      const previous = board;
      set({
        currentBoard: {
          ...board,
          title: input.title,
          description: input.description,
          color: input.color,
          updatedAt: new Date().toISOString(),
        },
        actionError: null,
      });

      try {
        await updateBoardService(board.id, input);
        void recordActivity('updated board', 'board', board.id, 'Updated board settings');
        return true;
      } catch (error) {
        set({ currentBoard: previous });
        fail(error, 'The board could not be updated.');
        return false;
      }
    },

    inviteMember: async (email) => {
      const board = get().currentBoard;
      if (!board) return null;

      try {
        const result = await inviteBoardMember(board.id, email);
        if (result === 'invited') {
          await refreshMembers();
        }
        return result;
      } catch (error) {
        fail(error, 'The invitation could not be sent.');
        return null;
      }
    },

    removeMember: async (userId) => {
      const board = get().currentBoard;
      const member = get().members.find((item) => item.userId === userId);
      if (!board || !member) return false;

      const previous = get().members;
      set((state) => ({
        members: state.members.filter((item) => item.userId !== userId),
        actionError: null,
      }));

      try {
        await removeBoardMember(board.id, userId);
        void recordActivity(
          'removed member',
          'board',
          board.id,
          `Removed ${member.displayName}`
        );
        return true;
      } catch (error) {
        set({ members: previous });
        fail(error, 'The member could not be removed.');
        return false;
      }
    },
  };
});
