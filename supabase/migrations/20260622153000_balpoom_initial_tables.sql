-- balpoom 앱 초기 스키마(테이블/정책/시드)
--
-- 목적:
-- - 발품 앱 MVP에서 필요한 저장자/매물/방문/태그 데이터를 balpoom 스키마에 구조화한다.
-- - 링크 메타정보 + 현장 평가 + 가격 판단을 한 레코드로 누적할 수 있게 한다.
-- 핵심 정책:
-- - 스키마를 public과 분리해 앱 도메인 데이터를 balpoom 네임스페이스로 관리한다.
-- - MVP 특성상 anon/authenticated 모두 CRUD 가능하게 두되, 모든 테이블에 RLS를 활성화한다.
-- - 전화번호 뒷자리 1111/2222는 고정 저장자 시드로 즉시 사용 가능하도록 upsert 한다.
-- 의존: 없음
-- 다음: 20260622153100_balpoom_metadata_rpcs.sql (Edge Function/RPC 확장 시)
-- 실행: supabase db push -- 또는 psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260622153000_balpoom_initial_tables.sql

-- 앱 도메인 분리를 위해 전용 스키마를 생성한다.
create schema if not exists balpoom;

comment on schema balpoom is
'발품(부동산 답사 기록) 앱 전용 스키마. 저장자, 매물, 방문 로그, 태그 데이터를 관리한다.';

-- balpoom 스키마를 API 역할에서 사용 가능하도록 권한을 열어둔다.
grant usage on schema balpoom to anon, authenticated, service_role;
grant create on schema balpoom to service_role;

