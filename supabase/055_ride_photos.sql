-- 055: receipts for ride photos (Yozi 2026-11-18). The Jelly Flume takes a
-- free photo of you on the big drop; it goes in your bag and can stand in a
-- frame at home. Every item keeps a receipt on the server (Yozi
-- 2026-11-11), so the game reports each photo here once, with the ride's
-- payment on the coin ledger (null when the ride was on a ticket or the
-- day pass). The picture itself stays in the player's save (mk.photos).
-- Safe to run again.
--
-- Check:
--   select count(*), count(distinct user_id) from public.ride_photos;
--   select * from public.ride_photos order by at desc limit 20;

create table if not exists public.ride_photos (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ride text not null check (ride in ('flume')),
  ride_op uuid,
  at timestamptz not null default now()
);
create index if not exists ride_photos_user_at on public.ride_photos (user_id, at desc);
alter table public.ride_photos enable row level security;
-- (no policies: only the function below writes, and the operator reads)

-- One photo's receipt. → 'ok' (also when it was already there), 'signin',
-- 'ride', or 'limit' (more than 60 photos in a day: not a real ride).
create or replace function public.photo_receipt(p_id uuid, p_ride text, p_op uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return 'signin'; end if;
  if p_ride is distinct from 'flume' then return 'ride'; end if;
  if exists (select 1 from public.ride_photos where id = p_id and user_id = uid) then return 'ok'; end if;
  if (select count(*) from public.ride_photos where user_id = uid and at > now() - interval '1 day') >= 60 then return 'limit'; end if;
  insert into public.ride_photos (id, user_id, ride, ride_op) values (p_id, uid, p_ride, p_op) on conflict (id) do nothing;
  return 'ok';
end $$;
revoke all on function public.photo_receipt(uuid, text, uuid) from public, anon;
grant execute on function public.photo_receipt(uuid, text, uuid) to authenticated;
