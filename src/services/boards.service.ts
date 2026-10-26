import { ServiceError } from '@/lib/errors';
import {
  mapActivityRow,
  mapBoardRow,
  mapCardRow,
  mapListRow,
  mapMemberRow,
} from '@/services/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getTemplateById } from '@/config/templates';
import {
  boardSchema,
  boardUpdateSchema,
  inviteSchema,
  type BoardInput,
  type BoardUpdateInput,
} from '@/lib/validation';
import type {
  ActivityLogRow,
  BoardMemberRow,
  BoardOverviewRow,
  CardRow,
  ListRow,
} from '@/types/database';
import type { Board, BoardMember, BoardSnapshot, InviteResult } from '@/types/domain';
import { sortCards, sortLists } from '@/lib/reorder';
import { throwOnError, unwrap, unwrapList } from '@/services/postgrest';

const MEMBER_SELECT = 'board_id, user_id, role, created_at, profiles (id, display_name)';

export async function listBoards(): Promise<Board[]> {
  const { data, error } = await getSupabaseClient()
    .from('board_overview')
    .select('*')
    .order('updated_at', { ascending: false });

  return unwrapList<BoardOverviewRow>(data, error).map(mapBoardRow);
}

export async function fetchBoardSnapshot(boardId: string): Promise<BoardSnapshot> {
  const supabase = getSupabaseClient();

  const [boardResult, listsResult, cardsResult, logsResult, membersResult] = await Promise.all([
    supabase.from('board_overview').select('*').eq('id', boardId).maybeSingle(),
    supabase.from('lists').select('*').eq('board_id', boardId).order('position', { ascending: true }),
    supabase.from('cards').select('*').eq('board_id', boardId).order('position', { ascending: true }),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('board_members')
      .select(MEMBER_SELECT)
      .eq('board_id', boardId)
      .order('created_at', { ascending: true }),
  ]);

  throwOnError(boardResult.error);
  if (!boardResult.data) {
    throw new ServiceError(
      'This board does not exist or you no longer have access to it.',
      'not_found'
    );
  }

  return {
    board: mapBoardRow(boardResult.data as BoardOverviewRow),
    lists: sortLists(
      unwrapList<ListRow>(listsResult.data, listsResult.error).map(mapListRow)
    ),
    cards: sortCards(
      unwrapList<CardRow>(cardsResult.data, cardsResult.error).map(mapCardRow)
    ),
    activityLogs: unwrapList<ActivityLogRow>(logsResult.data, logsResult.error).map(
      mapActivityRow
    ),
    members: unwrapList<BoardMemberRow>(membersResult.data, membersResult.error).map(
      mapMemberRow
    ),
  };
}

/** Creates a board and its template content atomically in Postgres. */
export async function createBoard(rawInput: BoardInput): Promise<string> {
  const input = boardSchema.parse(rawInput);
  const template = getTemplateById(input.templateId);
  const templateId = template?.id ?? 'blank';

  const templateLists = (template?.lists ?? []).map((list) => ({
    title: list.title,
    cards: list.cards.map((card) => ({
      title: card.title,
      description: card.description ?? '',
      priority: card.priority ?? 'none',
      label: card.label ?? null,
    })),
  }));

  const { data, error } = await getSupabaseClient().rpc('create_board_from_template', {
    p_title: input.title,
    p_description: input.description,
    p_color: input.color,
    p_template_id: templateId,
    p_lists: templateLists,
  });

  if (error) throw new ServiceError(error.message, error.code || 'rpc_error');
  if (!data) throw new ServiceError('The board could not be created.', 'board_create_failed');
  return data as string;
}

export async function updateBoard(boardId: string, rawInput: BoardUpdateInput): Promise<void> {
  const input = boardUpdateSchema.parse(rawInput);
  const { data, error } = await getSupabaseClient()
    .from('boards')
    .update({
      title: input.title,
      description: input.description,
      color: input.color,
    })
    .eq('id', boardId)
    .select('id')
    .maybeSingle();

  throwOnError(error);
  if (!data) {
    throw new ServiceError('Only the board owner can change board settings.', '42501');
  }
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { data, error } = await getSupabaseClient()
    .from('boards')
    .delete()
    .eq('id', boardId)
    .select('id')
    .maybeSingle();

  throwOnError(error);
  if (!data) {
    throw new ServiceError('Only the board owner can delete this board.', '42501');
  }
}

export async function inviteBoardMember(
  boardId: string,
  rawEmail: string
): Promise<InviteResult> {
  const { email } = inviteSchema.parse({ email: rawEmail });
  const { data, error } = await getSupabaseClient().rpc('invite_board_member', {
    p_board_id: boardId,
    p_email: email,
  });

  if (error) throw new ServiceError(error.message, error.code || 'rpc_error');
  if (data !== 'invited' && data !== 'already_member' && data !== 'not_found') {
    throw new ServiceError('The invitation could not be completed.', 'rpc_error');
  }
  return data;
}

export async function listMembers(boardId: string): Promise<BoardMember[]> {
  const { data, error } = await getSupabaseClient()
    .from('board_members')
    .select(MEMBER_SELECT)
    .eq('board_id', boardId)
    .order('created_at', { ascending: true });

  return unwrapList<BoardMemberRow>(data, error).map(mapMemberRow);
}

/** Returns false when the membership was already gone. */
export async function removeBoardMember(boardId: string, userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();

  throwOnError(error);
  return Boolean(data);
}
