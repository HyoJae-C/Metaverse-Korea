-- More numbers for the operator's Retention tab (admin.html → Retention →
-- "More"): the loading funnel, return rate by country, rewarded ads, the
-- new player's first path, what new players did on their first day,
-- languages, Google sign-in, and errors.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 010_countries.sql (player_country_days) and 011_play_sessions.sql.
--
-- What it adds:
-- * play_sessions gets a few more counts per session (rewarded ads watched,
--   errors seen, square missions finished, how far along the first path the
--   player is) and the game's language setting (a short code like 'en').
--   report_session() below reads them from the same counts it already gets,
--   so the game needs no new call for these.
-- * play_visits: one row per page visit with how far it got: page open →
--   pressed Play → world loaded → a minute of play, how long loading took,
--   and whether loading failed. This shows the people who leave before the
--   first session report (they are invisible in play_sessions).
-- * client_errors: error messages per Korean day with a count, WITHOUT any
--   account id. Digits are replaced by # on the device, so no position or
--   other numbers are kept. At most 300 different messages a day.
-- No IP address, browser string, position or chat text is stored. Players
-- can't read any of it. Visits and errors older than 180 / 60 days are
-- removed as new ones come in.

alter table public.play_sessions add column if not exists ads int not null default 0;
alter table public.play_sessions add column if not exists errors int not null default 0;
alter table public.play_sessions add column if not exists quests int not null default 0;
alter table public.play_sessions add column if not exists starter smallint not null default -1;
alter table public.play_sessions add column if not exists lang text not null default '';

