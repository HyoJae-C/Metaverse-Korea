-- Operator badge (🛡️ 운영자) on the name tag, that nobody can fake.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Needs 003_names.sql (player_names).
--
-- How it works: the operator types the master code in chat ("/<code>") to
-- switch the badge on or off. Other players' games then ask the server
-- is_operator('<name>'), and only show the badge when that name belongs to
-- an account listed in "operators". Someone copying the badge sees it only
-- on their own screen.
--
-- Make yourself an operator (once): Table Editor → player_names → find your
-- player name → copy its user_id → Table Editor → operators → Insert row →
-- paste it as user_id → Save. Delete the row to stop being one.
--
-- Also: claim_name now refuses official-looking names (운영자, 관리자, admin…),
-- the same list the game checks.

create table if not exists public.operators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
alter table public.operators enable row level security;
revoke all on public.operators from anon, authenticated;

-- Is this player name an operator's? Answers only yes or no.
create or replace function public.is_operator(player_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.player_names n
    join public.operators o on o.user_id = n.user_id
    where n.name_key = public.name_key(player_name)
  );
$$;
grant execute on function public.is_operator(text) to anon, authenticated;

-- Official-looking names (keep in step with src/core/identity.js).
create or replace function public.reserved_name(n text) returns boolean
language sql immutable as $$
  select public.name_key(n) ~* '(운영자|운영진|운영팀|관리자|개발자|admin|operator|moderator|official|staff|developer|^gm[0-9]*$)';
$$;

create or replace function public.claim_name(new_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  k text := public.name_key(new_name);
  n text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then return 'signin'; end if;
  if k = '' or char_length(n) > 16 then return 'invalid'; end if;
  -- Operators may keep any name; everyone else can't look official.
  if public.reserved_name(n) and not exists (select 1 from public.operators where user_id = auth.uid()) then
    return 'taken';
  end if;
  if exists (select 1 from public.player_names where name_key = k and user_id <> auth.uid()) then
    return 'taken';
  end if;
  insert into public.player_names (user_id, name, name_key, updated_at)
  values (auth.uid(), n, k, now())
  on conflict (user_id) do update set name = excluded.name, name_key = excluded.name_key, updated_at = now();
  return 'ok';
exception when unique_violation then
  return 'taken';
end $$;
