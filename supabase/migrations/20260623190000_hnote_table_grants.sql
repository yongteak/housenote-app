-- hnote 테이블에 anon/authenticated GRANT 추가
-- RLS 정책만으로는 부족하며, SECURITY INVOKER RPC는 호출 역할의 테이블 권한이 필요하다.
-- 의존:
-- - 20260623174500_hnote_rpc_foundation.sql
-- 다음:
-- - 없음
-- 실행:
-- - supabase db push
-- - 또는 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260623190000_hnote_table_grants.sql
grant select on hnote.hnote_fixed_actors to anon, authenticated, service_role;

grant select, insert, update, delete on hnote.hnote_properties to anon, authenticated, service_role;

grant select, insert, update, delete on hnote.hnote_property_favorites to anon, authenticated, service_role;

grant select, insert, update, delete on hnote.hnote_property_recent_views to anon, authenticated, service_role;
