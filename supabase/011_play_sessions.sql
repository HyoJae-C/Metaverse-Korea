-- Play sessions, for the operator's retention numbers (admin.html →
-- Retention): daily players, D1/D3/D7 return, session length, days played
-- per week, first-session drop-off and playing alone vs together.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 005_operators.sql (operators) and 009_admin.sql (ops_check).
--
-- How it works: while the game tab is visible it reports once a minute
-- (src/core/sessions.js): a random session id, the region, a device class
-- (phone / tablet / desktop), the average frame rate, where the player first
-- came from (?src= on an invite link) and a few counts for the session. The
-- server adds the account id (the same random id the save uses) and its own
-- clock. No IP address, browser string, position or chat text is stored.
-- Rows older than 180 days are removed as new sessions start.
--
-- Players can't read any of it, not even their own rows.

create table if not exists public.play_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  region text not null default '',
  device text not null default '',
  src text not null default '',
  fps smallint not null default 0,
  fish int not null default 0,
  coins_in int not null default 0,
  coins_out int not null default 0,
  buys int not null default 0,
  chats int not null default 0,
  near_sec int not null default 0
);
create index if not exists play_sessions_user on public.play_sessions (user_id, started_at);
create index if not exists play_sessions_started on public.play_sessions (started_at);
alter table public.play_sessions enable row level security;
revoke all on public.play_sessions from anon, authenticated;

