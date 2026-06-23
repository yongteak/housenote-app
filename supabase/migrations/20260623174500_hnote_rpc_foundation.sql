-- hnote RPC 기반 스키마/테이블/함수
--
-- 목적:
-- - balpoom 직조회 대신 hnote prefix RPC를 표준 진입점으로 사용한다.
-- - 크롤 큐/매물/즐겨찾기/최근 본 항목을 hnote 네임스페이스에 통합한다.
-- - 프런트는 supabase.rpc("hnote_*")만 사용한다.
-- 핵심 정책:
-- - 앱 도메인 데이터는 hnote 스키마에 두고 public/balpoom 직접 조회를 피한다.
-- - MVP 특성상 anon/authenticated 모두 CRUD 가능하게 두되, 모든 테이블에 RLS를 활성화한다.
-- - 크롤 상태·메타는 properties.metadata jsonb에 누적하고 RPC로만 갱신한다.
-- 의존:
-- - 20260622153000_balpoom_initial_tables.sql
-- 다음:
-- - 없음
-- 실행:
-- - supabase db push
-- - 또는 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260623174500_hnote_rpc_foundation.sql

create schema if not exists hnote;

grant usage on schema hnote to anon, authenticated, service_role;
grant create on schema hnote to service_role;

grant select on hnote.hnote_fixed_actors to anon, authenticated, service_role;
grant select, insert, update, delete on hnote.hnote_properties to anon, authenticated, service_role;
grant select, insert, update, delete on hnote.hnote_property_favorites to anon, authenticated, service_role;
grant select, insert, update, delete on hnote.hnote_property_recent_views to anon, authenticated, service_role;

