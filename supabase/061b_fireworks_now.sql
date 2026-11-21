-- 061: operators start the Yeouido fireworks now too (운영자 채팅 "/불꽃놀이",
-- "/불꽃놀이취소"), as 060 does for the drone show ("/드론쇼"). Yeouido's sky
-- darkens at once and the first shells go up 3 minutes later, for everyone
-- at the same moment. One extra show: the timetable does not change.
-- This file has everything of 060 as well, so running only this one is
-- enough. Run once: Supabase → SQL Editor → New query → paste → Run, then
--   notify pgrst, 'reload schema';
-- Needs 009_admin.sql (ops_check) and 023_weather.sql. Safe to run again.

alter table public.weather_settings add column if not exists drone_at timestamptz;
alter table public.weather_settings add column if not exists fireworks_at timestamptz;

create or replace function public.weather_payload() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'season', w.season,
    'fixed', w.fixed,
    'from', w.fixed_from,
    'until', w.fixed_until,
    'at', w.updated_at,
    'drone_at', w.drone_at,
    'fireworks_at', w.fireworks_at,
    'by', n.name)
  from public.weather_settings w
  left join public.player_names n on n.user_id = w.updated_by
  where w.id = 1;
$$;
revoke all on function public.weather_payload() from public, anon, authenticated;

-- Operators only. → the show's start (3 minutes from now), or null when
-- called off. Games hear it at once on the 'weather' channel.
create or replace function public.ops_drone_now(cancel boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  s timestamptz := case when cancel then null else now() + interval '3 minutes' end;
begin
  perform public.ops_check();
  update public.weather_settings set drone_at = s where id = 1;
  begin
    perform realtime.send(public.weather_payload() - 'by', 'w', 'weather', true);
  exception when others then
    null; -- they still pick it up on their next check (5 minutes)
  end;
  return s;
end $$;
revoke all on function public.ops_drone_now(boolean) from public, anon;
grant execute on function public.ops_drone_now(boolean) to authenticated;

create or replace function public.ops_fireworks_now(cancel boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  s timestamptz := case when cancel then null else now() + interval '3 minutes' end;
begin
  perform public.ops_check();
  update public.weather_settings set fireworks_at = s where id = 1;
  begin
    perform realtime.send(public.weather_payload() - 'by', 'w', 'weather', true);
  exception when others then
    null; -- they still pick it up on their next check (5 minutes)
  end;
  return s;
end $$;
revoke all on function public.ops_fireworks_now(boolean) from public, anon;
grant execute on function public.ops_fireworks_now(boolean) to authenticated;

notify pgrst, 'reload schema';
