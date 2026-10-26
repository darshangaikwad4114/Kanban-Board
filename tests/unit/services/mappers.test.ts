import {
  mapActivityRow,
  mapAuthUser,
  mapBoardColor,
  mapBoardRow,
  mapCardRow,
  mapMemberRow,
  mapPriority,
  mapUpcomingCard,
} from '@/services/mappers';
import type { BoardOverviewRow, CardRow } from '@/types/database';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

function makeBoardRow(overrides: Partial<BoardOverviewRow> = {}): BoardOverviewRow {
  return {
    id: 'board-1',
    title: 'Product',
    description: 'Launch plan',
    color: 'sage',
    template_id: 'basic-kanban',
    owner_id: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    list_count: 3,
    card_count: 12,
    overdue_count: 1,
    due_today_count: 2,
    high_priority_count: 4,
    medium_priority_count: 3,
    low_priority_count: 2,
    none_priority_count: 3,
    member_count: 2,
    ...overrides,
  };
}

function makeCardRow(overrides: Partial<CardRow> = {}): CardRow {
  return {
    id: 'card-1',
    board_id: 'board-1',
    list_id: 'list-1',
    title: 'Draft brief',
    description: null as unknown as string,
    position: 0,
    assignee_id: null,
    priority: 'high',
    due_date: '2026-11-03T12:00:00+00:00',
    label: 'Planning',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mapBoardColor / mapPriority', () => {
  it('falls back to defaults for unknown database values', () => {
    expect(mapBoardColor('neon')).toBe('lavender');
    expect(mapBoardColor(null)).toBe('lavender');
    expect(mapPriority('critical')).toBe('none');
    expect(mapPriority(undefined)).toBe('none');
  });

  it('keeps recognised values', () => {
    expect(mapBoardColor('peach')).toBe('peach');
    expect(mapPriority('medium')).toBe('medium');
  });
});

describe('mapBoardRow', () => {
  it('maps every portfolio stat including the new priority buckets', () => {
    const board = mapBoardRow(makeBoardRow());

    expect(board).toMatchObject({
      id: 'board-1',
      title: 'Product',
      description: 'Launch plan',
      color: 'sage',
      templateId: 'basic-kanban',
      ownerId: 'user-1',
    });
    expect(board.stats).toEqual({
      listCount: 3,
      cardCount: 12,
      overdueCount: 1,
      dueTodayCount: 2,
      highPriorityCount: 4,
      mediumPriorityCount: 3,
      lowPriorityCount: 2,
      nonePriorityCount: 3,
      memberCount: 2,
    });
  });

  it('normalises negative or non-numeric counts to zero', () => {
    const board = mapBoardRow(
      makeBoardRow({
        card_count: -5,
        list_count: Number.NaN as unknown as number,
        high_priority_count: '2' as unknown as number,
      })
    );

    expect(board.stats.cardCount).toBe(0);
    expect(board.stats.listCount).toBe(0);
    expect(board.stats.highPriorityCount).toBe(2);
  });

  it('defaults a missing description to an empty string', () => {
    const board = mapBoardRow(makeBoardRow({ description: null as unknown as string }));
    expect(board.description).toBe('');
  });
});

describe('mapCardRow', () => {
  it('normalises due dates to YYYY-MM-DD and defaults a missing description', () => {
    const card = mapCardRow(makeCardRow());

    expect(card.dueDate).toBe('2026-11-03');
    expect(card.description).toBe('');
    expect(card.priority).toBe('high');
    expect(card.assigneeId).toBeNull();
  });

  it('keeps null due dates and unknown priorities safe', () => {
    const card = mapCardRow(makeCardRow({ due_date: null, priority: 'unknown' }));

    expect(card.dueDate).toBeNull();
    expect(card.priority).toBe('none');
  });
});

describe('mapMemberRow', () => {
  const base = {
    board_id: 'board-1',
    user_id: 'user-2',
    role: 'member',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  it('reads a many-to-one embedded profile object', () => {
    const member = mapMemberRow({
      ...base,
      profiles: { id: 'user-2', display_name: 'Grace Hopper' },
    });

    expect(member.displayName).toBe('Grace Hopper');
    expect(member.role).toBe('member');
  });

  it('reads an embedded profile array', () => {
    const member = mapMemberRow({
      ...base,
      profiles: [{ id: 'user-2', display_name: 'Grace Hopper' }],
    });

    expect(member.displayName).toBe('Grace Hopper');
  });

  it('falls back for missing profiles and invalid roles', () => {
    const member = mapMemberRow({ ...base, profiles: null, role: 'admin' });

    expect(member.displayName).toBe('Unknown member');
    expect(member.role).toBe('member');
    expect(mapMemberRow({ ...base, profiles: null, role: 'owner' }).role).toBe('owner');
  });
});

describe('mapActivityRow', () => {
  const row = {
    id: 'log-1',
    board_id: 'board-1',
    user_id: 'user-1',
    user_name: '',
    action: 'moved card',
    entity_type: 'card',
    entity_id: 'card-1',
    details: 'Moved a card',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  it('maps entity types and falls back to a friendly author name', () => {
    const log = mapActivityRow(row);

    expect(log.userName).toBe('Someone');
    expect(log.entityType).toBe('card');
    expect(mapActivityRow({ ...row, entity_type: 'weird' }).entityType).toBe('board');
  });
});

describe('mapUpcomingCard', () => {
  it('adds the board title and truncates the due date', () => {
    expect(
      mapUpcomingCard(
        {
          id: 'card-1',
          board_id: 'board-1',
          title: 'Draft brief',
          due_date: '2026-11-03T12:00:00+00:00',
          priority: 'low',
        },
        'Product'
      )
    ).toEqual({
      id: 'card-1',
      boardId: 'board-1',
      boardTitle: 'Product',
      title: 'Draft brief',
      dueDate: '2026-11-03',
      priority: 'low',
    });
  });
});

describe('mapAuthUser', () => {
  function makeAuthUser(overrides: Partial<SupabaseAuthUser> = {}): SupabaseAuthUser {
    return {
      id: 'user-1',
      email: 'ada@example.com',
      app_metadata: {},
      user_metadata: { name: ' Ada Lovelace ' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
      ...overrides,
    } as SupabaseAuthUser;
  }

  it('prefers the stored profile display name', () => {
    const user = mapAuthUser(makeAuthUser(), {
      id: 'user-1',
      display_name: 'Ada',
      created_at: '',
      updated_at: '',
    });

    expect(user).toEqual({ id: 'user-1', email: 'ada@example.com', name: 'Ada' });
  });

  it('falls back to metadata, then to the email local part', () => {
    expect(
      mapAuthUser(makeAuthUser(), null).name
    ).toBe('Ada Lovelace');

    expect(
      mapAuthUser(makeAuthUser({ user_metadata: {} }), null).name
    ).toBe('ada');
  });

  it('uses a generic fallback when no email exists', () => {
    const user = mapAuthUser(makeAuthUser({ email: undefined, user_metadata: {} }), null);

    expect(user.email).toBe('');
    expect(user.name).toBe('Member');
  });
});
