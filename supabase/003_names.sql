-- Unique player names: one row per account with the name it uses. Two
-- accounts can't use the same name (ignoring upper/lower case and spaces).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- The game calls claim_name('새이름') when you pick or change your name:
-- 'ok' (the name is now yours; your old one is free again) or 'taken'.
-- To take a name away from someone (a rule-breaking name), delete their row
-- in Table Editor → player_names, or change "name".

create table if not exists public.player_names (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  name_key text not null unique,
  updated_at timestamptz not null default now()
);

-- The same name for comparing: lower case, no spaces.
create or replace function public.name_key(n text) returns text
language sql immutable as $$
  select lower(regexp_replace(coalesce(n, ''), '\s+', '', 'g'));
$$;

create or replace function public.claim_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  k text := public.name_key(new_name);
  n text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then return 'signin'; end if;
  if k = '' or char_length(n) > 16 then return 'invalid'; end if;
  if exists (select 1 from public.player_names where name_key = k and user_id <> auth.uid()) then
    return 'taken';
  end if;
  insert into public.player_names (user_id, name, name_key, updated_at)
  values (auth.uid(), n, k, now())
  on conflict (user_id) do update set name = excluded.name, name_key = excluded.name_key, updated_at = now();
  return 'ok';
exception when unique_violation then
  return 'taken'; -- someone took it at the same moment
end $$;

-- Only claim_name writes; nobody reads the table from the game.
alter table public.player_names enable row level security;
revoke all on public.player_names from anon, authenticated;
grant execute on function public.claim_name(text) to anon, authenticated;
