-- Drone show times (드론쇼 시간): operators choose when the Ttukseom drone
-- light show starts (1 to 4 times a day, Korean time). Every game reads the
-- same setting (src/core/drone-show.js), so everyone still sees the same
-- show at the same moment.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql and 009_admin.sql (ops_check).
--
-- Set it from the operator page (admin.html → Drone show).
-- Without this file (or with no times set) the games keep the default:
-- 06:00 and 18:00 KST.

create table if not exists public.drone_show_settings (
  id int primary key default 1 check (id = 1),
  starts int[], -- minutes after midnight KST; null = the game's default
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.drone_show_settings (id) values (1) on conflict (id) do nothing;
alter table public.drone_show_settings enable row level security;
revoke all on public.drone_show_settings from anon, authenticated;

create or replace function public.drone_show_payload() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'minutes', to_jsonb(d.starts),
    'at', d.updated_at,
    'by', n.name)
  from public.drone_show_settings d
  left join public.player_names n on n.user_id = d.updated_by
  where d.id = 1;
$$;
revoke all on function public.drone_show_payload() from public, anon, authenticated;

-- Every game reads this on start (and every few minutes).
create or replace function public.drone_show_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select public.drone_show_payload() - 'by';
$$;
grant execute on function public.drone_show_settings() to anon, authenticated;

-- Change it (operators only). starts: minutes after midnight KST
-- (0 … 1439), 1 to 4 of them, at least 60 minutes apart; null or an empty
-- list goes back to the default. (The operator page also keeps them clear
-- of the Yeouido fireworks.)
create or replace function public.ops_set_drone_show(starts int[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s int[];
  n int;
  gap int;
  payload jsonb;
begin
  perform public.ops_check();
  if starts is not null and cardinality(starts) > 0 then
    select array_agg(x order by x) into s from unnest(starts) x;
    n := cardinality(s);
    if n > 4 then raise exception 'at most 4 shows a day' using errcode = '22023'; end if;
    if s[1] is null or s[1] < 0 or s[n] > 1439 or array_position(s, null) is not null then
      raise exception 'times must be 00:00 to 23:59' using errcode = '22023';
    end if;
    if n > 1 then
      for i in 1 .. n loop
        gap := case when i < n then s[i + 1] - s[i] else s[1] + 1440 - s[n] end;
        if gap < 60 then raise exception 'shows must be at least an hour apart' using errcode = '22023'; end if;
      end loop;
    end if;
  end if;
  update public.drone_show_settings set
    starts = s,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  payload := public.drone_show_payload();
  begin
    perform realtime.send(payload - 'by', 'd', 'droneshow', true); -- games change at once
  exception when others then
    null; -- they still pick it up on their next check
  end;
  return payload;
end $$;
revoke all on function public.ops_set_drone_show(int[]) from public, anon;
grant execute on function public.ops_set_drone_show(int[]) to authenticated;

-- The operator page reads who changed it last.
create or replace function public.ops_drone_show() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return public.drone_show_payload();
end $$;
grant execute on function public.ops_drone_show() to authenticated;

-- Everyone may listen on the drone show channel; nobody may send on it.
drop policy if exists "droneshow read" on realtime.messages;
create policy "droneshow read" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'droneshow');
