-- 052: 5 seasoning (정성 양념) a day with the check-in, and no daily limit
-- on tries to make dishes tastier (Yozi 2026-11-17). Run after 051. Safe to
-- run again.
--
-- The game claims 'daily' when you check in, and on opening the game if you
-- already checked in today (so people who checked in before this went live
-- get today's 5 too). Once a day (KST), with a receipt in seasoning_ledger.
--
-- Check:
--   select count(*), sum(n) from public.seasoning_ledger where kind = 'daily' and at >= public.kst_day_start();
-- Change the amount, or bring back a daily try limit (1000 = none):
--   update public.upgrade_config set daily_n = 5, daily_tries = 1000;

alter table public.upgrade_config add column if not exists daily_n int not null default 5 check (daily_n between 0 and 100);
update public.upgrade_config set daily_tries = 1000 where id = 1;

alter table public.seasoning_ledger drop constraint if exists seasoning_ledger_kind_check;
alter table public.seasoning_ledger add constraint seasoning_ledger_kind_check check (kind in ('start', 'daily', 'mission', 'class', 'upgrade', 'grant'));

-- The day's seasoning: kind 'daily' (the day's check-in, once a day),
-- 'mission' (all missions done, once a day) or 'class' (a dish cooked, once
-- a day per kind). → { status: 'ok', granted, n }
create or replace function public.seasoning_claim(p_request_id uuid, p_kind text, p_dish text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.upgrade_config;
  v_n int;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into cfg from public.upgrade_config where id = 1;
  insert into public.seasonings (user_id, n) values (uid, 0) on conflict (user_id) do nothing;
  perform 1 from public.seasonings where user_id = uid for update;
  select n into v_n from public.seasonings where user_id = uid;
  if exists (select 1 from public.seasoning_ledger where user_id = uid and op_id = p_request_id) then
    return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
  end if;
  if p_kind = 'daily' then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'daily' and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'daily', cfg.daily_n, 'check-in');
    return jsonb_build_object('status', 'ok', 'granted', cfg.daily_n, 'n', v_n);
  elsif p_kind = 'mission' then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'mission' and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'mission', cfg.mission_n, 'mission');
    return jsonb_build_object('status', 'ok', 'granted', cfg.mission_n, 'n', v_n);
  elsif p_kind = 'class' and p_dish ~ '^[a-z]{2,24}$' then
    if exists (select 1 from public.seasoning_ledger where user_id = uid and kind = 'class' and note = p_dish and at >= public.kst_day_start()) then
      return jsonb_build_object('status', 'ok', 'granted', 0, 'n', v_n);
    end if;
    v_n := public.seasoning_add(uid, p_request_id, 'class', cfg.class_n, p_dish);
    return jsonb_build_object('status', 'ok', 'granted', cfg.class_n, 'n', v_n);
  end if;
  return jsonb_build_object('status', 'kind');
end $$;
revoke all on function public.seasoning_claim(uuid, text, text) from public, anon;
grant execute on function public.seasoning_claim(uuid, text, text) to authenticated;
