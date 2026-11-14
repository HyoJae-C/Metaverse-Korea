-- Realtime messages per play session, by what they were for, so the operator
-- can see which play uses the realtime service most (it bills each message
-- once when sent and once per player who receives it).
--
-- The game counts them (src/net/meter.js) and sends them with its session
-- report: play_sessions.rt = { mv, mvr, em, emr, vs, vsr, vsn }
--   mv / mvr   movement sent / received
--   em / emr   emotes, minigame messages, outfit changes, room chat
--   vs / vsr   a two-player match's own channel (Rooftop Rumble versus)
--   vsn        matches joined
-- Presence (who is in a room) is not counted.
--
-- Safe to run again. Changes nothing that is already stored.

alter table public.play_sessions add column if not exists rt jsonb not null default '{}'::jsonb;

create or replace function public.report_session(p_id uuid, p_region text, p_device text, p_src text, p_fps integer, p_counts jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  n jsonb := case when jsonb_typeof(p_counts) = 'object' then p_counts else '{}'::jsonb end;
  f_fish int := least(greatest(coalesce(case when jsonb_typeof(n->'fish') = 'number' then (n->>'fish')::numeric end, 0), 0), 100000)::int;
  f_in int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsIn') = 'number' then (n->>'coinsIn')::numeric end, 0), 0), 1000000)::int;
  f_out int := least(greatest(coalesce(case when jsonb_typeof(n->'coinsOut') = 'number' then (n->>'coinsOut')::numeric end, 0), 0), 1000000)::int;
  f_buys int := least(greatest(coalesce(case when jsonb_typeof(n->'buys') = 'number' then (n->>'buys')::numeric end, 0), 0), 100000)::int;
  f_chats int := least(greatest(coalesce(case when jsonb_typeof(n->'chats') = 'number' then (n->>'chats')::numeric end, 0), 0), 100000)::int;
  f_near int := least(greatest(coalesce(case when jsonb_typeof(n->'nearSec') = 'number' then (n->>'nearSec')::numeric end, 0), 0), 86400)::int;
  f_ads int := least(greatest(coalesce(case when jsonb_typeof(n->'ads') = 'number' then (n->>'ads')::numeric end, 0), 0), 1000)::int;
  f_err int := least(greatest(coalesce(case when jsonb_typeof(n->'errors') = 'number' then (n->>'errors')::numeric end, 0), 0), 10000)::int;
  f_quests int := least(greatest(coalesce(case when jsonb_typeof(n->'quests') = 'number' then (n->>'quests')::numeric end, 0), 0), 1000)::int;
  f_starter int := least(greatest(coalesce(case when jsonb_typeof(n->'starter') = 'number' then (n->>'starter')::numeric end, -1), -1), 99)::int;
  f_lang text := case when coalesce(n->>'lang', '') ~ '^[a-z]{2,4}$' then n->>'lang' else '' end;
  -- Only the known counters, as whole numbers within reason.
  f_rt jsonb := coalesce((
    select jsonb_object_agg(k, least(greatest(floor((n->'rt'->>k)::numeric), 0), 100000000)::bigint)
    from unnest(array['mv', 'mvr', 'em', 'emr', 'vs', 'vsr', 'vsn']) as k
    where jsonb_typeof(n->'rt') = 'object' and jsonb_typeof(n->'rt'->k) = 'number'
  ), '{}'::jsonb);
  dev text := case when p_device in ('phone', 'tablet', 'desktop') then p_device else '' end;
  s text := case when coalesce(p_src, '') ~ '^[a-z0-9_-]{1,16}$' then p_src else '' end;
begin
  if auth.uid() is null or p_id is null then return; end if;
  insert into public.play_sessions as p
    (id, user_id, region, device, src, fps, fish, coins_in, coins_out, buys, chats, near_sec, ads, errors, quests, starter, lang, rt)
  values (p_id, auth.uid(), left(coalesce(p_region, ''), 32), dev, s,
          least(greatest(coalesce(p_fps, 0), 0), 240), f_fish, f_in, f_out, f_buys, f_chats, f_near,
          f_ads, f_err, f_quests, f_starter, f_lang, f_rt)
  on conflict (id) do update
    set last_at = now(),
        region = excluded.region,
        fps = case when excluded.fps > 0 then excluded.fps else p.fps end,
        fish = greatest(p.fish, excluded.fish),
        coins_in = greatest(p.coins_in, excluded.coins_in),
        coins_out = greatest(p.coins_out, excluded.coins_out),
        buys = greatest(p.buys, excluded.buys),
        chats = greatest(p.chats, excluded.chats),
        near_sec = least(greatest(p.near_sec, excluded.near_sec), extract(epoch from now() - p.started_at)::int + 60),
        ads = greatest(p.ads, excluded.ads),
        errors = greatest(p.errors, excluded.errors),
        quests = greatest(p.quests, excluded.quests),
        starter = greatest(p.starter, excluded.starter),
        lang = case when excluded.lang <> '' then excluded.lang else p.lang end,
        rt = case when excluded.rt <> '{}'::jsonb then excluded.rt else p.rt end -- (the game's counts only grow within a session)
    where p.user_id = auth.uid() and p.last_at < now() - interval '20 seconds';
  if random() < 0.02 then
    delete from public.play_sessions where started_at < now() - interval '180 days';
  end if;
end $$;

-- To read it: messages by kind per day (Korean time), sent + received.
-- select (started_at at time zone 'Asia/Seoul')::date as day,
--        sum((rt->>'mv')::bigint + (rt->>'mvr')::bigint) as movement,
--        sum((rt->>'em')::bigint + (rt->>'emr')::bigint) as emotes_games_chat,
--        sum((rt->>'vs')::bigint + (rt->>'vsr')::bigint) as versus,
--        sum((rt->>'vsn')::bigint) as versus_matches
-- from public.play_sessions where rt <> '{}'::jsonb group by 1 order by 1;
