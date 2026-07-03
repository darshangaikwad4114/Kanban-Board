'use client';

import { create } from 'zustand';
import type { Board, List, Card, ActivityLog, ConnectionStatus, PresenceState } from '@kanban/shared';
import { api } from '../lib/api';
import { connectSocket, getSocket, disconnectSocket, onConnectionStatusChange } from '../lib/socket';
import { ClientEvent, ServerEvent } from '@kanban/shared';

interface BoardState {
  // Board data
  currentBoard: Board | null;
  lists: List[];
  cards: Card[];
  activityLogs: ActivityLog[];

  // Presence
  presence: PresenceState[];

  // Connection
  connectionStatus: ConnectionStatus;

  // Loading
  isLoading: boolean;
  isSocketConnected: boolean;
  error: string | null;

  // Actions
  loadBoard: (boardId: string) => Promise<void>;
  joinBoard: (boardId: string) => void;
  leaveBoard: () => void;
  createList: (title: string, boardId: string) => Promise<void>;
  createCard: (title: string, listId: string, boardId: string) => Promise<void>;
  updateCard: (cardId: string, data: Partial<Card>) => Promise<void>;
  moveCard: (cardId: string, targetListId: string, newPosition: number) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  updateList: (listId: string, data: Partial<List>) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  clearBoard: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  currentBoard: null,
  lists: [],
  cards: [],
  activityLogs: [],
  presence: [],
  connectionStatus: 'disconnected',
  isSocketConnected: false,
  isLoading: false,
  error: null,

  loadBoard: async (boardId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{
        board: Board;
        lists: List[];
        cards: Card[];
        activityLogs: ActivityLog[];
      }>(`/boards/${boardId}`);

      if (res.success && res.data) {
        set({
          currentBoard: res.data.board,
          lists: res.data.lists,
          cards: res.data.cards,
          activityLogs: res.data.activityLogs,
          isLoading: false,
        });
      } else {
        set({ error: res.error?.message || 'Failed to load board', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  joinBoard: (boardId: string) => {
    const socket = connectSocket();
    socket.emit(ClientEvent.JOIN_BOARD, { boardId });

    // Listen for socket events
    socket.on(ServerEvent.CONNECTION_ACK, (data: any) => {
      set({ isSocketConnected: true, connectionStatus: 'connected', presence: data.presence || [] });
    });

    socket.on(ServerEvent.USER_JOINED, (data: any) => {
      set((state) => ({
        presence: [
          ...state.presence.filter((p) => p.userId !== data.userId),
          { userId: data.userId, userName: data.userName, joinedAt: data.timestamp, isActive: true },
        ],
      }));
    });

    socket.on(ServerEvent.USER_LEFT, (data: any) => {
      set((state) => ({
        presence: state.presence.filter((p) => p.userId !== data.userId),
      }));
    });

    socket.on(ServerEvent.CARD_CHANGED, (data: any) => {
      set((state) => ({
        cards: state.cards.map((c) =>
          c._id === data.cardId ? { ...c, ...data.changes, updatedAt: data.updatedAt } : c
        ),
      }));
    });

    socket.on(ServerEvent.CARD_DELETED, (data: any) => {
      set((state) => ({
        cards: state.cards.filter((c) => c._id !== data.cardId),
      }));
    });

    socket.on(ServerEvent.ACTIVITY_LOG, (data: any) => {
      set((state) => ({
        activityLogs: [
          {
            _id: data._id || Date.now().toString(),
            boardId: data.boardId,
            userId: data.userId,
            userName: data.userName,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            details: data.details,
            createdAt: data.timestamp,
          },
          ...state.activityLogs.slice(0, 49),
        ],
      }));
    });

    // Track connection status
    const unsub = onConnectionStatusChange((status) => {
      set({ connectionStatus: status, isSocketConnected: status === 'connected' });
      if (status === 'connected') {
        // Re-join board on reconnect
        const state = get();
        if (state.currentBoard) {
          socket.emit(ClientEvent.JOIN_BOARD, { boardId: state.currentBoard._id });
          // Full re-sync via REST
          get().loadBoard(state.currentBoard._id);
        }
      }
    });

    // Store unsub for cleanup on leave
    (socket as any)._connectionStatusUnsub = unsub;
  },

  leaveBoard: () => {
    const socket = getSocket();
    if (socket) {
      const state = get();
      if (state.currentBoard) {
        socket.emit(ClientEvent.LEAVE_BOARD, { boardId: state.currentBoard._id });
      }
      socket.off(ServerEvent.CARD_CHANGED);
      socket.off(ServerEvent.CARD_DELETED);
      socket.off(ServerEvent.USER_JOINED);
      socket.off(ServerEvent.USER_LEFT);
      socket.off(ServerEvent.CONNECTION_ACK);
      socket.off(ServerEvent.ACTIVITY_LOG);
      if ((socket as any)._connectionStatusUnsub) {
        (socket as any)._connectionStatusUnsub();
      }
    }
    disconnectSocket();
  },

  createList: async (title: string, boardId: string) => {
    try {
      const res = await api.post<List>('/lists', { title, boardId });
      if (res.success && res.data) {
        set((state) => ({ lists: [...state.lists, res.data!] }));
      }
    } catch {
      // ignore
    }
  },

  createCard: async (title: string, listId: string, boardId: string) => {
    try {
      const res = await api.post<Card>('/cards', { title, listId, boardId });
      if (res.success && res.data) {
        set((state) => ({ cards: [...state.cards, res.data!] }));
      }
    } catch {
      // ignore
    }
  },

  updateCard: async (cardId: string, data: Partial<Card>) => {
    try {
      const res = await api.patch<Card>(`/cards/${cardId}`, data);
      if (res.success && res.data) {
        set((state) => ({
          cards: state.cards.map((c) => (c._id === cardId ? { ...c, ...res.data } : c)),
        }));
      }
    } catch {
      // ignore
    }
  },

  moveCard: async (cardId: string, targetListId: string, newPosition: number) => {
    // Optimistic update
    set((state) => ({
      cards: state.cards.map((c) =>
        c._id === cardId ? { ...c, listId: targetListId, position: newPosition } : c
      ),
    }));
    try {
      await api.post(`/cards/${cardId}/move`, { targetListId, newPosition });
    } catch {
      // Revert by re-fetching
      const boardId = get().currentBoard?._id;
      if (boardId) get().loadBoard(boardId);
    }
  },

  deleteCard: async (cardId: string) => {
    try {
      const res = await api.delete(`/cards/${cardId}`);
      if (res.success) {
        set((state) => ({ cards: state.cards.filter((c) => c._id !== cardId) }));
      }
    } catch {
      // ignore
    }
  },

  updateList: async (listId: string, data: Partial<List>) => {
    try {
      const res = await api.patch<List>(`/lists/${listId}`, data);
      if (res.success && res.data) {
        set((state) => ({
          lists: state.lists.map((l) => (l._id === listId ? { ...l, ...res.data } : l)),
        }));
      }
    } catch {
      // ignore
    }
  },

  deleteList: async (listId: string) => {
    try {
      const res = await api.delete(`/lists/${listId}`);
      if (res.success) {
        set((state) => ({
          lists: state.lists.filter((l) => l._id !== listId),
          cards: state.cards.filter((c) => c.listId !== listId),
        }));
      }
    } catch {
      // ignore
    }
  },

  clearBoard: () => {
    set({
      currentBoard: null,
      lists: [],
      cards: [],
      activityLogs: [],
      presence: [],
      isSocketConnected: false,
      connectionStatus: 'disconnected',
      isLoading: false,
      error: null,
    });
  },
}));