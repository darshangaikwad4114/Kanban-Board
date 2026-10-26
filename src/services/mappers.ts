import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import type {
  ActivityLogRow,
  BoardMemberRow,
  BoardOverviewRow,
  CardRow,
  ListRow,
  ProfileRow,
  UpcomingCardRow,
} from '@/types/database';
import type {
  ActivityLog,
  Board,
  BoardColor,
  BoardList,
  BoardMember,
  Card,
  CardPriority,
  EntityType,
  User,
  UpcomingCard,
} from '@/types/domain';
import { BOARD_COLORS, CARD_PRIORITIES } from '@/types/domain';

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function mapBoardColor(value: string | null | undefined): BoardColor {
  return BOARD_COLORS.includes(value as BoardColor) ? (value as BoardColor) : 'lavender';
}

export function mapPriority(value: string | null | undefined): CardPriority {
  return CARD_PRIORITIES.includes(value as CardPriority) ? (value as CardPriority) : 'none';
}

function mapEntityType(value: string | null | undefined): EntityType {
  return value === 'card' || value === 'list' || value === 'board' ? value : 'board';
}

export function mapBoardRow(row: BoardOverviewRow): Board {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    color: mapBoardColor(row.color),
    templateId: row.template_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stats: {
      listCount: toCount(row.list_count),
      cardCount: toCount(row.card_count),
      overdueCount: toCount(row.overdue_count),
      dueTodayCount: toCount(row.due_today_count),
      highPriorityCount: toCount(row.high_priority_count),
      mediumPriorityCount: toCount(row.medium_priority_count),
      lowPriorityCount: toCount(row.low_priority_count),
      nonePriorityCount: toCount(row.none_priority_count),
      memberCount: toCount(row.member_count),
    },
  };
}

export function mapListRow(row: ListRow): BoardList {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCardRow(row: CardRow): Card {
  return {
    id: row.id,
    boardId: row.board_id,
    listId: row.list_id,
    title: row.title,
    description: row.description ?? '',
    position: row.position,
    assigneeId: row.assignee_id,
    priority: mapPriority(row.priority),
    dueDate: row.due_date ? row.due_date.slice(0, 10) : null,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapActivityRow(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    userName: row.user_name || 'Someone',
    action: row.action,
    entityType: mapEntityType(row.entity_type),
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

function profileFromEmbed(
  profiles: BoardMemberRow['profiles']
): Exclude<BoardMemberRow['profiles'], unknown[]> {
  if (!profiles) return null;
  if (Array.isArray(profiles)) return profiles[0] ?? null;
  return profiles;
}

export function mapMemberRow(row: BoardMemberRow): BoardMember {
  const profile = profileFromEmbed(row.profiles);
  return {
    boardId: row.board_id,
    userId: row.user_id,
    role: row.role === 'owner' ? 'owner' : 'member',
    displayName: profile?.display_name || 'Unknown member',
    joinedAt: row.created_at,
  };
}

export function mapUpcomingCard(row: UpcomingCardRow, boardTitle: string): UpcomingCard {
  return {
    id: row.id,
    boardId: row.board_id,
    boardTitle,
    title: row.title,
    dueDate: row.due_date.slice(0, 10),
    priority: mapPriority(row.priority),
  };
}

export function mapAuthUser(authUser: SupabaseAuthUser, profile: ProfileRow | null): User {
  const email = authUser.email ?? '';
  const metadataName =
    typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : '';
  const fallbackName = email.split('@')[0] || 'Member';

  return {
    id: authUser.id,
    email,
    name: profile?.display_name?.trim() || metadataName || fallbackName,
  };
}
