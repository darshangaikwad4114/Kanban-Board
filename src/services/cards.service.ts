import { ServiceError } from '@/lib/errors';
import { mapCardRow } from '@/lib/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cardPatchSchema, cardTitleSchema, type CardPatchInput } from '@/lib/validation';
import type { CardRow } from '@/types/database';
import type { Card } from '@/types/domain';
import { throwOnError, unwrap } from './helpers';

export type CardFields = Omit<CardPatchInput, 'listId'>;

export async function createCard(
  boardId: string,
  listId: string,
  rawTitle: string
): Promise<Card> {
  const title = cardTitleSchema.parse(rawTitle);
  const supabase = getSupabaseClient();

  const { data: last, error: positionError } = await supabase
    .from('cards')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwOnError(positionError);
  const position = (typeof last?.position === 'number' ? last.position : -1) + 1;

  const { data, error } = await supabase
    .from('cards')
    .insert({
      board_id: boardId,
      list_id: listId,
      title,
      position,
    })
    .select('*')
    .single();

  return mapCardRow(
    unwrap<CardRow>(data as CardRow | null, error, 'The card could not be created.')
  );
}

export async function updateCard(cardId: string, patch: CardFields): Promise<Card> {
  const parsed = cardPatchSchema.parse(patch);

  const dbPatch: Record<string, unknown> = {};
  if (parsed.title !== undefined) dbPatch.title = parsed.title;
  if (parsed.description !== undefined) dbPatch.description = parsed.description;
  if (parsed.priority !== undefined) dbPatch.priority = parsed.priority;
  if (parsed.dueDate !== undefined) dbPatch.due_date = parsed.dueDate;
  if (parsed.label !== undefined) dbPatch.label = parsed.label;
  if (parsed.assigneeId !== undefined) dbPatch.assignee_id = parsed.assigneeId;

  if (Object.keys(dbPatch).length === 0) {
    throw new ServiceError('There is nothing to update.', 'validation_failed');
  }

  const { data, error } = await getSupabaseClient()
    .from('cards')
    .update(dbPatch)
    .eq('id', cardId)
    .select('*')
    .single();

  return mapCardRow(
    unwrap<CardRow>(data as CardRow | null, error, 'The card could not be updated.')
  );
}

/** Uses the atomic move_card RPC so positions stay contiguous in both lists. */
export async function moveCard(
  cardId: string,
  targetListId: string,
  newPosition: number
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('move_card', {
    p_card_id: cardId,
    p_target_list_id: targetListId,
    p_new_position: newPosition,
  });

  if (error) throw new ServiceError(error.message, error.code || 'rpc_error');
}

/** Returns false when the card was already deleted. */
export async function deleteCard(cardId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('cards')
    .delete()
    .eq('id', cardId)
    .select('id')
    .maybeSingle();

  throwOnError(error);
  return Boolean(data);
}
