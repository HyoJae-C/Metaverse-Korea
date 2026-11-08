-- 026: applications for the free exhibitions (apply.html). Run once, after
-- 009_admin.sql. Safe to run again.
-- Supabase dashboard: SQL Editor → New query → paste → Run, then run:
--   notify pgrst, 'reload schema';
--
-- Anyone can apply from apply.html without signing in: the page uploads the
-- images to the private storage bucket "exhibit-uploads" (folder apps/) and
-- then calls submit_exhibit_app(). Only operators can list the applications,
-- see the images (admin.html → 🎨 Exhibits) and mark them accepted/declined.
--
-- Limits so the open form can't be flooded: at most 300 applications a
-- Korean day, at most 10 images each, 10 MB per image (images only).
--
-- Useful queries:
--   select status, count(*) from public.exhibit_apps group by status;
--   select name, email, kinds, created_at from public.exhibit_apps order by created_at desc;

create table if not exists public.exhibit_apps (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  email text not null check (char_length(email) between 3 and 120),
  sns text check (char_length(sns) <= 120),
  kinds text[] not null,                 -- wall, solo, space, popup
  who text not null,                     -- artist, business, student, other
  intro text not null check (char_length(intro) between 1 and 1500),
  titles text check (char_length(titles) <= 1500),
  mood text check (char_length(mood) <= 1500),
  christmas text not null,               -- continue, new, no
  images text[] not null default '{}',   -- storage paths in exhibit-uploads
  lang text check (char_length(lang) <= 8),
  status text not null default 'new',    -- new, accepted, declined
  note text check (char_length(note) <= 1000), -- operator's own note
  created_at timestamptz not null default now()
);
create index if not exists exhibit_apps_at on public.exhibit_apps (created_at desc);
alter table public.exhibit_apps enable row level security;
revoke all on public.exhibit_apps from anon, authenticated;

-- ---------- The bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exhibit-uploads', 'exhibit-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "exhibit uploads: anyone adds to apps/" on storage.objects;
create policy "exhibit uploads: anyone adds to apps/" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'exhibit-uploads' and (storage.foldername(name))[1] = 'apps');

drop policy if exists "exhibit uploads: operators read" on storage.objects;
create policy "exhibit uploads: operators read" on storage.objects
  for select to authenticated
  using (bucket_id = 'exhibit-uploads' and public.am_operator());

-- ---------- Applying ----------
-- Returns the new application's id. Errors: 'invalid' (a field is missing or
-- wrong), 'busy' (the day's limit is reached).
create or replace function public.submit_exhibit_app(app jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  k text[] := array(select jsonb_array_elements_text(coalesce(app->'kinds', '[]')));
  imgs text[] := array(select jsonb_array_elements_text(coalesce(app->'images', '[]')));
  new_id bigint;
begin
  if (select count(*) from public.exhibit_apps where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') >= 300 then
    raise exception 'busy';
  end if;
  if coalesce(trim(app->>'name'), '') = '' or coalesce(app->>'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or coalesce(trim(app->>'intro'), '') = ''
     or cardinality(k) = 0 or not (k <@ array['wall', 'solo', 'space', 'popup'])
     or coalesce(app->>'who', '') not in ('artist', 'business', 'student', 'other')
     or coalesce(app->>'christmas', '') not in ('continue', 'new', 'no')
     or coalesce((app->>'consent')::boolean, false) is not true
     or cardinality(imgs) not between 1 and 10
     or exists (select 1 from unnest(imgs) p where p !~ '^apps/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$') then
    raise exception 'invalid';
  end if;
  insert into public.exhibit_apps (name, email, sns, kinds, who, intro, titles, mood, christmas, images, lang)
  values (left(trim(app->>'name'), 60), left(trim(app->>'email'), 120), nullif(left(trim(coalesce(app->>'sns', '')), 120), ''),
          k, app->>'who', left(trim(app->>'intro'), 1500), nullif(left(trim(coalesce(app->>'titles', '')), 1500), ''),
          nullif(left(trim(coalesce(app->>'mood', '')), 1500), ''), app->>'christmas', imgs, left(coalesce(app->>'lang', ''), 8))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.submit_exhibit_app(jsonb) from public;
grant execute on function public.submit_exhibit_app(jsonb) to anon, authenticated;

-- ---------- Operators ----------
create or replace function public.ops_exhibit_apps() returns setof public.exhibit_apps
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check();
  return query select * from public.exhibit_apps order by created_at desc limit 500;
end $$;
grant execute on function public.ops_exhibit_apps() to authenticated;

create or replace function public.ops_exhibit_set(app_id bigint, new_status text, new_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check();
  if new_status not in ('new', 'accepted', 'declined') then raise exception 'invalid'; end if;
  update public.exhibit_apps set status = new_status, note = nullif(left(coalesce(new_note, ''), 1000), '') where id = app_id;
end $$;
grant execute on function public.ops_exhibit_set(bigint, text, text) to authenticated;
