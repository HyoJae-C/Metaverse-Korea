-- Notice boards on the square: free board ('free', everyone can read) and
-- inquiry board ('ask', only the writer can read; the operator reads them in
-- the dashboard: Table Editor → board_posts).
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Rules (also checked in the game): 3 posts per board per day (Korean time),
-- at most 20 lines and 1000 characters. To hide a free-board post, set its
-- "hidden" to true in the Table Editor. Deleted posts stay in the table
-- with "deleted" true.

create table if not exists public.board_posts (
  id bigint generated always as identity primary key,
  board text not null check (board in ('free', 'ask')),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 16),
  body text not null check (
    char_length(body) between 1 and 1000
    and array_length(string_to_array(body, E'\n'), 1) <= 20
  ),
  created_at timestamptz not null default now(),
  hidden boolean not null default false,  -- hidden by the operator
  deleted boolean not null default false  -- deleted by the writer (still counts for the day)
);

create index if not exists board_posts_recent on public.board_posts (board, created_at desc);
create index if not exists board_posts_user on public.board_posts (user_id, board, created_at);

-- Whoever writes, the server sets the writer, the time and "not hidden".
create or replace function public.board_posts_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  new.hidden := false;
  new.deleted := false;
  return new;
end $$;

drop trigger if exists board_posts_stamp on public.board_posts;
create trigger board_posts_stamp before insert on public.board_posts
  for each row execute function public.board_posts_stamp();

-- Posts this account wrote today (Korean time) on a board.
create or replace function public.board_posts_today(b text) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.board_posts
  where user_id = auth.uid() and board = b
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
$$;

alter table public.board_posts enable row level security;

drop policy if exists "read board" on public.board_posts;
create policy "read board" on public.board_posts
  for select using (not deleted and ((board = 'free' and not hidden) or user_id = auth.uid()));

drop policy if exists "write board" on public.board_posts;
create policy "write board" on public.board_posts
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and public.board_posts_today(board) < 3
  );

-- Writers delete their own posts through this function (the row stays,
-- marked deleted, so deleting doesn't give more posts that day).
create or replace function public.board_delete_post(post_id bigint) returns void
language sql security definer set search_path = public as $$
  update public.board_posts set deleted = true where id = post_id and user_id = auth.uid();
$$;
grant execute on function public.board_delete_post(bigint) to authenticated;
