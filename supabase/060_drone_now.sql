-- 060: start the Ttukseom drone show now (운영자 채팅 "/드론쇼").
-- An operator types /드론쇼 in the chat: the drones rise at once (3 minutes
-- of lift-off) and the 20-minute show follows, for everyone at the same
-- moment. /드론쇼취소 calls it off. It is one extra show: the regular
-- timetable (src/core/show-clock.js PLAN) does not change.
-- The start rides on the weather setting (023_weather.sql), which every
-- game already reads on start, every 5 minutes and live on the 'weather'
-- channel (src/core/weather-watch.js, src/core/show-now.js).
-- Run once: Supabase → SQL Editor → New query → paste → Run, then
--   notify pgrst, 'reload schema';
-- Needs 009_admin.sql (ops_check) and 023_weather.sql. Safe to run again.

alter table public.weather_settings add column if not exists drone_at timestamptz;

create or replace function public.weather_payload() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'season', w.season,
    'fixed', w.fixed,
    'from', w.fixed_from,
    'until', w.fixed_until,
    'at', w.updated_at,
    'drone_at', w.drone_at,
    'by', n.name)
  from public.weather_settings w
  left join public.player_names n on n.user_id = w.updated_by
  where w.id = 1;
$$;
revoke all on function public.weather_payload() from public, anon, authenticated;

-- Operators only. → the drone show's start (lift-off is 3 minutes before
-- it, so the drones rise now), or null when called off.
create or replace function public.ops_drone_now(cancel boolean default false) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  s timestamptz := case when cancel then null else now() + interval '3 minutes' end;
begin
  perform public.ops_check();
  update public.weather_settings set drone_at = s where id = 1;
  begin
    perform realtime.send(public.weather_payload() - 'by', 'w', 'weather', true); -- games start at once
  exception when others then
    null; -- they still pick it up on their next check (5 minutes)
  end;
  return s;
end $$;
revoke all on function public.ops_drone_now(boolean) from public, anon;
grant execute on function public.ops_drone_now(boolean) to authenticated;
