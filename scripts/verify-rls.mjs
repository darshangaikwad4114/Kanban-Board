/**
 * Runs the Supabase migrations against PGlite (real Postgres in WASM) with a
 * stubbed auth schema, then exercises the RLS policies and RPCs as three
 * different users. This is a local verification harness, not application code.
 */
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = [
  '20261026000100_schema.sql',
  '20261026000200_rls.sql',
  '20261026000300_functions.sql',
  '20261026000500_backfill_profiles.sql',
];

const USERS = {
  ada: '11111111-1111-4111-8111-111111111111',
  bob: '22222222-2222-4222-8222-222222222222',
  cleo: '33333333-3333-4333-8333-333333333333',
};

const db = new PGlite();
let passed = 0;
const failures = [];

function ok(label) {
  passed += 1;
  console.log(`  PASS  ${label}`);
}

function fail(label, detail) {
  failures.push({ label, detail });
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}

function assert(condition, label, detail = '') {
  if (condition) ok(label);
  else fail(label, detail);
}

async function expectFailure(label, fn, pattern) {
  try {
    await fn();
    fail(label, 'expected an error but the statement succeeded');
  } catch (error) {
    const message = String(error?.message ?? error);
    if (pattern && !message.toLowerCase().includes(pattern.toLowerCase())) {
      fail(label, `unexpected error: ${message}`);
    } else {
      ok(label);
    }
  }
}

async function resetRole() {
  await db.exec('reset role;');
}

async function asUser(userId, fn) {
  await resetRole();
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec('set role authenticated;');
  try {
    return await fn();
  } finally {
    await resetRole();
  }
}

async function asPostgres(fn) {
  await resetRole();
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  return fn();
}

