-- Home visits: walk into someone else's home at Forest Lane Apartments.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql (player_names), 006_friends.sql (are_friends) and
-- 019_chat_names.sql (chat_ids). Before this is run, homes stay private
-- (the game keeps you alone in your home, as before).
--
-- How it works:
--   Each player picks who may visit: everyone ('all'), friends only
--   ('friends', the default) or nobody ('none'). While you are inside your
--   home with visits open, your game keeps one row in home_open saying so
--   (refreshed every minute, removed when you leave). At the apartment door
--   other players ask open_homes() which homes they may walk into right now:
--   'all' homes, and 'friends' homes of their friends. Rows older than two
--   minutes count as closed (a game that closed without saying goodbye).
--   When a visitor walks in, the host's game asks home_guest_ok() whether
--   that visitor may stay, so a changed game can't walk into a friends-only
--   home by name alone.
--   The furniture is sent from the host's game to the visitors over the
--   room's realtime channel; nothing about the layout is stored here.

create table if not exists public.home_open (
  user_id uuid primary key references auth.users (id) on delete cascade,
  net_id text not null check (char_length(net_id) between 1 and 64),
  visit text not null check (visit in ('all', 'friends')),
  updated_at timestamptz not null default now()
);
create index if not exists home_open_updated_idx on public.home_open (updated_at);
alter table public.home_open enable row level security;
revoke all on public.home_open from anon, authenticated;

-- "I'm home, and this is who may visit." net_id must be this page's player
-- id (chat_claim). visit 'none' closes the home. 'ok', 'id' or 'signin'.
create or replace function public.home_open_set(p_net text, p_visit text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'signin'; end if;
  if p_visit not in ('all', 'friends') then
    delete from public.home_open where user_id = auth.uid();
    return 'ok';
  end if;
  if not exists (select 1 from public.chat_ids c where c.net_id = p_net and c.user_id = auth.uid()) then return 'id'; end if;
  insert into public.home_open (user_id, net_id, visit, updated_at) values (auth.uid(), p_net, p_visit, now())
  on conflict (user_id) do update set net_id = excluded.net_id, visit = excluded.visit, updated_at = now();
  if random() < 0.02 then delete from public.home_open where updated_at < now() - interval '1 day'; end if;
  return 'ok';
end $$;
revoke all on function public.home_open_set(text, text) from public, anon;
grant execute on function public.home_open_set(text, text) to authenticated;

-- "I left my home."
create or replace function public.home_close() returns void
language sql security definer set search_path = public as $$
  delete from public.home_open where user_id = auth.uid();
$$;
revoke all on function public.home_close() from public, anon;
grant execute on function public.home_close() to authenticated;

-- Homes I may walk into right now: friends first, then the newest.
create or replace function public.open_homes()
returns table (net_id text, name text, friend boolean)
language sql stable security definer set search_path = public as $$
  select h.net_id, coalesce(n.name, '?'), public.are_friends(h.user_id, auth.uid())
  from public.home_open h left join public.player_names n on n.user_id = h.user_id
  where auth.uid() is not null
    and h.user_id <> auth.uid()
    and h.updated_at > now() - interval '2 minutes'
    and (h.visit = 'all' or public.are_friends(h.user_id, auth.uid()))
  order by 3 desc, h.updated_at desc
  limit 20;
$$;
revoke all on function public.open_homes() from public, anon;
grant execute on function public.open_homes() to authenticated;

-- Asked by the host's game when someone walks in: may this player id stay?
create or replace function public.home_guest_ok(p_guest_net text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.home_open h
    join public.chat_ids c on c.net_id = p_guest_net
    where h.user_id = auth.uid()
      and c.user_id <> auth.uid()
      and (h.visit = 'all' or public.are_friends(h.user_id, c.user_id))
  );
$$;
revoke all on function public.home_guest_ok(text) from public, anon;
grant execute on function public.home_guest_ok(text) to authenticated;
