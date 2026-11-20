-- 061: love locks for two (Yozi 2026-11-20). Two friends at the Namsan
-- summit hang one lock with both names on it and split the price.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- How it goes (src/core/love-locks.js, src/ui/love-lock-ui.js):
--   1. The host writes the note and picks a friend standing next to them.
--      The friend's game shows the note; the friend taps Accept, and their
--      game calls love_lock_pair_ok: the server keeps the yes for this note
--      (its shape and text) for 5 minutes. Nothing is paid yet.
--   2. The host's game calls hang_love_lock_pair: the server checks the
--      friend's yes (same note), takes half the price from each wallet and
--      saves the lock, all in one step. Either both pay and the lock is up,
--      or nobody pays.
--   3. The friend's game calls love_lock_pair_ok again: it answers 'hung'
--      with the friend's new balance, so their wallet shows what they paid.
-- Before this file is run, the game shows only the one-person lock.

alter table public.love_locks add column if not exists name2 text
  check (name2 is null or char_length(name2) between 1 and 16);
alter table public.love_locks add column if not exists partner_id uuid
  references auth.users (id) on delete set null;
grant select (id, shape, name, body, created_at, name2) on public.love_locks to anon, authenticated;

create table if not exists public.love_lock_pair_ok (
  request_id uuid primary key,
  host_id uuid not null references auth.users (id) on delete cascade,
  partner_id uuid not null references auth.users (id) on delete cascade,
  shape text not null,
  body_md5 text not null,
  at timestamptz not null default now()
);
alter table public.love_lock_pair_ok enable row level security;
revoke all on public.love_lock_pair_ok from anon, authenticated;

-- The note as hang_love_lock keeps it (line breaks as \n).
create or replace function public.love_lock_clean(p_body text) returns text
language sql immutable as $$
  select regexp_replace(coalesce(p_body, ''), E'\r\n?', E'\n', 'g');
$$;

