-- Delete a notice (공지 삭제). Operators only, checked on the server.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run,
-- then run:  notify pgrst, 'reload schema';
-- Needs 012_announcements.sql.
--
-- The notice is removed from the table (so late joiners no longer get it),
-- and a 'd' message on the 'announce' channel takes it out of the chat of
-- everyone playing right now.

create or replace function public.ops_delete_announcement(notice_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  found_it boolean;
begin
  perform public.ops_check();
  delete from public.announcements where id = notice_id;
  found_it := found;
  begin
    perform realtime.send(jsonb_build_object('id', notice_id), 'd', 'announce', true);
  exception when others then
    null;
  end;
  return found_it;
end $$;
revoke all on function public.ops_delete_announcement(bigint) from public, anon;
grant execute on function public.ops_delete_announcement(bigint) to authenticated;
