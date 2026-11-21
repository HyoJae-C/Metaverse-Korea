-- 065: jobs (직업, Yozi 2026-11-21). Effort is not capped: part-time shifts
-- have no daily limit any more. Pick one job at an Information Center (you
-- can change it once a week); shifts of your job pay a bonus that grows with
-- its skill level, other shifts pay the base rate. Pay follows the time a
-- shift takes, so an hour of work earns about the same in every job:
--   not your job ₩25k an hour, your job Lv1 ₩30k, Lv3 ₩40k, Lv5 ₩50k, Lv10 ₩60k.
-- The first five shifts of a day still pay ₩5,000 each, as before.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 015_wallet.sql, 018_won.sql and 020_rewards.sql.
-- Until this is run the game pays shifts the old way (five a day).
--
-- How it works (src/core/career.js has the same numbers for showing them):
--   job_info()                   my job, when I may change it, my skills
--   job_choose(job)              pick or change my job
--   job_start(job, store)        a shift starts now (the server's clock)
--   job_finish(run, score)       the shift ends: pays and gives skill
-- The server times every shift (job_runs), so how long people really take
-- is in the table: pay is measured on real players, not on a robot.
-- Money moves with a receipt in coin_ledger (kind 'earn', r 'job' or
-- 'delivery', op id = the run) and counts towards wallet_settings.earn_day_max.
--
-- Operator:
--   Rates: Table Editor → job_settings (per_min = won a minute at the base
--     rate) and job_kinds (std_sec = the seconds a shift is paid for).
--   Levels: job_levels (xp needed, pay multiplier). Change src/core/career.js too.
--   How long shifts really take (median seconds, per job, last 7 days):
--     select job, count(*), percentile_cont(0.5) within group (order by extract(epoch from ended_at - started_at))
--     from public.job_runs where ended_at is not null and paid > 0 and started_at > now() - interval '7 days' group by job;
--   Real hourly pay (shifts within an hour of each other count as one sitting):
--     see the note at the end of this file.

create table if not exists public.job_settings (
  id int primary key default 1 check (id = 1),
  per_min int not null default 420 check (per_min between 0 and 100000),   -- won a minute, base rate
  first_n int not null default 5 check (first_n between 0 and 100),        -- shifts a day at first_pay
  first_pay int not null default 5000 check (first_pay between 0 and 100000),
  hour_max int not null default 50 check (hour_max between 1 and 1000),    -- shifts started in an hour
  change_days int not null default 7 check (change_days between 0 and 365)
);
insert into public.job_settings (id) values (1) on conflict (id) do nothing;
alter table public.job_settings enable row level security;
revoke all on public.job_settings from anon, authenticated;

create table if not exists public.job_kinds (
  id text primary key,
  std_sec int not null check (std_sec between 10 and 3600), -- seconds a shift is paid for (at most)
  min_sec int not null check (min_sec between 0 and 3600),  -- faster than this pays nothing (not a person)
  r text not null                                         -- the reward name in coin_ledger
);
insert into public.job_kinds (id, std_sec, min_sec, r) values
  ('delivery', 80, 15, 'delivery'),
  ('mart', 90, 25, 'job'),
  ('serving', 90, 25, 'job')
  on conflict (id) do nothing;
alter table public.job_kinds enable row level security;
revoke all on public.job_kinds from anon, authenticated;

create table if not exists public.job_levels (
  lv int primary key check (lv between 1 and 100),
  xp int not null check (xp >= 0),            -- skill points needed
  mult numeric not null check (mult between 0 and 10) -- pay x the base rate, for your own job
);
insert into public.job_levels (lv, xp, mult) values
  (1, 0, 1.2), (2, 20, 1.4), (3, 60, 1.6), (4, 200, 1.8), (5, 450, 2.0),
  (6, 750, 2.1), (7, 1100, 2.2), (8, 1500, 2.3), (9, 1950, 2.35), (10, 2500, 2.4)
  on conflict (lv) do nothing;
alter table public.job_levels enable row level security;
revoke all on public.job_levels from anon, authenticated;

create table if not exists public.player_job (
  user_id uuid primary key references auth.users (id) on delete cascade,
  job text not null references public.job_kinds (id),
  chosen_at timestamptz not null default now()
);
alter table public.player_job enable row level security;
revoke all on public.player_job from anon, authenticated;

create table if not exists public.job_skill (
  user_id uuid not null references auth.users (id) on delete cascade,
  job text not null references public.job_kinds (id),
  xp int not null default 0 check (xp >= 0),
  shifts int not null default 0 check (shifts >= 0),
  primary key (user_id, job)
);
alter table public.job_skill enable row level security;
revoke all on public.job_skill from anon, authenticated;

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job text not null references public.job_kinds (id),
  store text,
  mine boolean not null default false, -- my chosen job when it started
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  score numeric,
  paid int,
  xp int
);
create index if not exists job_runs_user_at on public.job_runs (user_id, started_at desc);
alter table public.job_runs enable row level security;
revoke all on public.job_runs from anon, authenticated;

