-- Row Level Security for every public table.
-- Helpers live in the non-exposed private schema, are SECURITY DEFINER, pin
-- search_path, and always derive the caller from auth.uid().

grant usage on schema private to authenticated;

create or replace function private.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = p_board_id
      and bm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_board_owner(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board_id
      and b.owner_id = (select auth.uid())
  );
$$;

create or replace function private.shares_board_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.board_members mine
      join public.board_members theirs on theirs.board_id = mine.board_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = p_user_id
    );
$$;

revoke all on function private.is_board_member(uuid) from public, anon;
revoke all on function private.is_board_owner(uuid) from public, anon;
revoke all on function private.shares_board_with(uuid) from public, anon;
grant execute on function private.is_board_member(uuid) to authenticated;
grant execute on function private.is_board_owner(uuid) to authenticated;
grant execute on function private.shares_board_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_self_or_board_peer
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or private.shares_board_with(id)
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Boards
-- ---------------------------------------------------------------------------
alter table public.boards enable row level security;

create policy boards_select_member
on public.boards
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_board_member(id)
);

create policy boards_insert_self_owned
on public.boards
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy boards_update_owner
on public.boards
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy boards_delete_owner
on public.boards
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Board membership
-- ---------------------------------------------------------------------------
alter table public.board_members enable row level security;

create policy board_members_select_member
on public.board_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_board_member(board_id)
);

-- The creator may insert only their own owner row directly. Additional members
-- must go through the owner-only invite_board_member RPC.
create policy board_members_insert_owner_self
on public.board_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and private.is_board_owner(board_id)
);

create policy board_members_delete_owner_or_self
on public.board_members
for delete
to authenticated
using (
  (private.is_board_owner(board_id) and user_id <> (select auth.uid()))
  or (user_id = (select auth.uid()) and role = 'member')
);

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------
alter table public.lists enable row level security;

create policy lists_select_member
on public.lists
for select
to authenticated
using (private.is_board_member(board_id));

create policy lists_insert_member
on public.lists
for insert
to authenticated
with check (private.is_board_member(board_id));

create policy lists_update_member
on public.lists
for update
to authenticated
using (private.is_board_member(board_id))
with check (private.is_board_member(board_id));

create policy lists_delete_member
on public.lists
for delete
to authenticated
using (private.is_board_member(board_id));

-- ---------------------------------------------------------------------------
-- Cards
-- ---------------------------------------------------------------------------
alter table public.cards enable row level security;

create policy cards_select_member
on public.cards
for select
to authenticated
using (private.is_board_member(board_id));

create policy cards_insert_member
on public.cards
for insert
to authenticated
with check (private.is_board_member(board_id));

create policy cards_update_member
on public.cards
for update
to authenticated
using (private.is_board_member(board_id))
with check (private.is_board_member(board_id));

create policy cards_delete_member
on public.cards
for delete
to authenticated
using (private.is_board_member(board_id));

-- ---------------------------------------------------------------------------
-- Activity log (append-only for clients)
-- ---------------------------------------------------------------------------
alter table public.activity_logs enable row level security;

create policy activity_logs_select_member
on public.activity_logs
for select
to authenticated
using (private.is_board_member(board_id));

create policy activity_logs_insert_self
on public.activity_logs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_board_member(board_id)
);

-- ---------------------------------------------------------------------------
-- Explicit Data API grants. RLS still filters every row.
-- ---------------------------------------------------------------------------
revoke all on public.profiles from anon;
revoke all on public.boards from anon;
revoke all on public.board_members from anon;
revoke all on public.lists from anon;
revoke all on public.cards from anon;
revoke all on public.activity_logs from anon;
revoke all on public.board_overview from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, delete on public.board_members to authenticated;
grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select on public.board_overview to authenticated;