-- 전화번호 뒷자리와 화면 표시 이름을 고정 매핑한다.
create table if not exists balpoom.fixed_actors (
  id uuid primary key default gen_random_uuid(),
  phone_suffix text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table balpoom.fixed_actors is
'전화번호 뒷자리(1111/2222)와 저장자 표시 이름(아빠/엄마)을 고정 매핑하는 기준 테이블.';
comment on column balpoom.fixed_actors.id is
'fixed_actors PK. 앱 내부에서 actor_id FK로 사용한다.';
comment on column balpoom.fixed_actors.phone_suffix is
'전화번호 뒷자리 식별자. 사용자가 선택 화면에서 누르는 값이며 unique 제약으로 중복을 방지한다.';
comment on column balpoom.fixed_actors.display_name is
'저장자 화면 표시 이름. 예: 아빠, 엄마.';
comment on column balpoom.fixed_actors.is_active is
'선택 화면 노출 여부. false면 이력 보존만 하고 신규 선택에서는 숨긴다.';
comment on column balpoom.fixed_actors.created_at is
'저장자 레코드 생성 시각.';

-- 매물 기본 정보 + 현장 판단 정보를 한 레코드로 저장한다.
create table if not exists balpoom.properties (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references balpoom.fixed_actors(id),
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

  constraint properties_decision_status_check
    check (decision_status in ('review', 'hold', 'exclude', 'revisit')),
  constraint properties_visited_requires_visited_at_check
    check ((not visited) or visited_at is not null),
  constraint properties_rating_location_check
    check (rating_location is null or rating_location between 1 and 5),
  constraint properties_rating_price_check
    check (rating_price is null or rating_price between 1 and 5),
  constraint properties_rating_condition_check
    check (rating_condition is null or rating_condition between 1 and 5),
  constraint properties_rating_sunlight_check
    check (rating_sunlight is null or rating_sunlight between 1 and 5),
  constraint properties_rating_environment_check
    check (rating_environment is null or rating_environment between 1 and 5)
);

comment on table balpoom.properties is
'매물 링크 기반 기본 정보와 방문/평가/가격 판단 메모를 함께 저장하는 핵심 엔터티.';
comment on column balpoom.properties.id is '매물 PK.';
comment on column balpoom.properties.actor_id is 'fixed_actors FK. 현재 레코드를 저장한 주체.';
comment on column balpoom.properties.phone_suffix is '저장 시점의 전화번호 뒷자리 스냅샷. actor 매핑 변경에도 이력 보존.';
comment on column balpoom.properties.actor_name is '저장 시점의 저장자 이름 스냅샷.';
comment on column balpoom.properties.source_url is '원본 매물 링크 URL. 네이버 부동산 링크를 기본으로 사용.';
comment on column balpoom.properties.source_domain is '링크 도메인(예: land.naver.com). 필터/품질 분석용.';
comment on column balpoom.properties.source_listing_id is '외부 서비스 매물 식별자. 파싱 가능할 때만 채움.';
comment on column balpoom.properties.title is '매물 제목. 링크 메타 자동 추출 후 수동 보정 가능.';
comment on column balpoom.properties.property_type is '매물 종류(아파트/오피스텔 등).' ;
comment on column balpoom.properties.deal_type is '거래 유형(매매/전세/월세 등).' ;
comment on column balpoom.properties.address is '지번/일반 주소 텍스트.';
comment on column balpoom.properties.road_address is '도로명 주소.';
comment on column balpoom.properties.latitude is '위도. 지도 연동 확장 대비 선택 필드.';
comment on column balpoom.properties.longitude is '경도. 지도 연동 확장 대비 선택 필드.';
comment on column balpoom.properties.current_price_text is '외부 원문 가격 텍스트. 예: 13억 5,000.';
comment on column balpoom.properties.current_price_value is '현재가 숫자값. 정렬/필터/차이 계산용.';
comment on column balpoom.properties.desired_price_value is '희망가 숫자값. 현재가와 비교 판단용.';
comment on column balpoom.properties.area_supply_m2 is '공급면적(m2). 파싱 가능 시 채움.';
comment on column balpoom.properties.area_private_m2 is '전용면적(m2). 파싱 가능 시 채움.';
comment on column balpoom.properties.floor_info is '층수 정보 텍스트. 예: 10/25층.';
comment on column balpoom.properties.direction is '향 정보. 예: 남향.';
comment on column balpoom.properties.thumbnail_url is '대표 이미지 URL.';
comment on column balpoom.properties.image_urls is '추가 이미지 URL 배열(JSONB).';
comment on column balpoom.properties.visited is '현장 방문 여부. true면 visited_at이 필수.';
comment on column balpoom.properties.visited_at is '현장 방문 시각.';
comment on column balpoom.properties.rating_location is '위치 평가 점수(1~5).';
comment on column balpoom.properties.rating_price is '가격 매력도 점수(1~5).';
comment on column balpoom.properties.rating_condition is '내부 상태 점수(1~5).';
comment on column balpoom.properties.rating_sunlight is '채광/향 점수(1~5).';
comment on column balpoom.properties.rating_environment is '주변 환경 점수(1~5).';
comment on column balpoom.properties.pros is '장점 메모.';
comment on column balpoom.properties.cons is '단점 메모.';
comment on column balpoom.properties.memo is '자유 의견 메모.';
comment on column balpoom.properties.decision_status is '의사결정 상태. review/hold/exclude/revisit 중 하나.';
comment on column balpoom.properties.metadata is '원본 OG/meta payload 등 비정형 확장 데이터.';
comment on column balpoom.properties.created_at is '매물 기록 생성 시각.';
comment on column balpoom.properties.updated_at is '매물 기록 최종 수정 시각. 앱 업데이트 시 갱신.';

-- 방문 기록을 복수 건으로 남기고 싶을 때 사용하는 확장 로그 테이블.
create table if not exists balpoom.property_visit_logs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references balpoom.properties(id) on delete cascade,
  visited_at timestamptz not null,
  note text,
  created_at timestamptz not null default now()
);

