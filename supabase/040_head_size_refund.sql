-- 040: money back for the clinics' face size (run once, BEFORE the game
-- update that takes the option out). Run in the Supabase dashboard: SQL
-- Editor → New query → paste → Run. Safe to run again.
--
-- Yozi (2026-11-11): the clinics now change the eyes, nose and jaw only;
-- every head is one size (the old "smaller" one), so hats and glasses fit.
-- Whoever had paid for a smaller or bigger face gets its price back once
-- (₩45,000), with a line in coin_ledger.
--
-- Who: the accounts whose saved look (now, or in the 2026-11-11 backup) had
-- a changed face size, written down here when this runs, so a save edited
-- later can't ask. The game asks once (mk.headRefund) and shows a notice.
--
-- To see what was paid:
--   select count(*), sum(n) from public.coin_ledger where note = 'ledger.headRefund';

create table if not exists public.head_size_refunds (
  user_id uuid primary key references auth.users (id) on delete cascade,
  price bigint not null default 45000,
  at timestamptz not null default now()
);
alter table public.head_size_refunds enable row level security; -- only the function below touches it
revoke all on public.head_size_refunds from anon, authenticated;

-- The saved look is JSON text inside the save (key mk.look).
create or replace function public.look_had_head_size(p_data jsonb) returns boolean
language plpgsql immutable set search_path = public as $$
declare v text;
begin
  begin
    v := (p_data ->> 'mk.look')::jsonb ->> 'small';
  exception when others then return false;
  end;
  return v in ('small', 'big', 'true');
end $$;
revoke all on function public.look_had_head_size(jsonb) from public, anon, authenticated;

insert into public.head_size_refunds (user_id)
select s.user_id from public.saves s where public.look_had_head_size(s.data)
on conflict (user_id) do nothing;
do $$ begin
  if to_regclass('public.saves_backup_20261111') is not null then
    insert into public.head_size_refunds (user_id)
    select b.user_id from public.saves_backup_20261111 b
    where public.look_had_head_size(b.data) and exists (select 1 from auth.users u where u.id = b.user_id)
    on conflict (user_id) do nothing;
  end if;
end $$;

-- Once per account: { status, n (won paid), coins, ver }. ok (paid now),
-- done (paid before), none (never changed the face size), signin.
create or replace function public.head_size_refund() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r public.head_size_refunds;
  w public.wallets;
  v_op uuid;
begin
  if uid is null then return jsonb_build_object('status', 'signin'); end if;
  select * into r from public.head_size_refunds where user_id = uid;
  if not found then return jsonb_build_object('status', 'none'); end if;
  select * into w from public.wallets where user_id = uid for update;
  if not found then return jsonb_build_object('status', 'signin'); end if;
  v_op := md5('head-size-refund-2026-11-11:' || uid::text)::uuid; -- one fixed op per account: never paid twice
  if exists (select 1 from public.coin_ledger where user_id = uid and op_id = v_op) then
    return jsonb_build_object('status', 'done', 'coins', w.coins, 'ver', w.ver);
  end if;
  update public.wallets set coins = coins + r.price, ver = ver + 1, updated_at = now()
    where user_id = uid returning * into w;
  insert into public.coin_ledger (user_id, op_id, kind, asked, n, status, note, ref, bal)
    values (uid, v_op, 'bonus', r.price, r.price, 'ok', 'ledger.headRefund', null, w.coins);
  return jsonb_build_object('status', 'ok', 'n', r.price, 'coins', w.coins, 'ver', w.ver);
end $$;
revoke all on function public.head_size_refund() from public, anon;
grant execute on function public.head_size_refund() to authenticated;