create table if not exists hnote.hnote_fixed_actors (
  id uuid primary key default gen_random_uuid(),
  phone_suffix text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists hnote.hnote_properties (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references hnote.hnote_fixed_actors(id),
  phone_suffix text not null,
  actor_name text not null,
  source_url text not null,
  source_domain text,
  source_listing_id text,
  title text,
  property_type text,
  deal_type text,
  address text,
  road_address text,
  latitude numeric,
  longitude numeric,
  current_price_text text,
  current_price_value numeric,
  desired_price_value numeric,
  area_supply_m2 numeric,
  area_private_m2 numeric,
  floor_info text,
  direction text,
  thumbnail_url text,
  image_urls jsonb not null default '[]'::jsonb,
  visited boolean not null default false,
  visited_at timestamptz,
  rating_location smallint,
  rating_price smallint,
  rating_condition smallint,
  rating_sunlight smallint,
  rating_environment smallint,
  pros text,
  cons text,
  memo text,
  decision_status text not null default 'review',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hnote_properties_decision_status_check
    check (decision_status in ('review', 'hold', 'exclude', 'revisit')),
  constraint hnote_properties_visited_requires_visited_at_check
    check ((not visited) or visited_at is not null),
  constraint hnote_properties_rating_location_check
    check (rating_location is null or rating_location between 1 and 5),
  constraint hnote_properties_rating_price_check
    check (rating_price is null or rating_price between 1 and 5),
  constraint hnote_properties_rating_condition_check
    check (rating_condition is null or rating_condition between 1 and 5),
  constraint hnote_properties_rating_sunlight_check
    check (rating_sunlight is null or rating_sunlight between 1 and 5),
  constraint hnote_properties_rating_environment_check
    check (rating_environment is null or rating_environment between 1 and 5)
);

create table if not exists hnote.hnote_property_favorites (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references hnote.hnote_fixed_actors(id) on delete cascade,
  property_id uuid not null references hnote.hnote_properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint hnote_property_favorites_actor_property_unique unique (actor_id, property_id)
);

create table if not exists hnote.hnote_property_recent_views (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references hnote.hnote_fixed_actors(id) on delete cascade,
  property_id uuid not null references hnote.hnote_properties(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  constraint hnote_property_recent_views_actor_property_unique unique (actor_id, property_id)
);

create index if not exists hnote_properties_actor_created_at_idx
  on hnote.hnote_properties (actor_id, created_at desc);

create index if not exists hnote_properties_status_idx
  on hnote.hnote_properties (decision_status);

create index if not exists hnote_properties_visited_at_idx
  on hnote.hnote_properties (visited, visited_at desc);

create index if not exists hnote_properties_crawl_status_idx
  on hnote.hnote_properties ((metadata->'crawl'->>'status'));

create index if not exists hnote_property_recent_views_actor_viewed_at_idx
  on hnote.hnote_property_recent_views (actor_id, viewed_at desc);

alter table hnote.hnote_fixed_actors enable row level security;
alter table hnote.hnote_properties enable row level security;
alter table hnote.hnote_property_favorites enable row level security;
alter table hnote.hnote_property_recent_views enable row level security;

drop policy if exists hnote_fixed_actors_mvp_read on hnote.hnote_fixed_actors;
create policy hnote_fixed_actors_mvp_read
on hnote.hnote_fixed_actors
for select
to anon, authenticated
using (true);

drop policy if exists hnote_properties_mvp_all on hnote.hnote_properties;
create policy hnote_properties_mvp_all
on hnote.hnote_properties
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists hnote_property_favorites_mvp_all on hnote.hnote_property_favorites;
create policy hnote_property_favorites_mvp_all
on hnote.hnote_property_favorites
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists hnote_property_recent_views_mvp_all on hnote.hnote_property_recent_views;
create policy hnote_property_recent_views_mvp_all
on hnote.hnote_property_recent_views
for all
to anon, authenticated
using (true)
with check (true);

insert into hnote.hnote_fixed_actors (phone_suffix, display_name)
values
  ('1111', '아빠'),
  ('2222', '엄마')
on conflict (phone_suffix)
do update set
  display_name = excluded.display_name,
  is_active = true;

create or replace function hnote.hnote_list_fixed_actors()
returns setof hnote.hnote_fixed_actors
language sql
stable
as $$
  select *
  from hnote.hnote_fixed_actors
  where is_active = true
  order by phone_suffix asc;
$$;

create or replace function hnote.hnote_get_actor_by_phone_suffix(p_phone_suffix text)
returns hnote.hnote_fixed_actors
language sql
stable
as $$
  select *
  from hnote.hnote_fixed_actors
  where phone_suffix = p_phone_suffix
    and is_active = true
  limit 1;
$$;

create or replace function hnote.hnote_list_properties(
  p_actor_id uuid default null,
  p_visited boolean default null,
  p_decision_status text default null,
  p_limit integer default 100
)
returns setof hnote.hnote_properties
language sql
stable
as $$
  select *
  from hnote.hnote_properties
  where (p_actor_id is null or actor_id = p_actor_id)
    and (p_visited is null or visited = p_visited)
    and (p_decision_status is null or decision_status = p_decision_status)
  order by created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function hnote.hnote_get_property(p_property_id uuid)
returns hnote.hnote_properties
language sql
stable
as $$
  select *
  from hnote.hnote_properties
  where id = p_property_id
  limit 1;
$$;

create or replace function hnote.hnote_save_property(p_property jsonb)
returns hnote.hnote_properties
language plpgsql
as $$
declare
  v_payload jsonb := coalesce(p_property, '{}'::jsonb);
  v_id uuid;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_row hnote.hnote_properties;
begin
  v_id := nullif(v_payload->>'id', '')::uuid;
  if v_id is null then
    v_id := gen_random_uuid();
  end if;

  v_created_at := coalesce(nullif(v_payload->>'created_at', '')::timestamptz, now());
  v_updated_at := coalesce(nullif(v_payload->>'updated_at', '')::timestamptz, now());

  v_payload := v_payload
    || jsonb_build_object(
      'id', v_id,
      'created_at', v_created_at,
      'updated_at', v_updated_at
    );

  insert into hnote.hnote_properties
  select *
  from jsonb_populate_record(null::hnote.hnote_properties, v_payload)
  on conflict (id)
  do update
  set
    actor_id = excluded.actor_id,
    phone_suffix = excluded.phone_suffix,
    actor_name = excluded.actor_name,
    source_url = excluded.source_url,
    source_domain = excluded.source_domain,
    source_listing_id = excluded.source_listing_id,
    title = excluded.title,
    property_type = excluded.property_type,
    deal_type = excluded.deal_type,
    address = excluded.address,
    road_address = excluded.road_address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    current_price_text = excluded.current_price_text,
    current_price_value = excluded.current_price_value,
    desired_price_value = excluded.desired_price_value,
    area_supply_m2 = excluded.area_supply_m2,
    area_private_m2 = excluded.area_private_m2,
    floor_info = excluded.floor_info,
    direction = excluded.direction,
    thumbnail_url = excluded.thumbnail_url,
    image_urls = excluded.image_urls,
    visited = excluded.visited,
    visited_at = excluded.visited_at,
    rating_location = excluded.rating_location,
    rating_price = excluded.rating_price,
    rating_condition = excluded.rating_condition,
    rating_sunlight = excluded.rating_sunlight,
    rating_environment = excluded.rating_environment,
    pros = excluded.pros,
    cons = excluded.cons,
    memo = excluded.memo,
    decision_status = excluded.decision_status,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function hnote.hnote_delete_property(p_property_id uuid)
returns void
language sql
as $$
  delete from hnote.hnote_properties
  where id = p_property_id;
$$;

create or replace function hnote.hnote_list_crawl_queue(
  p_actor_id uuid,
  p_limit integer default 100
)
returns setof hnote.hnote_properties
language sql
stable
as $$
  select *
  from hnote.hnote_properties
  where actor_id = p_actor_id
    and metadata->'crawl' is not null
  order by created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function hnote.hnote_list_pending_crawl(
  p_actor_id uuid default null,
  p_limit integer default 50
)
returns setof hnote.hnote_properties
language sql
stable
as $$
  select *
  from hnote.hnote_properties
  where metadata->'crawl'->>'status' = 'pending'
    and (p_actor_id is null or actor_id = p_actor_id)
  order by created_at asc
  limit greatest(p_limit, 1);
$$;

create or replace function hnote.hnote_list_favorites(p_actor_id uuid)
returns setof hnote.hnote_property_favorites
language sql
stable
as $$
  select *
  from hnote.hnote_property_favorites
  where actor_id = p_actor_id
  order by created_at desc;
$$;

create or replace function hnote.hnote_toggle_favorite(
  p_actor_id uuid,
  p_property_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_deleted_count integer;
begin
  delete from hnote.hnote_property_favorites
  where actor_id = p_actor_id
    and property_id = p_property_id;

  get diagnostics v_deleted_count = row_count;
  if v_deleted_count > 0 then
    return false;
  end if;

  insert into hnote.hnote_property_favorites (actor_id, property_id)
  values (p_actor_id, p_property_id)
  on conflict (actor_id, property_id) do nothing;

  return true;
end;
$$;

create or replace function hnote.hnote_touch_recent_view(
  p_actor_id uuid,
  p_property_id uuid,
  p_viewed_at timestamptz default now()
)
returns hnote.hnote_property_recent_views
language plpgsql
as $$
declare
  v_row hnote.hnote_property_recent_views;
begin
  insert into hnote.hnote_property_recent_views (actor_id, property_id, viewed_at)
  values (p_actor_id, p_property_id, p_viewed_at)
  on conflict (actor_id, property_id)
  do update set
    viewed_at = excluded.viewed_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function hnote.hnote_list_recent_views(
  p_actor_id uuid,
  p_limit integer default 30
)
returns setof hnote.hnote_property_recent_views
language sql
stable
as $$
  select *
  from hnote.hnote_property_recent_views
  where actor_id = p_actor_id
  order by viewed_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on all functions in schema hnote to anon, authenticated, service_role;
