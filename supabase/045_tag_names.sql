-- 이름표 서버 이름 확인 함수(tag_names) 다시 만들기.
-- 019_chat_names.sql에 있던 함수인데 DB에 없음 → 다른 기기·관리자에서 바꾼 이름이 게임 머리 위 이름표에 반영 안 됨(#662가 이 함수를 씀).
-- 함수만 만듦. 데이터는 안 바꿈. Supabase SQL Editor에 붙여 넣고 Run.

create or replace function public.tag_names(ids text[], names text[])
returns table (net_id text, name text)
language plpgsql stable security definer set search_path = public as $$
declare
  i int;
  owner uuid;
  real text;
  named_by uuid;
begin
  for i in 1 .. least(coalesce(array_length(ids, 1), 0), coalesce(array_length(names, 1), 0), 50) loop
    select c.user_id into owner from public.chat_ids c where c.net_id = ids[i];
    real := null;
    if owner is not null then
      select n.name into real from public.player_names n where n.user_id = owner;
    end if;
    if real is not null then
      if real is distinct from names[i] then net_id := ids[i]; name := real; return next; end if;
      continue;
    end if;
    select n.user_id into named_by from public.player_names n where n.name_key = public.name_key(names[i]);
    if named_by is not null and named_by is distinct from owner then
      net_id := ids[i]; name := null; return next;
    end if;
  end loop;
end $$;
revoke all on function public.tag_names(text[], text[]) from public;
grant execute on function public.tag_names(text[], text[]) to anon, authenticated;
