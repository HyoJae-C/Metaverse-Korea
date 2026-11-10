-- Weather by season (날씨 관리): operators choose how often it rains or
-- snows (a season), and can fix the weather for a while ("snow for the
-- next hour"). Every game reads the same setting and rolls the same weather
-- from the clock (src/core/weather.js), so everyone still sees the same sky.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql and 009_admin.sql (ops_check).
--
-- Set it from the operator page (admin.html → Weather).
-- Without this file the games keep the old default: clear 80 %, rain 10 %,
-- snow 10 %.

create table if not exists public.weather_settings (
  id int primary key default 1 check (id = 1),
  season text not null default 'default'
    check (season in ('default', 'auto', 'spring', 'summer', 'autumn', 'winter')),
  fixed text check (fixed in ('clear', 'cloudy', 'fog', 'rain', 'snow', 'storm')),
  fixed_from timestamptz,
  fixed_until timestamptz, -- null with "fixed": until an operator changes it
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.weather_settings (id) values (1) on conflict (id) do nothing;
alter table public.weather_settings enable row level security;
revoke all on public.weather_settings from anon, authenticated;

create or replace function public.weather_payload() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'season', w.season,
    'fixed', w.fixed,
    'from', w.fixed_from,
    'until', w.fixed_until,
    'at', w.updated_at,
    'by', n.name)
  from public.weather_settings w
  left join public.player_names n on n.user_id = w.updated_by
  where w.id = 1;
$$;
revoke all on function public.weather_payload() from public, anon, authenticated;

-- Every game reads this on start (and every few minutes).
create or replace function public.weather_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select public.weather_payload() - 'by';
$$;
grant execute on function public.weather_settings() to anon, authenticated;

-- Change it (operators only). new_season: one of the seasons above.
-- fix: a weather to hold now, or null / '' for none. minutes: how long to
-- hold it (0 = until changed; at most 7 days).
create or replace function public.ops_set_weather(new_season text, fix text default null, minutes int default 60)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f text := nullif(btrim(coalesce(fix, '')), '');
  m int := least(greatest(coalesce(minutes, 60), 0), 7 * 24 * 60);
  payload jsonb;
begin
  perform public.ops_check();
  if new_season not in ('default', 'auto', 'spring', 'summer', 'autumn', 'winter') then
    raise exception 'unknown season' using errcode = '22023';
  end if;
  if f is not null and f not in ('clear', 'cloudy', 'fog', 'rain', 'snow', 'storm') then
    raise exception 'unknown weather' using errcode = '22023';
  end if;
  update public.weather_settings set
    season = new_season,
    fixed = f,
    fixed_from = case when f is null then null else now() end,
    fixed_until = case when f is null or m = 0 then null else now() + make_interval(mins => m) end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  payload := public.weather_payload();
  begin
    perform realtime.send(payload - 'by', 'w', 'weather', true); -- games change at once
  exception when others then
    null; -- they still pick it up on their next check
  end;
  return payload;
end $$;
revoke all on function public.ops_set_weather(text, text, int) from public, anon;
grant execute on function public.ops_set_weather(text, text, int) to authenticated;

-- The operator page reads who changed it last.
create or replace function public.ops_weather() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return public.weather_payload();
end $$;
grant execute on function public.ops_weather() to authenticated;

-- Everyone may listen on the weather channel; nobody may send on it.
drop policy if exists "weather read" on realtime.messages;
create policy "weather read" on realtime.messages
  for select to anon, authenticated
  using (realtime.messages.extension = 'broadcast' and realtime.topic() = 'weather');
