'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import type { ConnectionStatus } from '@kanban/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let connectionStatusListeners: Array<(status: ConnectionStatus) => void> = [];
let currentStatus: ConnectionStatus = 'disconnected';

const notifyListeners = () => {
  connectionStatusListeners.forEach((fn) => fn(currentStatus));
};

export const getSocket = (): Socket | null => socket;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    timeout: 20000,
  });

  socket.on('connect', () => {
    currentStatus = 'connected';
    notifyListeners();
  });

  socket.on('connect_error', () => {
    currentStatus = 'connecting';
    notifyListeners();
  });

  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      currentStatus = 'disconnected';
    } else {
      currentStatus = 'reconnecting';
    }
    notifyListeners();
  });

  socket.io.on('reconnect_attempt', () => {
    // Update auth token on reconnect
    const token = getAccessToken();
    if (token && socket) {
      socket.auth = { token };
    }
  });

  socket.io.on('reconnect', () => {
    currentStatus = 'connected';
    notifyListeners();
  });

  socket.io.on('reconnect_failed', () => {
    currentStatus = 'disconnected';
    notifyListeners();
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentStatus = 'disconnected';
  notifyListeners();
};

export const onConnectionStatusChange = (listener: (status: ConnectionStatus) => void) => {
  connectionStatusListeners.push(listener);
  // Immediately call with current status
  listener(currentStatus);
  return () => {
    connectionStatusListeners = connectionStatusListeners.filter((l) => l !== listener);
  };
};

export const getConnectionStatus = (): ConnectionStatus => currentStatus;