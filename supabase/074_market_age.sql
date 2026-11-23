-- 074: Potato Market (listing and buying) needs the same as sending a gift:
-- an account at least 7 days old that has done 35 daily missions (Yozi
-- 2026-11-24, "둘다 막아"). Run once, after 073: Supabase → SQL Editor → New
-- query → paste → Run. Safe to run again.
--
-- Why: an old account could put any clothes up at 100% of the new price and a
-- new account could buy them with its 1,000,000 welcome coins a day later, so
-- the money moved (less the 5% fee). market_min_hours (24) used to be the
-- only rule; now market_old_enough is gift_ready (073), so both rules are one
-- setting: wallet_settings.gift_min_days / gift_min_missions. Operators are
-- still not held back. market_info tells the game the two numbers, for its
-- "not yet" message. (market_min_hours stays in the table, unused.)

create or replace function public.market_old_enough(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.gift_ready(p_uid);
$$;
revoke all on function public.market_old_enough(uuid) from public, anon, authenticated;

create or replace function public.market_info() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('min_pct', market_min_pct, 'max_pct', market_max_pct, 'fee_pct', market_fee_pct,
                            'days', market_days, 'open_max', market_open_max, 'min_hours', market_min_hours,
                            'min_days', gift_min_days, 'min_missions', gift_min_missions,
                            'unit', unit)
  from public.wallet_settings where id = 1;
$$;

-- Check: who may use the market now
-- select count(*) from auth.users u where public.market_old_enough(u.id);
