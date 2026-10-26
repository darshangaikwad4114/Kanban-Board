-- Realtime: publish board-scoped tables and retain full old rows so DELETE
-- events can be filtered by board_id. Postgres Changes still enforces RLS for
-- every subscriber.

alter table public.boards replica identity full;
alter table public.board_members replica identity full;
alter table public.lists replica identity full;
alter table public.cards replica identity full;
alter table public.activity_logs replica identity full;

do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'boards', 'board_members', 'lists', 'cards', 'activity_logs'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;