async function main() {
  console.log('\nFlowboard RLS verification (PGlite)\n');

  await db.exec(`
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text not null unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);

  for (const file of MIGRATIONS) {
    const sql = await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8');
    await db.exec(sql);
    ok(`migration applied: ${file}`);
  }

  await asPostgres(async () => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
        ($1, 'ada@example.com', '{"name":"Ada Lovelace"}'),
        ($2, 'bob@example.com', '{"name":"Bob Stone"}'),
        ($3, 'cleo@example.com', '{"name":"Cleo Park"}')`,
      [USERS.ada, USERS.bob, USERS.cleo]
    );

    const profiles = await db.query('select count(*)::int as n from public.profiles');
    assert(profiles.rows[0].n === 3, 'signup trigger provisions one profile per auth user');
  });

  await asPostgres(async () => {
    await db.query('delete from public.profiles where id = $1', [USERS.cleo]);
    const backfill = await readFile(
      new URL('../supabase/migrations/20261026000500_backfill_profiles.sql', import.meta.url),
      'utf8'
    );
    await db.exec(backfill);

    const restored = await db.query(
      'select display_name from public.profiles where id = $1',
      [USERS.cleo]
    );
    assert(
      restored.rows.length === 1 && restored.rows[0].display_name === 'Cleo Park',
      'profile backfill restores a missing profile for an existing auth user'
    );
  });

  const templateLists = [
    {
      title: 'To Do',
      cards: [
        { title: 'Write the launch brief', priority: 'high', label: 'Planning' },
        { title: 'Collect feedback', priority: 'low' },
      ],
    },
    {
      title: 'Done',
      cards: [{ title: 'Kickoff', priority: 'none', label: 'Planning' }],
    },
  ];

  const boardResult = await asUser(USERS.ada, () =>
    db.query(
      `select public.create_board_from_template($1, $2, $3, $4, $5::jsonb) as id`,
      ['Launch Plan', 'Q4 roadmap', 'lavender', 'basic-kanban', JSON.stringify(templateLists)]
    )
  );
  const boardId = boardResult.rows[0].id;
  assert(Boolean(boardId), 'owner can create a board from a template');

  const stats = await asUser(USERS.ada, () =>
    db.query('select * from public.board_overview where id = $1', [boardId])
  );
  assert(stats.rows.length === 1, 'owner sees their board in board_overview');
  assert(stats.rows[0].list_count === 2, 'board_overview counts lists');
  assert(stats.rows[0].card_count === 3, 'board_overview counts cards');
  assert(stats.rows[0].member_count === 1, 'board_overview counts the owner membership');
  assert(stats.rows[0].high_priority_count === 1, 'board_overview counts high priority cards');
  assert(stats.rows[0].medium_priority_count === 0, 'board_overview counts medium priority cards');
  assert(stats.rows[0].low_priority_count === 1, 'board_overview counts low priority cards');
  assert(stats.rows[0].none_priority_count === 1, 'board_overview counts unprioritised cards');

  const cardsResult = await asUser(USERS.ada, () =>
    db.query('select id, list_id, title from public.cards where board_id = $1 order by position', [boardId])
  );
  const listsResult = await asUser(USERS.ada, () =>
    db.query('select id, title, position from public.lists where board_id = $1 order by position', [boardId])
  );
  const cardId = cardsResult.rows[0].id;
  const sourceListId = cardsResult.rows[0].list_id;
  const targetListId = listsResult.rows.find((list) => list.id !== sourceListId).id;

  const outsiderView = await asUser(USERS.bob, async () => {
    const boards = await db.query('select id from public.boards where id = $1', [boardId]);
    const overview = await db.query('select id from public.board_overview where id = $1', [boardId]);
    const cards = await db.query('select id from public.cards where board_id = $1', [boardId]);
    return { boards: boards.rows.length, overview: overview.rows.length, cards: cards.rows.length };
  });
  assert(outsiderView.boards === 0, 'non-member cannot read the board');
  assert(outsiderView.overview === 0, 'non-member cannot read board_overview');
  assert(outsiderView.cards === 0, 'non-member cannot read board cards');

  await asUser(USERS.bob, async () => {
    await expectFailure(
      'non-member cannot insert a list into the board',
      () =>
        db.query(
          `insert into public.lists (board_id, title, position) values ($1, 'Sneaky', 0)`,
          [boardId]
        ),
      'row-level security'
    );

    const update = await db.query(
      `update public.boards set title = 'Hijacked' where id = $1 returning id`,
      [boardId]
    );
    assert(update.rows.length === 0, 'non-member cannot update the board');

    const remove = await db.query(
      `delete from public.boards where id = $1 returning id`,
      [boardId]
    );
    assert(remove.rows.length === 0, 'non-member cannot delete the board');

    await expectFailure(
      'non-member cannot write activity log entries',
      () =>
        db.query(
          `insert into public.activity_logs
            (board_id, user_id, user_name, action, entity_type, entity_id)
           values ($1, $2, 'Bob', 'hacked', 'board', $1)`,
          [boardId, USERS.bob]
        ),
      'row-level security'
    );

    await expectFailure(
      'non-member cannot move a card',
      () => db.query('select public.move_card($1, $2, 0)', [cardId, targetListId]),
      'card not found'
    );

    await expectFailure(
      'non-member cannot invite themselves',
      () =>
        db.query(`select public.invite_board_member($1, 'bob@example.com')`, [boardId]),
      'only the board owner'
    );
  });

  const inviteResult = await asUser(USERS.ada, () =>
    db.query(`select public.invite_board_member($1, 'bob@example.com') as result`, [boardId])
  );
  assert(inviteResult.rows[0].result === 'invited', 'owner can invite a member by email');

  const inviteAgain = await asUser(USERS.ada, () =>
    db.query(`select public.invite_board_member($1, 'bob@example.com') as result`, [boardId])
  );
  assert(inviteAgain.rows[0].result === 'already_member', 'duplicate invite is reported');

  const inviteMissing = await asUser(USERS.ada, () =>
    db.query(`select public.invite_board_member($1, 'nobody@example.com') as result`, [boardId])
  );
  assert(inviteMissing.rows[0].result === 'not_found', 'unknown email is reported');

  await asUser(USERS.bob, async () => {
    const boards = await db.query('select id from public.boards where id = $1', [boardId]);
    const cards = await db.query('select id from public.cards where board_id = $1', [boardId]);
    assert(boards.rows.length === 1, 'invited member can read the board');
    assert(cards.rows.length === 3, 'invited member can read all board cards');

    const peerProfile = await db.query('select id from public.profiles where id = $1', [USERS.ada]);
    const strangerProfile = await db.query('select id from public.profiles where id = $1', [USERS.cleo]);
    assert(peerProfile.rows.length === 1, 'board peers can read each other’s display profiles');
    assert(strangerProfile.rows.length === 0, 'unrelated users cannot read a profile');

    const updateBoard = await db.query(
      `update public.boards set title = 'Member edit' where id = $1 returning id`,
      [boardId]
    );
    assert(updateBoard.rows.length === 0, 'members cannot update board settings');

    const newList = await db.query(
      `insert into public.lists (board_id, title, position) values ($1, 'QA', 2) returning id`,
      [boardId]
    );
    assert(newList.rows.length === 1, 'member can create a list');

    await db.query('select public.move_card($1, $2, 0)', [cardId, targetListId]);
    const targetPositions = await db.query(
      'select position from public.cards where list_id = $1 order by position',
      [targetListId]
    );
    assert(
      targetPositions.rows.map((row) => row.position).join(',') === '0,1',
      'move_card keeps destination positions contiguous'
    );

    const listIds = (await db.query(
      'select id from public.lists where board_id = $1 order by position',
      [boardId]
    )).rows.map((row) => row.id);
    const reversed = [...listIds].reverse();
    await db.query('select public.reorder_lists($1, $2)', [boardId, reversed]);
    const reordered = await db.query(
      'select id, position from public.lists where board_id = $1 order by position',
      [boardId]
    );
    assert(
      reordered.rows.map((row) => row.id).join(',') === reversed.join(','),
      'member can reorder lists atomically'
    );

    await expectFailure(
      'activity log cannot be updated',
      () =>
        db.query(
          `update public.activity_logs set details = 'tampered' where board_id = $1 returning id`,
          [boardId]
        ),
      'permission denied'
    );
    await expectFailure(
      'activity log cannot be deleted',
      () => db.query('delete from public.activity_logs where board_id = $1', [boardId]),
      'permission denied'
    );

    const inviteAsMember = await db
      .query(`select public.invite_board_member($1, 'cleo@example.com')`, [boardId])
      .then(() => false)
      .catch(() => true);
    assert(inviteAsMember, 'non-owner cannot invite members');
  });

  const strangerBoard = await asUser(USERS.cleo, async () => {
    const boards = await db.query('select id from public.boards where id = $1', [boardId]);
    const cards = await db.query('select id from public.cards where board_id = $1', [boardId]);
    return { boards: boards.rows.length, cards: cards.rows.length };
  });
  assert(strangerBoard.boards === 0, 'stranger cannot read the board');
  assert(strangerBoard.cards === 0, 'stranger cannot read the cards');

  const removeMember = await asUser(USERS.ada, () =>
    db.query(
      'delete from public.board_members where board_id = $1 and user_id = $2 returning user_id',
      [boardId, USERS.bob]
    )
  );
  assert(removeMember.rows.length === 1, 'owner can remove a member');

  const removedView = await asUser(USERS.bob, () =>
    db.query('select id from public.board_overview where id = $1', [boardId])
  );
  assert(removedView.rows.length === 0, 'removed member immediately loses access');

  const ownerDelete = await asUser(USERS.ada, () =>
    db.query('delete from public.boards where id = $1 returning id', [boardId])
  );
  assert(ownerDelete.rows.length === 1, 'owner can delete the board');

  const cascades = await asPostgres(async () => {
    const lists = await db.query('select count(*)::int as n from public.lists where board_id = $1', [boardId]);
    const cards = await db.query('select count(*)::int as n from public.cards where board_id = $1', [boardId]);
    const logs = await db.query('select count(*)::int as n from public.activity_logs where board_id = $1', [boardId]);
    return [lists.rows[0].n, cards.rows[0].n, logs.rows[0].n];
  });
  assert(
    cascades.join(',') === '0,0,0',
    'deleting a board cascades lists, cards, and activity'
  );

  const ownBoard = await asUser(USERS.bob, () =>
    db.query(
      `select public.create_board_from_template('Bob board', '', 'sage', 'blank', '[]'::jsonb) as id`
    )
  );
  assert(Boolean(ownBoard.rows[0].id), 'every authenticated user can create their own board');

  console.log(`\n${passed} passed, ${failures.length} failed\n`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('\nRLS verification crashed:\n', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
