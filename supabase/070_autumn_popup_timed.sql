-- 070: Pop-up A's autumn season goods are limited-time too.
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 058 (timed_items and its saves trigger).
--
-- Yozi 2026-11-23: season goods sell at the Seongsu pop-ups (Pop-up A, B,
-- C on Yeonmujang-gil). Pop-up A's autumn line, ₩30,000 each: three
-- newsboy caps (빵모자), three flat caps (헌팅캡) and three trench coats, all
-- in beige, brown and navy. Like the onesies, they leave
-- the account's save 7 days after they were bought.
-- Keep in step with src/data/wearables.js; tests/timed-wear.test.mjs checks it.

insert into public.timed_items (item, secs) values
  ('acc-newsboy-beige', 604800),
  ('acc-newsboy-brown', 604800),
  ('acc-newsboy-navy', 604800),
  ('acc-flatcap-beige', 604800),
  ('acc-flatcap-brown', 604800),
  ('acc-flatcap-navy', 604800),
  ('outfit-trench-beige', 604800),
  ('outfit-trench-brown', 604800),
  ('outfit-trench-navy', 604800)
on conflict (item) do update set secs = excluded.secs;