-- The friend says yes to the host's note. p_host: the host's player id on
-- the page (chat_ids.net_id, like gift_bind). Answers:
--   ok (yes kept; 'half': what I'll pay), hung (already up: my 'coins',
--   'ver', 'paid' and the lock), signin, who (no such player), self,
--   friend (not friends), nosave (no wallet), shape, empty, lines, chars.
create or replace function public.love_lock_pair_ok(p_request_id uuid, p_host text, p_shape text, p_body text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_host uuid;
  v_body text := public.love_lock_clean(p_body);
  w public.wallets;
  cfg public.love_lock_settings;
  v_lock public.love_locks;
  v_paid bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select c.user_id into v_host from public.chat_ids c where c.net_id = p_host;
  if v_host is null then return jsonb_build_object('status', 'who'); end if;
  if v_host = uid then return jsonb_build_object('status', 'self'); end if;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  select * into v_lock from public.love_locks where user_id = v_host and request_id = p_request_id and partner_id = uid;
  if found then
    select -n into v_paid from public.coin_ledger where user_id = uid and op_id = p_request_id;
    return jsonb_build_object('status', 'hung', 'coins', w.coins, 'ver', w.ver, 'paid', coalesce(v_paid, 0),
      'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'name2', v_lock.name2, 'body', v_lock.body, 'created_at', v_lock.created_at));
  end if;

  if not public.are_friends(uid, v_host) then return jsonb_build_object('status', 'friend'); end if;
  if p_shape not in ('heart', 'circle', 'square', 'star') then return jsonb_build_object('status', 'shape'); end if;
  if btrim(v_body, E' \t\n') = '' then return jsonb_build_object('status', 'empty'); end if;
  if array_length(string_to_array(v_body, E'\n'), 1) > 20 then return jsonb_build_object('status', 'lines'); end if;
  if char_length(v_body) > 200 then return jsonb_build_object('status', 'chars'); end if;

  insert into public.love_lock_pair_ok (request_id, host_id, partner_id, shape, body_md5, at)
    values (p_request_id, v_host, uid, p_shape, md5(v_body), now())
    on conflict (request_id) do update set shape = excluded.shape, body_md5 = excluded.body_md5, at = now()
    where love_lock_pair_ok.host_id = v_host and love_lock_pair_ok.partner_id = uid;
  delete from public.love_lock_pair_ok where at < now() - interval '1 day';

  select * into cfg from public.love_lock_settings where id = 1;
  return jsonb_build_object('status', 'ok', 'half', cfg.price / 2, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.love_lock_pair_ok(uuid, text, text, text) from public, anon;
grant execute on function public.love_lock_pair_ok(uuid, text, text, text) to authenticated;

-- The host hangs the lock for both. p_partner: the friend's player id on the
-- page; p_price: the whole price the game showed (each pays half; an odd
-- won goes to the host). Answers like hang_love_lock, plus:
--   who, friend, waiting (no yes from the friend for this note in the last
--   5 minutes), partner_coins (the friend hasn't got their half).
create or replace function public.hang_love_lock_pair(
  p_request_id uuid, p_partner text, p_shape text, p_name text, p_body text, p_price int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_partner uuid;
  cfg public.love_lock_settings;
  w public.wallets;
  w2 public.wallets;
  v_body text := public.love_lock_clean(p_body);
  v_who text;
  v_who2 text;
  v_lock public.love_locks;
  v_half2 bigint;
  v_half1 bigint;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_shape not in ('heart', 'circle', 'square', 'star') then return jsonb_build_object('status', 'shape'); end if;
  if btrim(v_body, E' \t\n') = '' then return jsonb_build_object('status', 'empty'); end if;
  if array_length(string_to_array(v_body, E'\n'), 1) > 20 then return jsonb_build_object('status', 'lines'); end if;
  if char_length(v_body) > 200 then return jsonb_build_object('status', 'chars'); end if;
  select c.user_id into v_partner from public.chat_ids c where c.net_id = p_partner;
  if v_partner is null or v_partner = uid then return jsonb_build_object('status', 'who'); end if;
  if not public.are_friends(uid, v_partner) then return jsonb_build_object('status', 'friend'); end if;

  -- Lock both wallets, always in the same order (no deadlock).
  perform 1 from public.wallets where user_id in (uid, v_partner) order by user_id for update;
  select * into w from public.wallets where user_id = uid;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Hand back the same lock and take nothing.
  select * into v_lock from public.love_locks where user_id = uid and request_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', v_lock.price, 'paid', 0, 'coins', w.coins, 'ver', w.ver,
      'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'name2', v_lock.name2, 'body', v_lock.body, 'created_at', v_lock.created_at));
  end if;

  if not exists (select 1 from public.love_lock_pair_ok k where k.request_id = p_request_id and k.host_id = uid
      and k.partner_id = v_partner and k.shape = p_shape and k.body_md5 = md5(v_body) and k.at > now() - interval '5 minutes') then
    return jsonb_build_object('status', 'waiting');
  end if;
  select * into w2 from public.wallets where user_id = v_partner;
  if not found then return jsonb_build_object('status', 'partner_coins'); end if;

  select * into cfg from public.love_lock_settings where id = 1;
  if p_price is distinct from cfg.price and p_price::bigint * 1000 is distinct from cfg.price then
    return jsonb_build_object('status', 'price', 'price', cfg.price);
  end if;
  if (select count(*) from public.love_locks where user_id = uid
      and created_at >= public.kst_day_start()) >= cfg.daily_limit then
    return jsonb_build_object('status', 'limit');
  end if;
  v_half2 := cfg.price / 2;
  v_half1 := cfg.price - v_half2;
  if w.coins < v_half1 then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;
  if w2.coins < v_half2 then return jsonb_build_object('status', 'partner_coins'); end if;

  update public.wallets set coins = coins - v_half1, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'lock', -v_half1, -v_half1, 'ok', 'love lock for two', w.coins)
    on conflict (user_id, op_id) do nothing;
  update public.wallets set coins = coins - v_half2, ver = ver + 1, updated_at = now()
    where user_id = v_partner returning * into w2;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (v_partner, p_request_id, 'lock', -v_half2, -v_half2, 'ok', 'love lock for two', w2.coins)
    on conflict (user_id, op_id) do nothing;

  -- The names these accounts claimed (003_names.sql), else the one sent.
  v_who := coalesce((select name from public.player_names where user_id = uid), nullif(btrim(left(coalesce(p_name, ''), 16)), ''), '?');
  v_who2 := coalesce((select name from public.player_names where user_id = v_partner), '?');
  insert into public.love_locks (user_id, request_id, shape, name, body, price, name2, partner_id)
    values (uid, p_request_id, p_shape, v_who, v_body, cfg.price, v_who2, v_partner)
    returning * into v_lock;
  delete from public.love_lock_pair_ok where request_id = p_request_id;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_lock.price, 'paid', v_half1, 'coins', w.coins, 'ver', w.ver,
    'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'name2', v_lock.name2, 'body', v_lock.body, 'created_at', v_lock.created_at));
end $$;
revoke all on function public.hang_love_lock_pair(uuid, text, text, text, text, int) from public, anon;
grant execute on function public.hang_love_lock_pair(uuid, text, text, text, text, int) to authenticated;