-- Same as in 011, plus the new counts (ads, errors, quests, starter, lang).
create or replace function public.report_session(
  p_id uuid, p_region text, p_device text, p_src text, p_fps int, p_counts jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  n jsonb := case when jsonb_typeof(p_counts) = 'object' then p_counts else '{}'::jsonb end;
  f_fish int := least(greatest(coalesce(case when jsonb_typeof(n->'fish') = 'number' then (n->>'fish')::numeric end, 0), 0), 100000)::int;
  f_in int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsIn') = 'number' then (n->>'coinsIn')::numeric end, 0), 0), 1000000)::int;
  f_out int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsOut') = 'number' then (n->>'coinsOut')::numeric end, 0), 0), 1000000)::int;
  f_buys int := least(greatest(coalesce(case when jsonb_typeof(n->'buys') = 'number' then (n->>'buys')::numeric end, 0), 0), 100000)::int;
  f_chats int := least(greatest(coalesce(case when jsonb_typeof(n->'chats') = 'number' then (n->>'chats')::numeric end, 0), 0), 100000)::int;
  f_near int := least(greatest(coalesce(case when jsonb_typeof(n->'nearSec') = 'number' then (n->>'nearSec')::numeric end, 0), 0), 86400)::int;
  f_ads int := least(greatest(coalesce(case when jsonb_typeof(n->'ads') = 'number' then (n->>'ads')::numeric end, 0), 0), 1000)::int;
  f_err int := least(greatest(coalesce(case when jsonb_typeof(n->'errors') = 'number' then (n->>'errors')::numeric end, 0), 0), 10000)::int;
  f_quests int := least(greatest(coalesce(case when jsonb_typeof(n->'quests') = 'number' then (n->>'quests')::numeric end, 0), 0), 1000)::int;
  f_starter int := least(greatest(coalesce(case when jsonb_typeof(n->'starter') = 'number' then (n->>'starter')::numeric end, -1), -1), 99)::int;
  f_lang text := case when coalesce(n->>'lang', '') ~ '^[a-z]{2,4}$' then n->>'lang' else '' end;
  dev text := case when p_device in ('phone', 'tablet', 'desktop') then p_device else '' end;
  s text := case when coalesce(p_src, '') ~ '^[a-z0-9_-]{1,16}$' then p_src else '' end;
begin
  if auth.uid() is null or p_id is null then return; end if;
  insert into public.play_sessions as p
    (id, user_id, region, device, src, fps, fish, coins_in, coins_out, buys, chats, near_sec, ads, errors, quests, starter, lang)
  values (p_id, auth.uid(), left(coalesce(p_region, ''), 32), dev, s,
          least(greatest(coalesce(p_fps, 0), 0), 240), f_fish, f_in, f_out, f_buys, f_chats, f_near,
          f_ads, f_err, f_quests, f_starter, f_lang)
  on conflict (id) do update
    set last_at = now(),
        region = excluded.region,
        fps = case when excluded.fps > 0 then excluded.fps else p.fps end,
        fish = greatest(p.fish, excluded.fish),
        coins_in = greatest(p.coins_in, excluded.coins_in),
        coins_out = greatest(p.coins_out, excluded.coins_out),
        buys = greatest(p.buys, excluded.buys),
        chats = greatest(p.chats, excluded.chats),
        near_sec = least(greatest(p.near_sec, excluded.near_sec), extract(epoch from now() - p.started_at)::int + 60),
        ads = greatest(p.ads, excluded.ads),
        errors = greatest(p.errors, excluded.errors),
        quests = greatest(p.quests, excluded.quests),
        starter = greatest(p.starter, excluded.starter),
        lang = case when excluded.lang <> '' then excluded.lang else p.lang end
    where p.user_id = auth.uid() and p.last_at < now() - interval '20 seconds';
  if random() < 0.02 then
    delete from public.play_sessions where started_at < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.report_session(uuid, text, text, text, int, jsonb) from public, anon;
grant execute on function public.report_session(uuid, text, text, text, int, jsonb) to authenticated;

-- Page visits: how far each one got (1 page open, 2 pressed Play, 3 world
-- loaded, 4 played a minute), loading time and failure.
create table if not exists public.play_visits (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  stage smallint not null default 1,
  load_ms int not null default 0,
  is_new boolean not null default false,
  failed boolean not null default false,
  device text not null default '',
  src text not null default ''
);
create index if not exists play_visits_started on public.play_visits (started_at);
create index if not exists play_visits_user on public.play_visits (user_id, started_at);
alter table public.play_visits enable row level security;
revoke all on public.play_visits from anon, authenticated;

-- Called by the game at each step. The stage only goes up; loading time is
-- kept from the first report that has one. At most 50 new visits per
-- account per day.
create or replace function public.report_visit(
  p_id uuid, p_stage int, p_load_ms int, p_new boolean, p_failed boolean, p_device text, p_src text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  st int := least(greatest(coalesce(p_stage, 1), 1), 4);
  ms int := least(greatest(coalesce(p_load_ms, 0), 0), 600000);
  dev text := case when p_device in ('phone', 'tablet', 'desktop') then p_device else '' end;
  s text := case when coalesce(p_src, '') ~ '^[a-z0-9_-]{1,16}$' then p_src else '' end;
begin
  if auth.uid() is null or p_id is null then return; end if;
  if not exists (select 1 from public.play_visits where id = p_id)
     and (select count(*) from public.play_visits where user_id = auth.uid() and started_at > now() - interval '1 day') >= 50 then
    return;
  end if;
  insert into public.play_visits as v (id, user_id, stage, load_ms, is_new, failed, device, src)
  values (p_id, auth.uid(), st, ms, coalesce(p_new, false), coalesce(p_failed, false), dev, s)
  on conflict (id) do update
    set stage = greatest(v.stage, excluded.stage),
        load_ms = case when v.load_ms = 0 then excluded.load_ms else v.load_ms end,
        failed = v.failed or excluded.failed
    where v.user_id = auth.uid();
  if random() < 0.02 then
    delete from public.play_visits where started_at < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.report_visit(uuid, int, int, boolean, boolean, text, text) from public, anon;
grant execute on function public.report_visit(uuid, int, int, boolean, boolean, text, text) to authenticated;

-- Error messages per Korean day, with no account id.
create table if not exists public.client_errors (
  day date not null,
  msg text not null,
  n int not null default 1,
  primary key (day, msg)
);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

create or replace function public.report_error(p_msg text) returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  m text := left(regexp_replace(coalesce(p_msg, ''), '[0-9]+', '#', 'g'), 120);
begin
  if auth.uid() is null or m = '' then return; end if;
  if not exists (select 1 from public.client_errors where day = today and msg = m)
     and (select count(*) from public.client_errors where day = today) >= 300 then
    return;
  end if;
  insert into public.client_errors as e (day, msg) values (today, m)
  on conflict (day, msg) do update set n = least(e.n + 1, 1000000);
  if random() < 0.02 then
    delete from public.client_errors where day < today - 60;
  end if;
end $$;
revoke all on function public.report_error(text) from public, anon;
grant execute on function public.report_error(text) to authenticated;

-- Called by admin.html: the "More" numbers over the last `days` Korean days.
-- New players are counted the same way as in ops_retention(): a player
-- starts on their first recorded session, D1 = played again the next Korean
-- day, and a day only counts once it is over. Operators only.
create or replace function public.ops_retention_more(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d int := least(greatest(coalesce(days, 30), 7), 180);
  today date := (now() at time zone 'Asia/Seoul')::date;
  result jsonb;
begin
  perform public.ops_check();
  with s as (
    select p.*, (p.started_at at time zone 'Asia/Seoul')::date as day
    from public.play_sessions p
  ), firsts as (
    select distinct on (user_id) user_id, day as joined
    from s order by user_id, started_at
  ), active as (
    select distinct user_id, day from s
  ), newbies as (
    -- Players who started in the window, with what they did on their first
    -- day (all sessions that day added up) and whether they came back.
    select f.user_id, f.joined,
           (f.joined + 1 < today) as d1_ready,
           (f.joined + 7 < today) as d7_ready,
           exists (select 1 from active a where a.user_id = f.user_id and a.day = f.joined + 1) as d1,
           exists (select 1 from active a where a.user_id = f.user_id and a.day = f.joined + 7) as d7,
           coalesce((select c.country from public.player_country_days c
                     where c.user_id = f.user_id and c.country <> 'XX' order by c.day limit 1), 'XX') as country,
           (select coalesce(sum(x.fish), 0) from s x where x.user_id = f.user_id and x.day = f.joined) as fish,
           (select coalesce(sum(x.chats), 0) from s x where x.user_id = f.user_id and x.day = f.joined) as chats,
           (select coalesce(sum(x.near_sec), 0) from s x where x.user_id = f.user_id and x.day = f.joined) as near_sec,
           (select coalesce(sum(x.ads), 0) from s x where x.user_id = f.user_id and x.day = f.joined) as ads,
           (select coalesce(sum(x.quests), 0) from s x where x.user_id = f.user_id and x.day = f.joined) as quests,
           (select coalesce(max(x.starter), -1) from s x where x.user_id = f.user_id and x.day = f.joined) as starter_day1,
           (select coalesce(max(x.starter), -1) from s x where x.user_id = f.user_id) as starter_max
    from firsts f
    where f.joined > today - d
  ), recent as (
    select * from s where day > today - 7
  ), player_days as (
    select user_id, day, sum(ads) as ads from recent group by user_id, day
  ), v as (
    select * from public.play_visits where started_at > now() - make_interval(days => d)
  ), err_days as (
    select msg, sum(n) as n from public.client_errors where day > today - 7 group by msg
  )
  select jsonb_build_object(
    'days', d,
    -- Loading funnel, split by first visit on this device vs returning.
    'funnel', coalesce((select jsonb_agg(jsonb_build_object(
        'is_new', x.is_new, 'opened', x.opened, 'pressed', x.pressed, 'loaded', x.loaded, 'minute', x.minute,
        'failed', x.failed, 'load_med_s', x.med, 'load_p90_s', x.p90) order by x.is_new desc)
      from (select is_new, count(*) as opened,
                   count(*) filter (where stage >= 2) as pressed,
                   count(*) filter (where stage >= 3) as loaded,
                   count(*) filter (where stage >= 4) as minute,
                   count(*) filter (where failed) as failed,
                   round(coalesce(percentile_cont(0.5) within group (order by load_ms) filter (where load_ms > 0), 0)::numeric / 1000, 1) as med,
                   round(coalesce(percentile_cont(0.9) within group (order by load_ms) filter (where load_ms > 0), 0)::numeric / 1000, 1) as p90
            from v group by is_new) x), '[]'::jsonb),
    'funnel_devices', coalesce((select jsonb_agg(jsonb_build_object(
        'device', x.device, 'opened', x.opened, 'loaded', x.loaded, 'minute', x.minute, 'load_med_s', x.med) order by x.opened desc)
      from (select coalesce(nullif(device, ''), '?') as device, count(*) as opened,
                   count(*) filter (where stage >= 3) as loaded,
                   count(*) filter (where stage >= 4) as minute,
                   round(coalesce(percentile_cont(0.5) within group (order by load_ms) filter (where load_ms > 0), 0)::numeric / 1000, 1) as med
            from v group by 1) x), '[]'::jsonb),
    -- Return rate by country (from 010_countries.sql; 'XX' = not known).
    'countries', coalesce((select jsonb_agg(jsonb_build_object(
        'country', x.country, 'players', x.players, 'd1', x.d1, 'd1of', x.d1of, 'd7', x.d7, 'd7of', x.d7of)
        order by x.players desc, x.country)
      from (select country, count(*) as players,
                   count(*) filter (where d1_ready and d1) as d1, count(*) filter (where d1_ready) as d1of,
                   count(*) filter (where d7_ready and d7) as d7, count(*) filter (where d7_ready) as d7of
            from newbies group by country) x), '[]'::jsonb),
    -- Rewarded ads in the last 7 days.
    'ads', jsonb_build_object(
        'watched', (select coalesce(sum(ads), 0) from player_days),
        'players', (select count(distinct user_id) from player_days),
        'watchers', (select count(distinct user_id) from player_days where ads > 0),
        'player_days', (select count(*) from player_days),
        'per_player_day', (select round(coalesce(avg(ads), 0)::numeric, 2) from player_days),
        'per_watcher_day', (select round(coalesce(avg(ads) filter (where ads > 0), 0)::numeric, 2) from player_days),
        'max_day', (select coalesce(max(ads), 0) from player_days)),
    -- The first path: how many new players got at least this far.
    'starter', jsonb_build_object(
        'steps', (select coalesce(max(starter_max), -1) from newbies),
        'players', (select count(*) from newbies where starter_max >= 0),
        'reached', coalesce((select jsonb_agg(x.n order by x.k)
          from (select k, (select count(*) from newbies where starter_max >= k) as n
                from generate_series(1, 9) k) x), '[]'::jsonb)),
    -- First day: did each thing or not, and D1 for each side. The first
    -- path and the square missions lead every new player through shops,
    -- coffee and food, so those say little; these are things nobody is told
    -- to do on day 1 (fishing, chatting, being near others, ads), plus how
    -- far along the path they got.
    'first_day', jsonb_build_array(
        (select jsonb_build_object('key', 'path_done', 'label', 'Finished the first path on day 1',
            'yes', count(*) filter (where starter_day1 >= 9), 'yes_d1', count(*) filter (where starter_day1 >= 9 and d1_ready and d1), 'yes_of', count(*) filter (where starter_day1 >= 9 and d1_ready),
            'no', count(*) filter (where starter_day1 < 9), 'no_d1', count(*) filter (where starter_day1 < 9 and d1_ready and d1), 'no_of', count(*) filter (where starter_day1 < 9 and d1_ready)) from newbies),
        (select jsonb_build_object('key', 'quests', 'label', 'Finished a square mission after the path',
            'yes', count(*) filter (where quests > 0), 'yes_d1', count(*) filter (where quests > 0 and d1_ready and d1), 'yes_of', count(*) filter (where quests > 0 and d1_ready),
            'no', count(*) filter (where quests = 0), 'no_d1', count(*) filter (where quests = 0 and d1_ready and d1), 'no_of', count(*) filter (where quests = 0 and d1_ready)) from newbies),
        (select jsonb_build_object('key', 'fish', 'label', 'Caught a fish',
            'yes', count(*) filter (where fish > 0), 'yes_d1', count(*) filter (where fish > 0 and d1_ready and d1), 'yes_of', count(*) filter (where fish > 0 and d1_ready),
            'no', count(*) filter (where fish = 0), 'no_d1', count(*) filter (where fish = 0 and d1_ready and d1), 'no_of', count(*) filter (where fish = 0 and d1_ready)) from newbies),
        (select jsonb_build_object('key', 'chat', 'label', 'Sent a chat message',
            'yes', count(*) filter (where chats > 0), 'yes_d1', count(*) filter (where chats > 0 and d1_ready and d1), 'yes_of', count(*) filter (where chats > 0 and d1_ready),
            'no', count(*) filter (where chats = 0), 'no_d1', count(*) filter (where chats = 0 and d1_ready and d1), 'no_of', count(*) filter (where chats = 0 and d1_ready)) from newbies),
        (select jsonb_build_object('key', 'near', 'label', '2+ min near another player',
            'yes', count(*) filter (where near_sec >= 120), 'yes_d1', count(*) filter (where near_sec >= 120 and d1_ready and d1), 'yes_of', count(*) filter (where near_sec >= 120 and d1_ready),
            'no', count(*) filter (where near_sec < 120), 'no_d1', count(*) filter (where near_sec < 120 and d1_ready and d1), 'no_of', count(*) filter (where near_sec < 120 and d1_ready)) from newbies),
        (select jsonb_build_object('key', 'ads', 'label', 'Watched a rewarded ad',
            'yes', count(*) filter (where ads > 0), 'yes_d1', count(*) filter (where ads > 0 and d1_ready and d1), 'yes_of', count(*) filter (where ads > 0 and d1_ready),
            'no', count(*) filter (where ads = 0), 'no_d1', count(*) filter (where ads = 0 and d1_ready and d1), 'no_of', count(*) filter (where ads = 0 and d1_ready)) from newbies)),
    -- Language setting, last 7 days (latest session per player).
    'languages', coalesce((select jsonb_agg(jsonb_build_object('lang', x.lang, 'players', x.players) order by x.players desc)
      from (select coalesce(nullif(lang, ''), '?') as lang, count(*) as players
            from (select distinct on (user_id) user_id, lang from recent order by user_id, last_at desc) l
            group by 1) x), '[]'::jsonb),
    -- Players in the last 7 days who have linked Google (not a guest).
    'google', jsonb_build_object(
        'players', (select count(distinct user_id) from recent),
        'linked', (select count(distinct r.user_id) from recent r join auth.users u on u.id = r.user_id
                   where not coalesce(u.is_anonymous, false))),
    -- Errors in the last 7 days.
    'errors', jsonb_build_object(
        'sessions', (select count(*) from recent),
        'with_errors', (select count(*) from recent where errors > 0),
        'top', coalesce((select jsonb_agg(jsonb_build_object('msg', x.msg, 'n', x.n) order by x.n desc)
          from (select msg, n from err_days order by n desc limit 5) x), '[]'::jsonb))
  ) into result;
  return result;
end $$;
revoke all on function public.ops_retention_more(int) from public, anon;
grant execute on function public.ops_retention_more(int) to authenticated;
