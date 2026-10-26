import { mapActivityRow } from '@/services/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ActivityLogRow } from '@/types/database';
import type { ActivityLog, EntityType } from '@/types/domain';
import { throwOnError, unwrapList } from '@/services/postgrest';

export async function listActivity(boardId: string, limit = 50): Promise<ActivityLog[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const { data, error } = await getSupabaseClient()
    .from('activity_logs')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  return unwrapList<ActivityLogRow>(data, error).map(mapActivityRow);
}

export interface ActivityEntry {
  boardId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: EntityType;
  entityId?: string | null;
  details?: string | null;
}

/**
 * Activity is presentation-only. RLS only accepts entries for boards the
 * caller belongs to and for the caller's own user id.
 */
export async function logActivity(entry: ActivityEntry): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('activity_logs')
    .insert({
      board_id: entry.boardId,
      user_id: entry.userId,
      user_name: entry.userName.slice(0, 100),
      action: entry.action.slice(0, 200),
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      details: entry.details?.slice(0, 500) ?? null,
    });

  throwOnError(error);
}
