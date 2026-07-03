// Socket.io event names and payload types
// These must match exactly between client and server

// Client -> Server events
export enum ClientEvent {
  JOIN_BOARD = 'board:join',
  LEAVE_BOARD = 'board:leave',
  CARD_MOVE = 'card:move',
  CARD_UPDATE = 'card:update',
  USER_TYPING = 'user:typing',
}

// Server -> Client events
export enum ServerEvent {
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  CARD_CHANGED = 'card:changed',
  CARD_DELETED = 'card:deleted',
  LIST_CHANGED = 'list:changed',
  BOARD_UPDATED = 'board:updated',
  ACTIVITY_LOG = 'activity:log',
  USER_TYPING = 'user:typing',
  CONNECTION_ACK = 'connection:ack',
  ERROR = 'error',
}

// ============ Event Payloads ============

export interface UserJoinedPayload {
  userId: string;
  userName: string;
  boardId: string;
  timestamp: string;
}

export interface UserLeftPayload {
  userId: string;
  userName: string;
  boardId: string;
  timestamp: string;
}

export interface CardChangedPayload {
  cardId: string;
  boardId: string;
  listId: string;
  changes: {
    title?: string;
    description?: string;
    position?: number;
    listId?: string;
    assigneeId?: string | null;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface CardDeletedPayload {
  cardId: string;
  boardId: string;
  listId: string;
}

export interface ListChangedPayload {
  listId: string;
  boardId: string;
  changes: {
    title?: string;
    position?: number;
  };
}

export interface BoardUpdatedPayload {
  boardId: string;
  changes: {
    title?: string;
    memberIds?: string[];
  };
}

export interface ActivityLogPayload {
  boardId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'card' | 'list' | 'board';
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface UserTypingPayload {
  boardId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ConnectionAckPayload {
  userId: string;
  boardId: string;
  connectedAt: string;
}

export interface ServerErrorPayload {
  message: string;
  code: string;
}

// ============ Client request payloads ============

export interface JoinBoardPayload {
  boardId: string;
}

export interface LeaveBoardPayload {
  boardId: string;
}

export interface CardMovePayload {
  cardId: string;
  sourceListId: string;
  targetListId: string;
  newPosition: number;
}

// ============ Presence tracking ============

export interface PresenceState {
  userId: string;
  userName: string;
  joinedAt: string;
  isActive: boolean;
}