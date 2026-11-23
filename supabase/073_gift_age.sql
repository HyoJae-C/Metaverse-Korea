-- 073: sending a gift needs an account at least 7 days old and 3 hours of
-- real play (Yozi 2026-11-24). Run once, after 072: Supabase → SQL Editor →
-- New query → paste → Run. Safe to run again.
--
-- Why: a new account could earn coins and pass them to another account as
-- gifts. The rule is for the giver; anyone can still receive.
--   * days:  auth.users.created_at at least gift_min_days (7) ago
--   * hours: play time (play_time_totals + play_sessions, as in 031) at least
--            gift_min_hours (3)
--   * operators are not held back.
-- Both live in wallet_settings so they can be changed without a release:
--   update public.wallet_settings set gift_min_days = 7, gift_min_hours = 3 where id = 1;
--   (0 and 0 turns the rule off.)
--
-- The game asks gift_wait() before showing the gift picker or wrapping a
-- box. wallet_apply refuses a gift payment (a 🎁 in its note: shop gifts and
-- 🎀 boxes) from an account that isn't ready, status 'young', so an older
-- game or a made-up request can't get round it (the coins stay put).

alter table public.wallet_settings add column if not exists gift_min_days int not null default 7;
alter table public.wallet_settings add column if not exists gift_min_hours numeric not null default 3;

-- Hours p_uid has played (all time).
create or replace function public.play_hours(p_uid uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select (coalesce((select t.seconds from public.play_time_totals t where t.user_id = p_uid), 0)
        + coalesce((select sum(greatest(extract(epoch from s.last_at - s.started_at), 0)) from public.play_sessions s
                    where s.user_id = p_uid), 0)) / 3600.0;
$$;
revoke all on function public.play_hours(uuid) from public, anon, authenticated;

-- Whether p_uid may send gifts now.
create or replace function public.gift_ready(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.operators o where o.user_id = p_uid)
      or coalesce((select u.created_at <= now() - make_interval(days => s.gift_min_days)
                          and public.play_hours(p_uid) >= s.gift_min_hours
                   from auth.users u, public.wallet_settings s where u.id = p_uid and s.id = 1), false);
$$;
revoke all on function public.gift_ready(uuid) from public, anon, authenticated;

-- For the game: { ok, days, hours, min_days, min_hours }: days since the
-- account was made and hours played (whole and one decimal), and the rule.
create or replace function public.gift_wait() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ok', public.gift_ready(u.id),
    'days', floor(extract(epoch from now() - u.created_at) / 86400)::int,
    'hours', round(public.play_hours(u.id), 1),
    'min_days', s.gift_min_days, 'min_hours', s.gift_min_hours)
  from auth.users u, public.wallet_settings s where u.id = auth.uid() and s.id = 1;
$$;
revoke all on function public.gift_wait() from public, anon;
grant execute on function public.gift_wait() to authenticated;

-- wallet_apply as it is now, with one more check on a gift payment. The
-- function is long and has been changed by several files; this edits the live
-- one in place (and stops with an error if its spend line isn't found), so
-- nothing else in it changes.
do $do$
declare
  d text := pg_get_functiondef('public.wallet_apply(jsonb)'::regprocedure);
  old_line text := $x$if w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;$x$;
  new_line text := $x$if coalesce(op ->> 'note', '') like '%🎁%' and not v_free and not public.gift_ready(uid) then v_st := 'young'; -- 073: gifts need 7 days and 3 hours
      elsif w.coins >= -v_asked then v_n := v_asked; else v_st := 'poor'; end if;$x$;
begin
  if position('gift_ready(uid)' in d) > 0 then return; end if; -- run before
  if position(old_line in d) = 0 then raise exception '073: wallet_apply spend line not found'; end if;
  execute replace(d, old_line, new_line);
end $do$;

-- Check: select public.gift_wait();  (as a player)  /  who can send now:
-- select count(*) from auth.users u where public.gift_ready(u.id);
