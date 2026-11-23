-- 070: Pop-up A's autumn season goods are limited-time too.
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to run again. Needs 058 (timed_items and its saves trigger).
--
-- Yozi 2026-11-23: season goods sell at the Seongsu pop-ups (Pop-up A, B,
-- C on Yeonmujang-gil). Pop-up A's autumn line, ₩30,000 each: three
-- fedoras, three berets and three trench coats. Like the onesies, they leave
-- the account's save 7 days after they were bought.
-- Keep in step with src/data/wearables.js; tests/timed-wear.test.mjs checks it.

insert into public.timed_items (item, secs) values
  ('acc-fedora-brown', 604800),
  ('acc-fedora-beige', 604800),
  ('acc-fedora-charcoal', 604800),
  ('acc-beret-burgundy', 604800),
  ('acc-beret-camel', 604800),
  ('acc-beret-olive', 604800),
  ('outfit-trench-beige', 604800),
  ('outfit-trench-brown', 604800),
  ('outfit-trench-navy', 604800)
on conflict (item) do update set secs = excluded.secs;
