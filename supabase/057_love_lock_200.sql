-- 057: love-lock notes up to 200 characters (was 1000). Yozi 2026-11-19.
--
-- Only new locks are checked: the limit lives in hang_love_lock, the one way
-- in. The table's CHECK (1..1000, 007_love_locks.sql) stays as it is, so locks
-- already hung with more than 200 characters keep their text and can still be
-- hidden by the operator (a tighter CHECK, even NOT VALID, would refuse any
-- update to those rows). Same function as 018_won.sql apart from the limit.
create or replace function public.hang_love_lock(
  p_request_id uuid, p_shape text, p_name text, p_body text, p_price int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cfg public.love_lock_settings;
  w public.wallets;
  v_body text := regexp_replace(coalesce(p_body, ''), E'\r\n?', E'\n', 'g');
  v_who text;
  v_lock public.love_locks;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  if p_shape not in ('heart', 'circle', 'square', 'star') then return jsonb_build_object('status', 'shape'); end if;
  if btrim(v_body, E' \t\n') = '' then return jsonb_build_object('status', 'empty'); end if;
  if array_length(string_to_array(v_body, E'\n'), 1) > 20 then return jsonb_build_object('status', 'lines'); end if;
  if char_length(v_body) > 200 then return jsonb_build_object('status', 'chars'); end if;

  -- Lock this player's wallet: two taps at once run one after the other.
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'nosave'); end if;

  -- Sent before? Hand back the same lock and take nothing.
  select * into v_lock from public.love_locks where user_id = uid and request_id = p_request_id;
  if found then
    return jsonb_build_object('status', 'ok', 'charged', false, 'price', v_lock.price, 'coins', w.coins, 'ver', w.ver,
      'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
  end if;

  select * into cfg from public.love_lock_settings where id = 1;
  if p_price is distinct from cfg.price and p_price::bigint * 1000 is distinct from cfg.price then
    return jsonb_build_object('status', 'price', 'price', cfg.price);
  end if;
  if (select count(*) from public.love_locks where user_id = uid
      and created_at >= public.kst_day_start()) >= cfg.daily_limit then
    return jsonb_build_object('status', 'limit');
  end if;
  if w.coins < cfg.price then return jsonb_build_object('status', 'coins', 'coins', w.coins, 'ver', w.ver); end if;

  update public.wallets set coins = coins - cfg.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, bal)
    values (uid, p_request_id, 'lock', -cfg.price, -cfg.price, 'ok', 'love lock', w.coins)
    on conflict (user_id, op_id) do nothing;

  -- The name this account claimed (003_names.sql), else the one sent.
  v_who := coalesce((select name from public.player_names where user_id = uid), nullif(btrim(left(coalesce(p_name, ''), 16)), ''), '?');
  insert into public.love_locks (user_id, request_id, shape, name, body, price)
    values (uid, p_request_id, p_shape, v_who, v_body, cfg.price)
    returning * into v_lock;
  return jsonb_build_object('status', 'ok', 'charged', true, 'price', v_lock.price, 'coins', w.coins, 'ver', w.ver,
    'lock', jsonb_build_object('id', v_lock.id, 'shape', v_lock.shape, 'name', v_lock.name, 'body', v_lock.body, 'created_at', v_lock.created_at));
end $$;
revoke all on function public.hang_love_lock(uuid, text, text, text, int) from public, anon;
grant execute on function public.hang_love_lock(uuid, text, text, text, int) to authenticated;
