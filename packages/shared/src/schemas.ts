import { z } from 'zod';

// ============ User Schemas ============
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const userSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============ Board Schemas ============
export const createBoardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  templateId: z.string().optional(),
  color: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
});

export const updateBoardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  memberIds: z.array(z.string()).optional(),
});

export const boardSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  templateId: z.string().optional(),
  ownerId: z.string(),
  memberIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============ List Schemas ============
export const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  boardId: z.string(),
  position: z.number().int().min(0).optional(),
});

export const updateListSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  position: z.number().int().min(0).optional(),
});

export const listSchema = z.object({
  _id: z.string(),
  title: z.string(),
  boardId: z.string(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============ Card Schemas ============
export const cardPrioritySchema = z.enum(['none', 'low', 'medium', 'high']);

export const createCardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  listId: z.string(),
  boardId: z.string(),
  description: z.string().max(5000).optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().optional(),
  priority: cardPrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  label: z.string().max(50).nullable().optional(),
});

export const moveCardSchema = z.object({
  targetListId: z.string().min(1, 'Target list is required'),
  newPosition: z.number().int().min(0, 'Position must be 0 or greater'),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  position: z.number().int().min(0).optional(),
  listId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: cardPrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  label: z.string().max(50).nullable().optional(),
});

export const cardSchema = z.object({
  _id: z.string(),
  title: z.string(),
  listId: z.string(),
  boardId: z.string(),
  description: z.string().default(''),
  position: z.number(),
  assigneeId: z.string().nullable().default(null),
  priority: cardPrioritySchema.default('none'),
  dueDate: z.string().nullable().default(null),
  label: z.string().nullable().default(null),
  updatedAt: z.string(),
  createdAt: z.string(),
});

// ============ Activity Log Schema ============
export const activityLogSchema = z.object({
  _id: z.string(),
  boardId: z.string(),
  userId: z.string(),
  userName: z.string(),
  action: z.string(),
  entityType: z.enum(['card', 'list', 'board']),
  entityId: z.string(),
  details: z.string().optional(),
  createdAt: z.string(),
});

// ============ Auth Response ============
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});

// ============ Pagination ============
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============ Type exports ============
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type CardPriority = z.infer<typeof cardPrioritySchema>;
export type User = z.infer<typeof userSchema>;
export type Board = z.infer<typeof boardSchema>;
export type List = z.infer<typeof listSchema>;
export type Card = z.infer<typeof cardSchema>;
export type ActivityLog = z.infer<typeof activityLogSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
