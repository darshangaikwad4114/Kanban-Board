-- ---------------------------------------------------------------------------
-- Backfills profiles for auth users created before private.handle_new_user()
-- existed (for example, accounts created before these migrations were applied).
--
-- public.boards.owner_id references public.profiles, so an auth user without a
-- profile cannot create a board: the insert fails with a foreign-key violation
-- (23503). New sign-ups are provisioned by the trigger; this repairs accounts
-- that predate it. Idempotent and safe to re-run.
-- ---------------------------------------------------------------------------
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(u.email, '@', 1), ''),
      'New member'
    ),
    100
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
