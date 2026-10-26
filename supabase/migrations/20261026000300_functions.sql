-- Atomic operations exposed through PostgREST RPCs.
-- These are database functions, not a custom API server. All run as the
-- caller (SECURITY INVOKER) except invite_board_member, which performs an
-- owner-checked lookup and is intentionally SECURITY DEFINER.

create or replace function public.create_board_from_template(
  p_title text,
  p_description text default '',
  p_color text default 'lavender',
  p_template_id text default null,
  p_lists jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_board_id uuid;
  v_list jsonb;
  v_card jsonb;
  v_list_id uuid;
  v_list_index integer := 0;
  v_card_index integer;
  v_list_title text;
  v_card_title text;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.boards (title, description, color, template_id, owner_id)
  values (
    trim(p_title),
    coalesce(p_description, ''),
    coalesce(p_color, 'lavender'),
    nullif(trim(p_template_id), ''),
    v_user_id
  )
  returning id into v_board_id;

  insert into public.board_members (board_id, user_id, role)
  values (v_board_id, v_user_id, 'owner');

  for v_list in select * from jsonb_array_elements(coalesce(p_lists, '[]'::jsonb))
  loop
    v_list_title := coalesce(nullif(trim(v_list ->> 'title'), ''), 'Untitled list');

    insert into public.lists (board_id, title, position)
    values (v_board_id, v_list_title, v_list_index)
    returning id into v_list_id;

    v_card_index := 0;
    for v_card in select * from jsonb_array_elements(coalesce(v_list -> 'cards', '[]'::jsonb))
    loop
      v_card_title := coalesce(nullif(trim(v_card ->> 'title'), ''), 'Untitled card');

      insert into public.cards (
        board_id, list_id, title, description, position, priority, label
      )
      values (
        v_board_id,
        v_list_id,
        v_card_title,
        coalesce(v_card ->> 'description', ''),
        v_card_index,
        coalesce(nullif(v_card ->> 'priority', ''), 'none'),
        nullif(trim(v_card ->> 'label'), '')
      );

      v_card_index := v_card_index + 1;
    end loop;

    v_list_index := v_list_index + 1;
  end loop;

  select display_name into v_display_name
  from public.profiles
  where id = v_user_id;

  insert into public.activity_logs (
    board_id, user_id, user_name, action, entity_type, entity_id, details
  )
  values (
    v_board_id,
    v_user_id,
    coalesce(v_display_name, 'Someone'),
    'created board',
    'board',
    v_board_id,
    case
      when p_template_id is null or p_template_id = '' or p_template_id = 'blank'
        then format('Created "%s"', trim(p_title))
      else format('Created "%s" from the %s template', trim(p_title), p_template_id)
    end
  );

  return v_board_id;
end;
$$;

create or replace function public.move_card(
  p_card_id uuid,
  p_target_list_id uuid,
  p_new_position integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_card public.cards;
  v_source_list_id uuid;
  v_old_position integer;
  v_dest_count integer;
  v_position integer;
  v_target_title text;
  v_user_id uuid := (select auth.uid());
  v_display_name text;
begin
  select * into v_card
  from public.cards
  where id = p_card_id
  for update;

  if not found then
    raise exception 'Card not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.lists
    where id = p_target_list_id and board_id = v_card.board_id
  ) then
    raise exception 'Target list not found in this board' using errcode = 'P0001';
  end if;

  v_source_list_id := v_card.list_id;
  v_old_position := v_card.position;

  select count(*) into v_dest_count
  from public.cards
  where list_id = p_target_list_id and id <> p_card_id;

  v_position := greatest(0, least(coalesce(p_new_position, 0), v_dest_count));

  if v_source_list_id = p_target_list_id then
    if v_position > v_old_position then
      update public.cards
      set position = position - 1
      where list_id = v_source_list_id
        and id <> p_card_id
        and position > v_old_position
        and position <= v_position;
    elsif v_position < v_old_position then
      update public.cards
      set position = position + 1
      where list_id = v_source_list_id
        and id <> p_card_id
        and position >= v_position
        and position < v_old_position;
    end if;
  else
    update public.cards
    set position = position - 1
    where list_id = v_source_list_id
      and id <> p_card_id
      and position > v_old_position;

    update public.cards
    set position = position + 1
    where list_id = p_target_list_id
      and id <> p_card_id
      and position >= v_position;
  end if;

  update public.cards
  set list_id = p_target_list_id, position = v_position
  where id = p_card_id
  returning * into v_card;

  if v_source_list_id <> p_target_list_id then
    select title into v_target_title from public.lists where id = p_target_list_id;
    select display_name into v_display_name from public.profiles where id = v_user_id;

    insert into public.activity_logs (
      board_id, user_id, user_name, action, entity_type, entity_id, details
    )
    values (
      v_card.board_id,
      v_user_id,
      coalesce(v_display_name, 'Someone'),
      'moved card',
      'card',
      v_card.id,
      format('Moved "%s" to "%s"', v_card.title, v_target_title)
    );
  end if;
end;
$$;

create or replace function public.reorder_lists(
  p_board_id uuid,
  p_list_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_list_id uuid;
  v_index integer := 0;
  v_expected integer;
begin
  if not private.is_board_member(p_board_id) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select count(*) into v_expected from public.lists where board_id = p_board_id;

  if v_expected <> coalesce(array_length(p_list_ids, 1), 0) then
    raise exception 'The list set does not match this board' using errcode = 'P0001';
  end if;

  foreach v_list_id in array p_list_ids
  loop
    if not exists (
      select 1 from public.lists where id = v_list_id and board_id = p_board_id
    ) then
      raise exception 'List does not belong to this board' using errcode = 'P0001';
    end if;

    update public.lists set position = v_index where id = v_list_id;
    v_index := v_index + 1;
  end loop;
end;
$$;

create or replace function public.invite_board_member(
  p_board_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invitee_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.is_board_owner(p_board_id) then
    raise exception 'Only the board owner can invite members' using errcode = '42501';
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  select id into v_invitee_id
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_invitee_id is null then
    return 'not_found';
  end if;

  if v_invitee_id = v_user_id then
    return 'already_member';
  end if;

  insert into public.board_members (board_id, user_id, role)
  values (p_board_id, v_invitee_id, 'member')
  on conflict (board_id, user_id) do nothing;

  if not found then
    return 'already_member';
  end if;

  select display_name into v_display_name from public.profiles where id = v_user_id;

  insert into public.activity_logs (
    board_id, user_id, user_name, action, entity_type, entity_id, details
  )
  values (
    p_board_id,
    v_user_id,
    coalesce(v_display_name, 'Someone'),
    'invited member',
    'board',
    p_board_id,
    format('Invited %s to the board', v_email)
  );

  return 'invited';
end;
$$;

revoke all on function public.create_board_from_template(text, text, text, text, jsonb) from public, anon;
revoke all on function public.move_card(uuid, uuid, integer) from public, anon;
revoke all on function public.reorder_lists(uuid, uuid[]) from public, anon;
revoke all on function public.invite_board_member(uuid, text) from public, anon;

grant execute on function public.create_board_from_template(text, text, text, text, jsonb) to authenticated;
grant execute on function public.move_card(uuid, uuid, integer) to authenticated;
grant execute on function public.reorder_lists(uuid, uuid[]) to authenticated;
grant execute on function public.invite_board_member(uuid, text) to authenticated;