-- Shifts worked before jobs count as skill (2 points a shift), once.
insert into public.job_skill (user_id, job, xp, shifts)
select l.user_id,
  case when l.r = 'delivery' then 'delivery' when l.note ilike '%Nonna Lucia%' then 'serving' else 'mart' end,
  count(*) * 2, count(*)
from public.coin_ledger l
where l.kind = 'earn' and l.r in ('job', 'delivery')
group by 1, 2
on conflict (user_id, job) do nothing;

-- The level a number of skill points reaches.
create or replace function public.job_lv(p_xp int) returns int
language sql stable set search_path = public as $$
  select coalesce(max(lv), 1) from public.job_levels where xp <= greatest(p_xp, 0)
$$;

-- { status: 'ok', job, chosen, next (ms: when I may change, 0 = now),
--   skills: { job: { xp, shifts, lv } }, levels: [{ lv, xp, mult }],
--   today (shifts paid today), first_n, first_pay, per_min, kinds: { id: std_sec } }
create or replace function public.job_info() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.job_settings;
  pj public.player_job;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.job_settings where id = 1;
  select * into pj from public.player_job where user_id = uid;
  return jsonb_build_object(
    'status', 'ok', 'job', pj.job,
    'chosen', case when pj.user_id is null then null else (extract(epoch from pj.chosen_at) * 1000)::bigint end,
    'next', case when pj.user_id is null or pj.chosen_at + make_interval(days => cfg.change_days) <= now() then 0
                 else (extract(epoch from pj.chosen_at + make_interval(days => cfg.change_days)) * 1000)::bigint end,
    'skills', coalesce((select jsonb_object_agg(job, jsonb_build_object('xp', xp, 'shifts', shifts, 'lv', public.job_lv(xp)))
                        from public.job_skill where user_id = uid), '{}'::jsonb),
    'levels', (select jsonb_agg(jsonb_build_object('lv', lv, 'xp', xp, 'mult', mult) order by lv) from public.job_levels),
    'today', (select count(*) from public.job_runs where user_id = uid and paid > 0 and ended_at >= public.kst_day_start()),
    'first_n', cfg.first_n, 'first_pay', cfg.first_pay, 'per_min', cfg.per_min,
    'kinds', (select jsonb_object_agg(id, std_sec) from public.job_kinds));
end $$;
revoke all on function public.job_info() from public, anon;
grant execute on function public.job_info() to authenticated;

