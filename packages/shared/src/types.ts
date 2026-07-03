// Additional types not covered by Zod schemas

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, string[]>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Connection status for UI
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';