-- Live tab: show whether each player is on a phone, tablet or PC.
-- ops_where now also returns the device class of the player's latest play
-- session (play_sessions.device: 'phone' | 'tablet' | 'desktop', '' if the
-- game never reported one). Nothing in the game changes; admin.html reads it.
-- Run once in Supabase → SQL Editor. Safe to run again.

drop function if exists public.ops_where(int);
create function public.ops_where(within_seconds int default 90)
returns table (uid uuid, player text, place text, px real, pz real, age_s real, guest boolean, device text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.operators o where o.user_id = auth.uid()) then
    raise exception 'operators only' using errcode = '42501';
  end if;
  return query
    select w.user_id, coalesce(n.name, nullif(w.name, ''), '?'), w.place, w.x, w.z,
           extract(epoch from now() - w.updated_at)::real,
           coalesce(u.is_anonymous, true),
           coalesce(s.device, '')
    from public.player_where w
    left join public.player_names n on n.user_id = w.user_id
    left join auth.users u on u.id = w.user_id
    left join lateral (
      select ps.device from public.play_sessions ps
      where ps.user_id = w.user_id and ps.device <> ''
      order by ps.started_at desc limit 1
    ) s on true
    where w.updated_at > now() - make_interval(secs => least(greatest(coalesce(within_seconds, 90), 10), 604800))
    order by w.updated_at desc;
end $$;
revoke all on function public.ops_where(int) from public, anon;
grant execute on function public.ops_where(int) to authenticated;