-- Pick or change my job. { status: 'ok', job, next } or { status: 'job' (no
-- such job) | 'same' | 'wait', next (ms) | 'signin' }.
create or replace function public.job_choose(p_job text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.job_settings;
  pj public.player_job;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if not exists (select 1 from public.job_kinds where id = p_job) then return jsonb_build_object('status', 'job'); end if;
  select * into cfg from public.job_settings where id = 1;
  select * into pj from public.player_job where user_id = uid for update;
  if found then
    if pj.job = p_job then return jsonb_build_object('status', 'same'); end if;
    if pj.chosen_at + make_interval(days => cfg.change_days) > now() then
      return jsonb_build_object('status', 'wait', 'next', (extract(epoch from pj.chosen_at + make_interval(days => cfg.change_days)) * 1000)::bigint);
    end if;
  end if;
  insert into public.player_job (user_id, job, chosen_at) values (uid, p_job, now())
    on conflict (user_id) do update set job = excluded.job, chosen_at = excluded.chosen_at;
  return jsonb_build_object('status', 'ok', 'job', p_job,
    'next', (extract(epoch from now() + make_interval(days => cfg.change_days)) * 1000)::bigint);
end $$;
revoke all on function public.job_choose(text) from public, anon;
grant execute on function public.job_choose(text) to authenticated;

-- A shift starts. { status: 'ok', run } or { status: 'job' | 'busy' (too
-- many shifts this hour) | 'signin' }.
create or replace function public.job_start(p_job text, p_store text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.job_settings;
  v_id uuid;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if not exists (select 1 from public.job_kinds where id = p_job) then return jsonb_build_object('status', 'job'); end if;
  select * into cfg from public.job_settings where id = 1;
  if (select count(*) from public.job_runs where user_id = uid and started_at > now() - interval '1 hour') >= cfg.hour_max then
    return jsonb_build_object('status', 'busy');
  end if;
  insert into public.job_runs (user_id, job, store, mine)
    values (uid, p_job, left(p_store, 60), exists (select 1 from public.player_job where user_id = uid and job = p_job))
    returning id into v_id;
  return jsonb_build_object('status', 'ok', 'run', v_id);
end $$;
revoke all on function public.job_start(text, text) from public, anon;
grant execute on function public.job_start(text, text) to authenticated;

-- The shift ends. p_score: 0..1, how well it went (a failed delivery is not
-- finished at all). Pay: the first first_n shifts of the day first_pay;
-- after that per_min x the minutes worked (at most std_sec) x the level
-- multiplier (your own job) or 1 x (0.6 + 0.4 score), to ₩10. Skill: your
-- own job only, 1..3 points by score.
-- { status: 'ok', paid, xp, lv, up (levelled up), coins, ver } or
-- { status: 'run' (not mine / unknown) | 'fast' (under the job's min_sec, nothing
-- paid) | 'nosave' | 'signin' }. Sent twice: the same answer, paid once.
create or replace function public.job_finish(p_run uuid, p_score numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.job_settings;
  k public.job_kinds;
  run public.job_runs;
  w public.wallets;
  s public.wallet_settings;
  v_sec numeric;
  v_score numeric := greatest(0, least(coalesce(p_score, 0), 1));
  v_today_n int;
  v_today bigint;
  v_xp0 int;
  v_lv0 int;
  v_lv int;
  v_mult numeric := 1;
  v_pay bigint;
  v_xp int := 0;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.job_settings where id = 1;
  select * into s from public.wallet_settings where id = 1;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;
  select * into run from public.job_runs where id = p_run and user_id = uid for update;
  if not found then return jsonb_build_object('status', 'run'); end if;
  select coalesce(xp, 0) into v_xp0 from public.job_skill where user_id = uid and job = run.job;
  v_xp0 := coalesce(v_xp0, 0);
  if run.ended_at is not null then
    v_lv := public.job_lv(v_xp0);
    return jsonb_build_object('status', case when coalesce(run.paid, 0) > 0 then 'ok' else 'fast' end,
      'paid', coalesce(run.paid, 0), 'xp', coalesce(run.xp, 0), 'lv', v_lv, 'up', false, 'coins', w.coins, 'ver', w.ver);
  end if;
  select * into k from public.job_kinds where id = run.job;
  v_sec := extract(epoch from now() - run.started_at);
  if v_sec < k.min_sec then
    update public.job_runs set ended_at = now(), score = v_score, paid = 0, xp = 0 where id = run.id;
    return jsonb_build_object('status', 'fast', 'coins', w.coins, 'ver', w.ver);
  end if;

  v_lv0 := public.job_lv(v_xp0);
  if run.mine then
    select mult into v_mult from public.job_levels where lv = v_lv0;
    v_xp := 1 + round(2 * v_score)::int;
  end if;
  select count(*) into v_today_n from public.job_runs
    where user_id = uid and paid > 0 and ended_at >= public.kst_day_start();
  if v_today_n < cfg.first_n then
    v_pay := cfg.first_pay;
  else
    v_pay := round(cfg.per_min * least(v_sec, k.std_sec) / 60.0 * coalesce(v_mult, 1) * (0.6 + 0.4 * v_score) / 10) * 10;
  end if;
  -- The day's earning cap (wallet_settings.earn_day_max) still holds.
  select coalesce(sum(l.n), 0) into v_today from public.coin_ledger l
    where l.user_id = uid and l.kind = 'earn' and l.at >= public.kst_day_start();
  if not exists (select 1 from public.operators o where o.user_id = uid) then
    v_pay := greatest(0, least(v_pay, s.earn_day_max - v_today));
  end if;

  insert into public.job_skill (user_id, job, xp, shifts) values (uid, run.job, v_xp, 1)
    on conflict (user_id, job) do update set xp = public.job_skill.xp + v_xp, shifts = public.job_skill.shifts + 1;
  v_lv := public.job_lv(v_xp0 + v_xp);
  update public.job_runs set ended_at = now(), score = v_score, paid = v_pay, xp = v_xp where id = run.id;
  if v_pay > 0 then
    update public.wallets set coins = coins + v_pay, ver = ver + 1, updated_at = now()
      where user_id = uid returning * into w;
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
      values (uid, run.id, 'earn', v_pay, v_pay, 'ok', 'ledger.job · ' || run.job || coalesce(' · ' || run.store, ''), w.coins, k.r);
  end if;
  return jsonb_build_object('status', 'ok', 'paid', v_pay, 'xp', v_xp, 'lv', v_lv, 'up', v_lv > v_lv0,
    'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.job_finish(uuid, numeric) from public, anon;
grant execute on function public.job_finish(uuid, numeric) to authenticated;

notify pgrst, 'reload schema';

-- Real hourly pay, by job (last 7 days). Breaks count: shifts less than 10
-- minutes apart are one sitting, and a sitting's hours run from its first
-- start to its last end.
--   with r as (select user_id, job, started_at, ended_at, paid,
--       case when started_at - lag(ended_at) over (partition by user_id order by started_at) < interval '10 minutes' then 0 else 1 end as fresh
--     from public.job_runs where ended_at is not null and started_at > now() - interval '7 days'),
--   g as (select *, sum(fresh) over (partition by user_id order by started_at) as sit from r),
--   s as (select user_id, sit, job, sum(paid) as paid, extract(epoch from max(ended_at) - min(started_at)) / 3600 as h
--     from g group by 1, 2, 3)
--   select job, count(*) as sittings, round(sum(paid) / nullif(sum(h), 0)) as won_an_hour from s group by job;