comment on table balpoom.property_visit_logs is
'매물별 방문 이력을 다건으로 누적하는 보조 로그 테이블.';
comment on column balpoom.property_visit_logs.id is '방문 로그 PK.';
comment on column balpoom.property_visit_logs.property_id is '대상 매물 FK. 매물 삭제 시 함께 cascade 삭제.';
comment on column balpoom.property_visit_logs.visited_at is '실제 방문 시각.';
comment on column balpoom.property_visit_logs.note is '방문별 짧은 메모.';
comment on column balpoom.property_visit_logs.created_at is '로그 생성 시각.';

-- 매물 태그 분류를 위한 간단한 문자열 태그 테이블.
create table if not exists balpoom.property_tags (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references balpoom.properties(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);

comment on table balpoom.property_tags is
'매물에 다중 태그를 부여하기 위한 분류 테이블.';
comment on column balpoom.property_tags.id is '태그 PK.';
comment on column balpoom.property_tags.property_id is '대상 매물 FK. 매물 삭제 시 함께 cascade 삭제.';
comment on column balpoom.property_tags.tag is '사용자 입력 태그 문자열.';
comment on column balpoom.property_tags.created_at is '태그 부여 시각.';

-- 목록/필터 성능을 위해 actor, 생성일, 상태, 방문일 인덱스를 추가한다.
create index if not exists properties_actor_created_at_idx
  on balpoom.properties (actor_id, created_at desc);
comment on index balpoom.properties_actor_created_at_idx is
'저장자별 최신순 목록 조회 가속 인덱스.';

create index if not exists properties_status_idx
  on balpoom.properties (decision_status);
comment on index balpoom.properties_status_idx is
'상태(review/hold/exclude/revisit) 필터 조회 인덱스.';

create index if not exists properties_visited_at_idx
  on balpoom.properties (visited, visited_at desc);
comment on index balpoom.properties_visited_at_idx is
'방문 여부 + 방문일 정렬 필터 조회 인덱스.';

create index if not exists property_visit_logs_property_visited_at_idx
  on balpoom.property_visit_logs (property_id, visited_at desc);
comment on index balpoom.property_visit_logs_property_visited_at_idx is
'특정 매물의 방문 로그 최신순 조회 인덱스.';

create index if not exists property_tags_property_tag_idx
  on balpoom.property_tags (property_id, tag);
comment on index balpoom.property_tags_property_tag_idx is
'매물별 태그 목록 및 태그 존재 여부 조회 인덱스.';

-- 각 테이블은 API 접근 경로를 고려해 RLS를 활성화한다.
alter table balpoom.fixed_actors enable row level security;
alter table balpoom.properties enable row level security;
alter table balpoom.property_visit_logs enable row level security;
alter table balpoom.property_tags enable row level security;

-- MVP는 가족 내부 단일 앱 사용을 가정하므로 anon/authenticated 전체 CRUD를 허용한다.
-- 이후 정식 인증 단계에서 actor 기반 정책으로 교체할 수 있도록 정책명을 명확히 둔다.
drop policy if exists fixed_actors_mvp_read on balpoom.fixed_actors;
create policy fixed_actors_mvp_read
on balpoom.fixed_actors
for select
to anon, authenticated
using (true);

drop policy if exists properties_mvp_all on balpoom.properties;
create policy properties_mvp_all
on balpoom.properties
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists property_visit_logs_mvp_all on balpoom.property_visit_logs;
create policy property_visit_logs_mvp_all
on balpoom.property_visit_logs
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists property_tags_mvp_all on balpoom.property_tags;
create policy property_tags_mvp_all
on balpoom.property_tags
for all
to anon, authenticated
using (true)
with check (true);

-- 고정 저장자 기본값을 멱등성 있게 주입한다.
insert into balpoom.fixed_actors (phone_suffix, display_name)
values
  ('1111', '아빠'),
  ('2222', '엄마')
on conflict (phone_suffix)
do update set
  display_name = excluded.display_name,
  is_active = true;
