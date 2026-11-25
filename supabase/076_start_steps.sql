-- 076: where new visitors stop on the start screen (2026-11-25).
-- Run once in the SQL Editor, after 075_real_stamps_only.sql. Safe to run again.
--
-- play_visits (014) only knew "page open" and "pressed Play"; 86% of new
-- visits stopped in between and nobody could tell where. Two columns:
--   step      furthest start-screen step (src/core/sessions.js STEP):
--             1 language screen ready, 2 pressed Next, 3 character screen,
--             4 changed the look or typed a name, 5 pressed Start
--   ready_ms  page open → the game was ready behind the start screen
-- report_visit takes them as two new arguments with defaults, so a page
-- still open from before this file keeps working. The game sends the old
-- way until this file is run.

alter table public.play_visits add column if not exists step smallint not null default 0;
alter table public.play_visits add column if not exists ready_ms integer not null default 0;

drop function if exists public.report_visit(uuid, int, int, boolean, boolean, text, text);
create or replace function public.report_visit(
  p_id uuid, p_stage int, p_load_ms int, p_new boolean, p_failed boolean, p_device text, p_src text,
  p_step int default 0, p_ready_ms int default 0
) returns void
language plpgsql security definer set search_path = public as $$
declare
  st int := least(greatest(coalesce(p_stage, 1), 1), 4);
  sp int := least(greatest(coalesce(p_step, 0), 0), 5);
  ms int := least(greatest(coalesce(p_load_ms, 0), 0), 600000);
  rd int := least(greatest(coalesce(p_ready_ms, 0), 0), 600000);
  dev text := case when p_device in ('phone', 'tablet', 'desktop') then p_device else '' end;
  s text := case when coalesce(p_src, '') ~ '^[a-z0-9_-]{1,16}$' then p_src else '' end;
begin
  if auth.uid() is null or p_id is null then return; end if;
  if not exists (select 1 from public.play_visits where id = p_id)
     and (select count(*) from public.play_visits where user_id = auth.uid() and started_at > now() - interval '1 day') >= 50 then
    return;
  end if;
  insert into public.play_visits as v (id, user_id, stage, load_ms, is_new, failed, device, src, step, ready_ms)
  values (p_id, auth.uid(), st, ms, coalesce(p_new, false), coalesce(p_failed, false), dev, s, sp, rd)
  on conflict (id) do update
    set stage = greatest(v.stage, excluded.stage),
        step = greatest(v.step, excluded.step),
        load_ms = case when v.load_ms = 0 then excluded.load_ms else v.load_ms end,
        ready_ms = case when v.ready_ms = 0 then excluded.ready_ms else v.ready_ms end,
        failed = v.failed or excluded.failed
    where v.user_id = auth.uid();
  if random() < 0.02 then
    delete from public.play_visits where started_at < now() - interval '180 days';
  end if;
end $$;
revoke all on function public.report_visit(uuid, int, int, boolean, boolean, text, text, int, int) from public, anon;
grant execute on function public.report_visit(uuid, int, int, boolean, boolean, text, text, int, int) to authenticated;
