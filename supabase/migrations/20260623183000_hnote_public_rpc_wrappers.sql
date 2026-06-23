-- PostgREST 기본 스키마(public)에서 hnote RPC를 호출할 수 있도록 public 래퍼를 추가한다.
-- supabase.rpc("hnote_*")는 public 스키마 함수를 찾는다.
-- 의존:
-- - 20260623174500_hnote_rpc_foundation.sql
-- 다음:
-- - 없음
-- 실행:
-- - supabase db push
-- - 또는 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260623183000_hnote_public_rpc_wrappers.sql

create or replace function public.hnote_list_fixed_actors()
returns setof hnote.hnote_fixed_actors
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_fixed_actors();
$$;

create or replace function public.hnote_get_actor_by_phone_suffix(p_phone_suffix text)
returns hnote.hnote_fixed_actors
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_get_actor_by_phone_suffix(p_phone_suffix);
$$;

create or replace function public.hnote_list_properties(
  p_actor_id uuid default null,
  p_visited boolean default null,
  p_decision_status text default null,
  p_limit integer default 100
)
returns setof hnote.hnote_properties
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_properties(p_actor_id, p_visited, p_decision_status, p_limit);
$$;

create or replace function public.hnote_get_property(p_property_id uuid)
returns hnote.hnote_properties
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_get_property(p_property_id);
$$;

create or replace function public.hnote_save_property(p_property jsonb)
returns hnote.hnote_properties
language sql
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_save_property(p_property);
$$;

create or replace function public.hnote_delete_property(p_property_id uuid)
returns void
language sql
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_delete_property(p_property_id);
$$;

create or replace function public.hnote_list_crawl_queue(
  p_actor_id uuid,
  p_limit integer default 100
)
returns setof hnote.hnote_properties
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_crawl_queue(p_actor_id, p_limit);
$$;

create or replace function public.hnote_list_pending_crawl(
  p_actor_id uuid default null,
  p_limit integer default 50
)
returns setof hnote.hnote_properties
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_pending_crawl(p_actor_id, p_limit);
$$;

create or replace function public.hnote_list_favorites(p_actor_id uuid)
returns setof hnote.hnote_property_favorites
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_favorites(p_actor_id);
$$;

create or replace function public.hnote_toggle_favorite(
  p_actor_id uuid,
  p_property_id uuid
)
returns boolean
language sql
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_toggle_favorite(p_actor_id, p_property_id);
$$;

create or replace function public.hnote_touch_recent_view(
  p_actor_id uuid,
  p_property_id uuid,
  p_viewed_at timestamptz default now()
)
returns hnote.hnote_property_recent_views
language sql
security invoker
set search_path = hnote, public
as $$
  select hnote.hnote_touch_recent_view(p_actor_id, p_property_id, p_viewed_at);
$$;

create or replace function public.hnote_list_recent_views(
  p_actor_id uuid,
  p_limit integer default 30
)
returns setof hnote.hnote_property_recent_views
language sql
stable
security invoker
set search_path = hnote, public
as $$
  select * from hnote.hnote_list_recent_views(p_actor_id, p_limit);
$$;

grant execute on function public.hnote_list_fixed_actors() to anon, authenticated, service_role;
grant execute on function public.hnote_get_actor_by_phone_suffix(text) to anon, authenticated, service_role;
grant execute on function public.hnote_list_properties(uuid, boolean, text, integer) to anon, authenticated, service_role;
grant execute on function public.hnote_get_property(uuid) to anon, authenticated, service_role;
grant execute on function public.hnote_save_property(jsonb) to anon, authenticated, service_role;
grant execute on function public.hnote_delete_property(uuid) to anon, authenticated, service_role;
grant execute on function public.hnote_list_crawl_queue(uuid, integer) to anon, authenticated, service_role;
grant execute on function public.hnote_list_pending_crawl(uuid, integer) to anon, authenticated, service_role;
grant execute on function public.hnote_list_favorites(uuid) to anon, authenticated, service_role;
grant execute on function public.hnote_toggle_favorite(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.hnote_touch_recent_view(uuid, uuid, timestamptz) to anon, authenticated, service_role;
grant execute on function public.hnote_list_recent_views(uuid, integer) to anon, authenticated, service_role;
