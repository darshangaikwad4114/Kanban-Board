export const BOARD_COLORS = ['lavender', 'sage', 'peach', 'sky', 'rose', 'sand'] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

export const CARD_PRIORITIES = ['none', 'low', 'medium', 'high'] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export const CARD_LABELS = ['Bug', 'Feature', 'Design', 'Planning', 'Blog', 'Social', 'Urgent'] as const;
export type CardLabel = (typeof CARD_LABELS)[number];

export type EntityType = 'card' | 'list' | 'board';
export type MemberRole = 'owner' | 'member';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
export type BoardSort = 'updated' | 'created' | 'title';
export type BoardFilter = 'all' | 'owned' | 'shared';
export type DashboardView = 'grid' | 'list';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface BoardStats {
  listCount: number;
  cardCount: number;
  overdueCount: number;
  dueTodayCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  nonePriorityCount: number;
  memberCount: number;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  color: BoardColor;
  templateId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  stats: BoardStats;
}

export interface BoardList {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  position: number;
  assigneeId: string | null;
  priority: CardPriority;
  dueDate: string | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  boardId: string;
  userId: string | null;
  userName: string;
  action: string;
  entityType: EntityType;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface BoardMember {
  boardId: string;
  userId: string;
  role: MemberRole;
  displayName: string;
  joinedAt: string;
}

export interface BoardSnapshot {
  board: Board;
  lists: BoardList[];
  cards: Card[];
  activityLogs: ActivityLog[];
  members: BoardMember[];
}

export interface PresenceUser {
  userId: string;
  userName: string;
  joinedAt: string;
  isActive: boolean;
}

export interface UpcomingCard {
  id: string;
  boardId: string;
  boardTitle: string;
  title: string;
  dueDate: string;
  priority: CardPriority;
}

export interface PortfolioStats {
  boardCount: number;
  listCount: number;
  cardCount: number;
  dueTodayCount: number;
  overdueCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  nonePriorityCount: number;
  collaboratorCount: number;
}

export interface DashboardData {
  boards: Board[];
  stats: PortfolioStats;
  upcoming: UpcomingCard[];
}

export type InviteResult = 'invited' | 'already_member' | 'not_found';

export interface RegisterOutcome {
  success: boolean;
  needsEmailConfirmation: boolean;
  error?: string;
}
