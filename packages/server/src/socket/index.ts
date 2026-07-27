import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenPayload, ClientEvent, ServerEvent } from '@kanban/shared';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

// Track presence per board with debounced leave
interface PresenceEntry {
  userName: string;
  joinedAt: string;
  isActive: boolean;
  leaveTimeout?: NodeJS.Timeout;
}
const boardPresence = new Map<string, Map<string, PresenceEntry>>();

let ioInstance: Server | undefined;

// Accessor used by controllers to broadcast changes without creating a
// circular import with index.ts (which wires up routes -> controllers).
export const getIO = (): Server | undefined => ioInstance;

export const setupSocket = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as TokenPayload;
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    socket.on(ClientEvent.JOIN_BOARD, ({ boardId }: { boardId: string }) => {
      if (!socket.userId) return;

      const room = `board:${boardId}`;
      socket.join(room);

      // Cancel any pending leave for this user on this board
      const boardUsers = boardPresence.get(boardId);
      if (boardUsers) {
        const existing = boardUsers.get(socket.userId);
        if (existing?.leaveTimeout) {
          clearTimeout(existing.leaveTimeout);
          existing.leaveTimeout = undefined;
          existing.isActive = true;
          return;
        }
      }

      // Add to presence
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId)!.set(socket.userId, {
        userName: socket.userEmail || 'Unknown',
        joinedAt: new Date().toISOString(),
        isActive: true,
      });

      // Broadcast to room
      io.to(room).emit(ServerEvent.USER_JOINED, {
        userId: socket.userId,
        userName: socket.userEmail || 'Unknown',
        boardId,
        timestamp: new Date().toISOString(),
      });

      // Send current presence state to the joining user
      const currentUsers = Array.from(boardPresence.get(boardId)!.entries()).map(([id, data]) => ({
        userId: id,
        userName: data.userName,
        joinedAt: data.joinedAt,
        isActive: true,
      }));
      socket.emit(ServerEvent.CONNECTION_ACK, {
        userId: socket.userId,
        boardId,
        connectedAt: new Date().toISOString(),
        presence: currentUsers,
      });
    });

    socket.on(ClientEvent.LEAVE_BOARD, ({ boardId }: { boardId: string }) => {
      handleLeaveBoard(io, socket, boardId);
    });

    socket.on('disconnect', () => {
      // Handle leave for all boards the socket was in
      for (const [boardId, users] of boardPresence.entries()) {
        if (socket.userId && users.has(socket.userId)) {
          handleLeaveBoard(io, socket, boardId);
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
};

function handleLeaveBoard(io: Server, socket: AuthenticatedSocket, boardId: string) {
  if (!socket.userId) return;

  const room = `board:${boardId}`;
  const boardUsers = boardPresence.get(boardId);
  if (!boardUsers) return;

  const userData = boardUsers.get(socket.userId);
  if (!userData) return;

  // Debounce leave by 3 seconds to avoid flicker on network blips
  if (userData.leaveTimeout) {
    clearTimeout(userData.leaveTimeout);
  }

  userData.leaveTimeout = setTimeout(() => {
    boardUsers.delete(socket.userId!);
    if (boardUsers.size === 0) {
      boardPresence.delete(boardId);
    }

    io.to(room).emit(ServerEvent.USER_LEFT, {
      userId: socket.userId,
      userName: socket.userEmail || 'Unknown',
      boardId,
      timestamp: new Date().toISOString(),
    });
  }, 3000);

  socket.leave(room);
}

// Helper to broadcast card changes to a board room
export const broadcastCardChange = (
  io: Server,
  boardId: string,
  payload: {
    cardId: string;
    listId: string;
    changes: Record<string, any>;
    updatedAt: string;
    updatedBy: string;
  }
) => {
  io.to(`board:${boardId}`).emit(ServerEvent.CARD_CHANGED, {
    ...payload,
    boardId,
  });
};

// Helper to broadcast activity log
export const broadcastActivity = (
  io: Server,
  boardId: string,
  payload: {
    userId: string;
    userName: string;
    action: string;
    entityType: 'card' | 'list' | 'board';
    entityId: string;
    details?: string;
  }
) => {
  io.to(`board:${boardId}`).emit(ServerEvent.ACTIVITY_LOG, {
    ...payload,
    boardId,
    timestamp: new Date().toISOString(),
  });
};
