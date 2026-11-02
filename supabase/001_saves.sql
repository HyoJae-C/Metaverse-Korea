-- Cloud saves: one row per account holding the game's saved data as JSON.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Also turn on: Authentication → Sign In / Providers → "Allow anonymous sign-ins".

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

-- Each player can only read and write their own save.
drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep saves small (the game data is a few KB).
alter table public.saves drop constraint if exists saves_size;
alter table public.saves add constraint saves_size check (pg_column_size(data) < 200000);
