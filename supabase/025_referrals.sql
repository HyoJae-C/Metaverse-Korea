-- 025: friend invites (run once, after 020_rewards.sql). Safe to run again.
--
-- When a new player makes their character they can type the name of the
-- friend who told them about the game (optional). That friend gets
-- ₩15,000. Everything is decided here on the server; the game only sends
-- the name.
--
-- Rules (numbers are in wallet_settings, see below):
--   * one invite per account, ever (referrals.user_id is the primary key);
--   * only while the account is new: referral_hours (24) after it was made;
--   * not your own name;
--   * a friend is paid for at most referral_day (5) invites a Korean day and
--     referral_max (50) ever. An invite past the limit is still recorded,
--     with nothing paid. Accounts are free guests, so without these limits
--     opening private windows would print money.
--   * the money goes straight into the friend's server wallet, with a line in
--     coin_ledger (kind 'referral', r 'referral'), so it isn't counted in
--     their daily earning cap and isn't something wallet_apply can be asked
--     for (it is not in reward_rules).
--
-- The friend hears about it the next time the game asks referral_news():
-- "🎁 <name> joined! +₩15,000".
--
-- To change the numbers later:
--   update public.wallet_settings set referral_reward = 20000, referral_day = 3 where id = 1;
-- Who invited the most people:
--   select p.name, count(*), sum(r.paid) from public.referrals r
--   left join public.player_names p on p.user_id = r.referrer
--   group by p.name order by 2 desc limit 20;
-- Invites today:
--   select count(*), sum(paid) from public.referrals where at >= public.kst_day_start();

alter table public.wallet_settings add column if not exists referral_reward bigint not null default 15000;
alter table public.wallet_settings add column if not exists referral_day int not null default 5;
alter table public.wallet_settings add column if not exists referral_max int not null default 50;
alter table public.wallet_settings add column if not exists referral_hours int not null default 24;

create table if not exists public.referrals (
  user_id uuid primary key references auth.users (id) on delete cascade, -- the new player
  referrer uuid not null references auth.users (id) on delete cascade,  -- the friend they named
  paid bigint not null default 0,  -- won given to the friend
  status text not null,            -- ok, cap (friend's limit reached), nowallet (friend has no server wallet)
  seen boolean not null default false, -- the friend has been told
  at timestamptz not null default now()
);
create index if not exists referrals_referrer on public.referrals (referrer, at);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;

-- Name the friend who invited you. Returns { status, paid }: status is
-- ok (friend paid, or their limit was reached: still counted as done),
-- done (this account named someone before), late (the account is too old),
-- nobody (no player has that name), self, invalid, signin.
create or replace function public.claim_referral(friend_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.wallet_settings;
  w public.wallets;
  k text := public.name_key(friend_name);
  v_made timestamptz;
  v_friend uuid;
  v_day int;
  v_all int;
  v_paid bigint := 0;
  v_st text := 'ok';
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if k = '' or char_length(k) > 16 then return jsonb_build_object('status', 'invalid'); end if;
  if exists (select 1 from public.referrals where user_id = uid) then
    return jsonb_build_object('status', 'done');
  end if;
  select * into s from public.wallet_settings where id = 1;
  select u.created_at into v_made from auth.users u where u.id = uid;
  if v_made is null or v_made < now() - make_interval(hours => s.referral_hours) then
    return jsonb_build_object('status', 'late');
  end if;
  select p.user_id into v_friend from public.player_names p where p.name_key = k;
  if v_friend is null then return jsonb_build_object('status', 'nobody'); end if;
  if v_friend = uid then return jsonb_build_object('status', 'self'); end if;

  select * into w from public.wallets where user_id = v_friend for update;
  if not found then
    v_st := 'nowallet';
  else
    select count(*) filter (where r.at >= public.kst_day_start()), count(*)
      into v_day, v_all
      from public.referrals r where r.referrer = v_friend and r.paid > 0;
    if v_day >= s.referral_day or v_all >= s.referral_max then
      v_st := 'cap';
    else
      v_paid := greatest(0, s.referral_reward);
    end if;
  end if;

  insert into public.referrals (user_id, referrer, paid, status) values (uid, v_friend, v_paid, v_st);
  if v_paid > 0 then
    update public.wallets set coins = coins + v_paid, ver = ver + 1, updated_at = now()
      where user_id = v_friend returning * into w;
    -- op_id: the new player's id, so one invite can only ever pay once.
    insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal, r)
      values (v_friend, uid, 'referral', v_paid, v_paid, 'ok', 'friend invite', w.coins, 'referral');
  end if;
  return jsonb_build_object('status', 'ok', 'paid', v_paid);
exception when unique_violation then
  return jsonb_build_object('status', 'done'); -- sent twice at the same moment
end $$;
revoke all on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;

-- Invites that paid me and I haven't been told about yet (marks them told).
-- Returns { status, items: [{ name, n }], coins, ver }.
create or replace function public.referral_news() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_items jsonb;
  w public.wallets;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  with picked as (
    select r.user_id from public.referrals r
    where r.referrer = uid and not r.seen and r.paid > 0
    order by r.at limit 20
  ), told as (
    update public.referrals r set seen = true
    from picked where r.user_id = picked.user_id
    returning r.user_id, r.paid, r.at
  )
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, ''), 'n', told.paid) order by told.at), '[]'::jsonb)
    into v_items
    from told left join public.player_names p on p.user_id = told.user_id;
  select * into w from public.wallets where user_id = uid;
  return jsonb_build_object('status', 'ok', 'items', v_items, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.referral_news() from public, anon;
grant execute on function public.referral_news() to authenticated;
