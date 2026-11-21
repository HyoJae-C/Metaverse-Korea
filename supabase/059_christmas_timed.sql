-- 059: Santa Pop-up's Christmas accessories are limited-time too.
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 058 (timed_items and its saves trigger).
--
-- Santa hat, Santa beard, Rudolph nose and Rudolph antlers (Seongsu) leave
-- the account's save 7 days after they were bought, like the onesies.
-- (The sleigh bike skin is in the ride garage, which the game ends itself.)
-- Keep in step with src/data/wearables.js; tests/timed-wear.test.mjs checks it.

insert into public.timed_items (item, secs) values
  ('acc-santa-hat', 604800),
  ('acc-santa-beard', 604800),
  ('acc-rudolph-nose', 604800),
  ('acc-antlers', 604800)
on conflict (item) do update set secs = excluded.secs;