-- Called by the game: "this session is still going, here are its counts".
-- Ignored without an account, for another account's session id, or when the
-- same session reported less than 20 seconds ago. Counts only go up and are
-- capped, so a bad client can't make a session look huge.
create or replace function public.report_session(
  p_id uuid, p_region text, p_device text, p_src text, p_fps int, p_counts jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  n jsonb := case when jsonb_typeof(p_counts) = 'object' then p_counts else '{}'::jsonb end;
  -- A whole number from the counts, 0 when missing or not a number, capped.
  f_fish int := least(greatest(coalesce(case when jsonb_typeof(n->'fish') = 'number' then (n->>'fish')::numeric end, 0), 0), 100000)::int;
  f_in int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsIn') = 'number' then (n->>'coinsIn')::numeric end, 0), 0), 1000000)::int;
  f_out int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsOut') = 'number' then (n->>'coinsOut')::numeric end, 0), 0), 1000000)::int;
  f_buys int := least(greatest(coalesce(case when jsonb_typeof(n->'buys') = 'number' then (n->>'buys')::numeric end, 0), 0), 100000)::int;
  f_chats int := least(greatest(coalesce(case when jsonb_typeof(n->'chats') = 'number' then (n->>'chats')::numeric end, 0), 0), 100000)::int;
  f_near int := least(greatest(coalesce(case when jsonb_typeof(n->'nearSec') = 'number' then (n->>'nearSec')::numeric end, 0), 0), 86400)::int;
  dev text := case when p_device in ('phone', 'tablet', 'desktop') then p_device else '' end;
  s text := case when coalesce(p_src, '') ~ '^[a-z0-9_-]{1,16}$' then p_src else '' end;
begin
  if auth.uid() is null or p_id is null then return; end if;
  insert into public.play_sessions as p
    (id, user_id, region, device, src, fps, fish, coins_in, coins_out, buys, chats, near_sec)
  values (p_id, auth.uid(), left(coalesce(p_region, ''), 32), dev, s,
          least(greatest(coalesce(p_fps, 0), 0), 240), f_fish, f_in, f_out, f_buys, f_chats, f_near)
  on conflict (id) do update
    set last_at = now(),
        region = excluded.region,
        fps = case when excluded.fps > 0 then excluded.fps else p.fps end,
        fish = greatest(p.fish, excluded.fish),
        coins_in = greatest(p.coins_in, excluded.coins_in),
        coins_out = greatest(p.coins_out, excluded.coins_out),
        buys = greatest(p.buys, excluded.buys),
        chats = greatest(p.chats, excluded.chats),
        near_sec = least(greatest(p.near_sec, excluded.near_sec), extract(epoch from now() - p.started_at)::int + 60)
    where p.user_id = auth.uid() and p.last_at < now() - interval '20 seconds';
  -- Now and then, tidy away sessions older than 180 days.
  if random() < 0.02 then
    delete from public.play_sessions where started_at < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.report_session(uuid, text, text, text, int, jsonb) from public, anon;
grant execute on function public.report_session(uuid, text, text, text, int, jsonb) to authenticated;

-- Called by admin.html: retention numbers over the last `days` Korean days.
-- Days are Korean calendar days. A player "joined" on their first recorded
-- session (so accounts from before this file was run start counting from
-- their first session after it). Only `src` = '' (no invite tag) vs anything
-- else is split, as "other" and "tagged". Operators only.
create or replace function public.ops_retention(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d int := least(greatest(coalesce(days, 30), 7), 180);
  today date := (now() at time zone 'Asia/Seoul')::date;
  result jsonb;
begin
  perform public.ops_check();
  with s as (
    select p.*, (p.started_at at time zone 'Asia/Seoul')::date as day,
           greatest(extract(epoch from p.last_at - p.started_at), 0) / 60.0 as minutes
    from public.play_sessions p
  ), firsts as (
    select distinct on (user_id) user_id, day as joined, minutes as first_min, id as first_id,
           (src <> '') as tagged
    from s order by user_id, started_at
  ), active as (
    select distinct user_id, day from s
  ), daily as (
    select a.day,
           count(distinct a.user_id) as players,
           count(distinct a.user_id) filter (where f.joined = a.day) as new_players
    from active a join firsts f using (user_id)
    where a.day > today - d
    group by a.day
  ), daily_s as (
    select day, count(*) as sessions,
           percentile_cont(0.5) within group (order by minutes) as median_min
    from s where day > today - d group by day
  ), cohort as (
    select f.joined, f.tagged,
           count(*) as players,
           count(*) filter (where exists (select 1 from active a where a.user_id = f.user_id and a.day = f.joined + 1)) as d1,
           count(*) filter (where exists (select 1 from active a where a.user_id = f.user_id and a.day = f.joined + 3)) as d3,
           count(*) filter (where exists (select 1 from active a where a.user_id = f.user_id and a.day = f.joined + 7)) as d7,
           count(*) filter (where exists (select 1 from active a where a.user_id = f.user_id and a.day >= f.joined + 7)) as d7plus,
           count(*) filter (where f.first_min < 5) as first_under5
    from firsts f
    where f.joined > today - d
    group by f.joined, f.tagged
  ), recent as (
    select s.* from s where s.day > today - 7
  ), week_days as (
    select user_id, count(distinct day) as n from recent group by user_id
  )
  select jsonb_build_object(
    'today', today,
    'days', d,
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
        'day', dd.day, 'players', dd.players, 'new', dd.new_players,
        'sessions', coalesce(ds.sessions, 0), 'median_min', round(coalesce(ds.median_min, 0)::numeric, 1))
        order by dd.day) from daily dd left join daily_s ds using (day)), '[]'::jsonb),
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object(
        'joined', c.joined, 'tagged', c.tagged, 'players', c.players,
        'd1', c.d1, 'd3', c.d3, 'd7', c.d7, 'd7plus', c.d7plus, 'first_under5', c.first_under5,
        'd1_ready', c.joined + 1 < today, 'd3_ready', c.joined + 3 < today, 'd7_ready', c.joined + 7 < today)
        order by c.joined desc, c.tagged) from cohort c), '[]'::jsonb),
    'week', jsonb_build_object(
        'players', (select count(*) from week_days),
        'days_1', (select count(*) from week_days where n = 1),
        'days_2_3', (select count(*) from week_days where n between 2 and 3),
        'days_4plus', (select count(*) from week_days where n >= 4),
        'sessions', (select count(*) from recent),
        'median_min', (select round(coalesce(percentile_cont(0.5) within group (order by minutes), 0)::numeric, 1) from recent),
        'sessions_per_player_day', (select round(coalesce(count(*)::numeric / nullif(count(distinct (user_id, day)), 0), 0), 2) from recent),
        'together_share', (select round(coalesce(sum(near_sec)::numeric / nullif(sum(minutes * 60), 0), 0), 3) from recent),
        'fishing_players', (select count(distinct user_id) from recent where fish > 0),
        'buying_players', (select count(distinct user_id) from recent where buys > 0),
        'chatting_players', (select count(distinct user_id) from recent where chats > 0),
        'fish', (select coalesce(sum(fish), 0) from recent),
        'coins_in', (select coalesce(sum(coins_in), 0) from recent),
        'coins_out', (select coalesce(sum(coins_out), 0) from recent)),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device', x.device, 'players', x.players, 'fps', x.fps) order by x.players desc)
        from (select coalesce(nullif(device, ''), '?') as device, count(distinct user_id) as players,
                     round(coalesce(percentile_cont(0.5) within group (order by fps) filter (where fps > 0), 0)::numeric) as fps
              from recent group by 1) x), '[]'::jsonb),
    'since', (select min(day) from s)
  ) into result;
  return result;
end $$;
revoke all on function public.ops_retention(int) from public, anon;
grant execute on function public.ops_retention(int) to authenticated;
