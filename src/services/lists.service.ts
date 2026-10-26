import { ServiceError } from '@/lib/errors';
import { mapListRow } from '@/lib/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import { listTitleSchema } from '@/lib/validation';
import type { ListRow } from '@/types/database';
import type { BoardList } from '@/types/domain';
import { throwOnError, unwrap } from './helpers';

export async function createList(boardId: string, rawTitle: string): Promise<BoardList> {
  const title = listTitleSchema.parse(rawTitle);
  const supabase = getSupabaseClient();

  const { data: last, error: positionError } = await supabase
    .from('lists')
    .select('position')
    .eq('board_id', boardId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwOnError(positionError);
  const position = (typeof last?.position === 'number' ? last.position : -1) + 1;

  const { data, error } = await supabase
    .from('lists')
    .insert({ board_id: boardId, title, position })
    .select('*')
    .single();

  return mapListRow(
    unwrap<ListRow>(data as ListRow | null, error, 'The list could not be created.')
  );
}

export async function renameList(listId: string, rawTitle: string): Promise<BoardList> {
  const title = listTitleSchema.parse(rawTitle);
  const { data, error } = await getSupabaseClient()
    .from('lists')
    .update({ title })
    .eq('id', listId)
    .select('*')
    .single();

  return mapListRow(
    unwrap<ListRow>(data as ListRow | null, error, 'The list could not be updated.')
  );
}

/** Returns false when the list was already deleted. */
export async function deleteList(listId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('lists')
    .delete()
    .eq('id', listId)
    .select('id')
    .maybeSingle();

  throwOnError(error);
  return Boolean(data);
}

export async function reorderLists(boardId: string, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) {
    throw new ServiceError('There are no lists to reorder.', 'validation_failed');
  }

  const { error } = await getSupabaseClient().rpc('reorder_lists', {
    p_board_id: boardId,
    p_list_ids: orderedIds,
  });

  if (error) throw new ServiceError(error.message, error.code || 'rpc_error');
}
