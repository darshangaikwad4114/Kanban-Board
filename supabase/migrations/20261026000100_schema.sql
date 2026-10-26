-- Flowboard core schema
-- All identifiers are UUIDs generated in Postgres; timestamps are UTC.

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Profiles (public, non-sensitive display data mirroring auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Boards and membership
-- ---------------------------------------------------------------------------
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 500),
  color text not null default 'lavender'
    check (color in ('lavender', 'sage', 'peach', 'sky', 'rose', 'sand')),
  template_id text check (template_id is null or char_length(template_id) <= 50),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Lists and cards
-- ---------------------------------------------------------------------------
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lists_id_board_id_key unique (id, board_id)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  list_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 500),
  description text not null default '' check (char_length(description) <= 5000),
  position integer not null default 0 check (position >= 0),
  assignee_id uuid references public.profiles (id) on delete set null,
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high')),
  due_date date,
  label text check (label is null or char_length(label) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_list_board_fkey
    foreign key (list_id, board_id) references public.lists (id, board_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Activity log (append-only)
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  user_name text not null,
  action text not null,
  entity_type text not null check (entity_type in ('card', 'list', 'board')),
  entity_id uuid,
  details text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index boards_owner_idx on public.boards (owner_id);
create index boards_updated_idx on public.boards (updated_at desc);
create index board_members_user_idx on public.board_members (user_id);
create index lists_board_position_idx on public.lists (board_id, position);
create index cards_board_idx on public.cards (board_id);
create index cards_list_position_idx on public.cards (list_id, position);
create index cards_assignee_idx on public.cards (assignee_id) where assignee_id is not null;
create index cards_due_date_idx on public.cards (due_date) where due_date is not null;
create index activity_logs_board_created_idx on public.activity_logs (board_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Timestamps
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger boards_set_updated_at
before update on public.boards
for each row execute function private.set_updated_at();

create trigger lists_set_updated_at
before update on public.lists
for each row execute function private.set_updated_at();

create trigger cards_set_updated_at
before update on public.cards
for each row execute function private.set_updated_at();

-- Bubble structural/content changes up to the board so dashboard sorting
-- reflects recent work without a custom backend.
create or replace function private.touch_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board_id uuid;
begin
  if tg_op = 'DELETE' then
    v_board_id := old.board_id;
  else
    v_board_id := new.board_id;
  end if;

  update public.boards set updated_at = now() where id = v_board_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger lists_touch_board_insert_delete
after insert or delete on public.lists
for each row execute function private.touch_board();

create trigger lists_touch_board_update
after update of title on public.lists
for each row execute function private.touch_board();

create trigger cards_touch_board_insert_delete
after insert or delete on public.cards
for each row execute function private.touch_board();

create trigger cards_touch_board_update
after update of title, description, priority, due_date, label, list_id on public.cards
for each row execute function private.touch_board();

-- ---------------------------------------------------------------------------
-- Profiles are provisioned from auth.users on sign-up.
-- The display name is presentation-only; it is never used for authorization.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1),
      'New member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Dashboard aggregate view. SECURITY INVOKER is required so the caller's RLS
-- policies on boards/lists/cards/board_members are applied to the view.
-- ---------------------------------------------------------------------------
create or replace view public.board_overview
with (security_invoker = true)
as
select
  b.id,
  b.title,
  b.description,
  b.color,
  b.template_id,
  b.owner_id,
  b.created_at,
  b.updated_at,
  (count(distinct l.id))::int as list_count,
  (count(distinct c.id))::int as card_count,
  (count(distinct c.id) filter (where c.due_date < current_date))::int as overdue_count,
  (count(distinct c.id) filter (where c.due_date = current_date))::int as due_today_count,
  (count(distinct c.id) filter (where c.priority = 'high'))::int as high_priority_count,
  (count(distinct c.id) filter (where c.priority = 'medium'))::int as medium_priority_count,
  (count(distinct c.id) filter (where c.priority = 'low'))::int as low_priority_count,
  (count(distinct c.id) filter (where c.priority = 'none'))::int as none_priority_count,
  (count(distinct bm.user_id))::int as member_count
from public.boards b
left join public.lists l on l.board_id = b.id
left join public.cards c on c.board_id = b.id
left join public.board_members bm on bm.board_id = b.id
group by b.id;
