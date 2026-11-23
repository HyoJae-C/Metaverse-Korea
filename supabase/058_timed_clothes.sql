-- 058: limited-time clothes leave the account's save on the server too.
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again.
--
-- Yozi 2026-11-20: the animal onesies (Pogeun Onesies, Euljiro) are gone 7
-- days after you buy them. The game takes them out itself (game/timed-wear.js);
-- this does the same on the server, so an edited save can't keep them in the
-- account: every time a save is written, a limited item in it is dropped when
--   - its purchase on the coin ledger (the receipt's op in mk.paid) is older
--     than the item's time, or
--   - it has no purchase on the ledger 10 minutes after the server first saw
--     it (a purchase can reach the ledger a moment after the save does).
-- A save with no limited item in it passes after one text search.
--
-- Keep timed_items in step with src/data/wearables.js (items with `secs`,
-- TIMED_SECS); tests/timed-wear.test.mjs checks it.

create table if not exists public.timed_items (
  item text primary key,
  secs int not null check (secs > 0)
);
alter table public.timed_items enable row level security;
revoke all on public.timed_items from anon, authenticated;
insert into public.timed_items (item, secs) values
  ('outfit-onesie-bear', 604800),
  ('outfit-onesie-bunny', 604800),
  ('outfit-onesie-dino', 604800)
on conflict (item) do update set secs = excluded.secs;

-- When the server first saw a limited item with no purchase on the ledger.
create table if not exists public.timed_seen (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null,
  at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.timed_seen enable row level security;
revoke all on public.timed_seen from anon, authenticated;

create or replace function public.saves_drop_timed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb;
  v_paid jsonb;
  v_op text;
  v_at timestamptz;
  v_seen timestamptz;
  t public.timed_items;
  v_drop boolean;
  v_changed boolean := false;
begin
  -- Most saves: no limited item in the closet.
  if not exists (select 1 from public.timed_items ti
                 where position('"' || ti.item || '"' in coalesce(new.data ->> 'mk.items', '')) > 0) then
    return new;
  end if;
  begin
    v_items := (new.data ->> 'mk.items')::jsonb;
    v_paid := coalesce((new.data ->> 'mk.paid')::jsonb, '{}'::jsonb);
  exception when others then
    return new; -- a broken save: the game can't read it either
  end;
  if jsonb_typeof(v_items) <> 'array' then return new; end if;
  if jsonb_typeof(v_paid) <> 'object' then v_paid := '{}'::jsonb; end if;

  for t in select * from public.timed_items ti where v_items ? ti.item loop
    v_op := v_paid -> t.item ->> 'op';
    v_at := null;
    if v_op ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select l.at into v_at from public.coin_ledger l
        where l.user_id = new.user_id and l.op_id = v_op::uuid and l.kind = 'spend' and l.status = 'ok' and l.n < 0;
    end if;
    if v_at is not null then
      v_drop := v_at + make_interval(secs => t.secs) <= now();
      delete from public.timed_seen where user_id = new.user_id and item = t.item;
    else
      insert into public.timed_seen (user_id, item) values (new.user_id, t.item)
        on conflict (user_id, item) do nothing;
      select s.at into v_seen from public.timed_seen s where s.user_id = new.user_id and s.item = t.item;
      v_drop := v_seen < now() - interval '10 minutes';
    end if;
    if v_drop then
      v_items := v_items - t.item;
      v_paid := v_paid - t.item;
      delete from public.timed_seen where user_id = new.user_id and item = t.item;
      v_changed := true;
    end if;
  end loop;

  if v_changed then
    new.data := jsonb_set(new.data, '{mk.items}', to_jsonb(v_items::text));
    if new.data ? 'mk.paid' then
      new.data := jsonb_set(new.data, '{mk.paid}', to_jsonb(v_paid::text));
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.saves_drop_timed() from public, anon, authenticated;

drop trigger if exists saves_drop_timed on public.saves;
create trigger saves_drop_timed before insert or update of data on public.saves
  for each row execute function public.saves_drop_timed();
