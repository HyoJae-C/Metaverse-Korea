-- Operators may change their name anytime (no 7-day wait).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 005_operators.sql and 019_chat_names.sql. Safe to run again.
--
-- Everyone else keeps the 019 rule: the first change after picking a name
-- is free and immediate, then one change per 7 days. For accounts listed in
-- "operators", name_status always answers wait_days 0 and claim_name never
-- answers 'wait'. The coin cost in the game stays the same.

create or replace function public.name_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'has_name', n.user_id is not null,
    'free', coalesce(n.renames, 0) = 0,
    'wait_days', case
      when exists (select 1 from public.operators o where o.user_id = auth.uid()) then 0
      else public.name_wait_days(n.renames, n.renamed_at)
    end)
  from (select 1) one
  left join public.player_names n on n.user_id = auth.uid();
$$;
revoke all on function public.name_status() from public, anon;
grant execute on function public.name_status() to authenticated;

-- Same as 019, except the 'wait' check skips operators.
create or replace function public.claim_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  k text := public.name_key(new_name);
  n text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
  cur public.player_names;
  op boolean := exists (select 1 from public.operators where user_id = auth.uid());
begin
  if auth.uid() is null then return 'signin'; end if;
  if k = '' or char_length(n) > 16 then return 'invalid'; end if;
  if k in ('여행자', 'traveler', 'viajero', 'pelancong') then return 'taken'; end if;
  -- Operators may keep any name; everyone else can't look official.
  if public.reserved_name(n) and not op then
    return 'taken';
  end if;
  if exists (select 1 from public.player_names where name_key = k and user_id <> auth.uid()) then
    return 'taken';
  end if;
  select * into cur from public.player_names where user_id = auth.uid() for update;
  if not found then
    insert into public.player_names (user_id, name, name_key, updated_at) values (auth.uid(), n, k, now());
  elsif cur.name_key = k then
    update public.player_names set name = n, updated_at = now() where user_id = auth.uid();
  else
    if not op and public.name_wait_days(cur.renames, cur.renamed_at) > 0 then return 'wait'; end if;
    update public.player_names
      set name = n, name_key = k, updated_at = now(), renames = cur.renames + 1, renamed_at = now()
      where user_id = auth.uid();
  end if;
  return 'ok';
exception when unique_violation then
  return 'taken'; -- someone took it at the same moment
end $$;
grant execute on function public.claim_name(text) to anon, authenticated;

notify pgrst, 'reload schema';
