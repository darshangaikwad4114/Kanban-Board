import { mapBoardRow, mapUpcomingCard } from '@/services/mappers';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toDateOnly } from '@/lib/dates';
import type { BoardOverviewRow, MemberIdRow, UpcomingCardRow } from '@/types/database';
import type { DashboardData, PortfolioStats } from '@/types/domain';
import { throwOnError, unwrapList } from '@/services/postgrest';

const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = getSupabaseClient();
  const today = toDateOnly(new Date());

  const [boardsResult, upcomingResult, membersResult] = await Promise.all([
    supabase.from('board_overview').select('*').order('updated_at', { ascending: false }),
    supabase
      .from('cards')
      .select('id, board_id, title, due_date, priority')
      .not('due_date', 'is', null)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(50),
    supabase.from('board_members').select('user_id'),
  ]);

  throwOnError(boardsResult.error);
  throwOnError(upcomingResult.error);
  throwOnError(membersResult.error);

  const boards = unwrapList<BoardOverviewRow>(boardsResult.data, null).map(mapBoardRow);
  const boardTitles = new Map(boards.map((board) => [board.id, board.title]));

  const upcoming = unwrapList<UpcomingCardRow>(upcomingResult.data, null)
    .filter((row) => boardTitles.has(row.board_id) && row.due_date)
    .map((row) => mapUpcomingCard(row, boardTitles.get(row.board_id) ?? 'Board'))
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0)
    )
    .slice(0, 8);

  const members = unwrapList<MemberIdRow>(membersResult.data, null);

  const stats: PortfolioStats = {
    boardCount: boards.length,
    listCount: boards.reduce((total, board) => total + board.stats.listCount, 0),
    cardCount: boards.reduce((total, board) => total + board.stats.cardCount, 0),
    dueTodayCount: boards.reduce((total, board) => total + board.stats.dueTodayCount, 0),
    overdueCount: boards.reduce((total, board) => total + board.stats.overdueCount, 0),
    highPriorityCount: boards.reduce(
      (total, board) => total + board.stats.highPriorityCount,
      0
    ),
    mediumPriorityCount: boards.reduce(
      (total, board) => total + board.stats.mediumPriorityCount,
      0
    ),
    lowPriorityCount: boards.reduce(
      (total, board) => total + board.stats.lowPriorityCount,
      0
    ),
    nonePriorityCount: boards.reduce(
      (total, board) => total + board.stats.nonePriorityCount,
      0
    ),
    collaboratorCount: new Set(members.map((member) => member.user_id)).size,
  };

  return { boards, stats, upcoming };
}
