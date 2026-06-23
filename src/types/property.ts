/**
 * @file property.ts
 * @description 발품 앱 핵심 엔터티(저장자/매물/메타 프리뷰) 타입 정의.
 */

/** 전화번호 뒷자리 고정 저장자 레코드 */
export type FixedActor = {
  /** fixed_actors PK */
  id: string;
  /** 전화번호 뒷자리. 예: 1111, 2222 */
  phone_suffix: string;
  /** 화면 노출 이름. 예: 아빠, 엄마 */
  display_name: string;
  /** 활성화 여부 */
  is_active: boolean;
};

/** localStorage에 저장할 선택 저장자 정보 */
export type SelectedActor = {
  /** fixed_actors PK */
  actorId: string;
  /** 전화번호 뒷자리 */
  phoneSuffix: string;
  /** 화면 표시 이름 */
  actorName: string;
};

/** 매물 상태 값 */
export type DecisionStatus = "review" | "hold" | "exclude" | "revisit";

/** properties 테이블 단건 타입 */
export type PropertyRecord = {
  /** 매물 PK */
  id: string;
  /** 저장자 FK */
  actor_id: string;
  /** 저장 당시 전화번호 뒷자리 */
  phone_suffix: string;
  /** 저장 당시 이름 스냅샷 */
  actor_name: string;
  /** 원본 매물 링크 */
  source_url: string;
  /** 링크 도메인 */
  source_domain?: string | null;
  /** 외부 매물 ID */
  source_listing_id?: string | null;
  /** 링크 제목 또는 사용자 입력 제목 */
  title: string | null;
  /** 매물 종류 */
  property_type?: string | null;
  /** 거래 유형 */
  deal_type: string | null;
  /** 주소 텍스트 */
  address: string | null;
  /** 도로명 주소 */
  road_address?: string | null;
  /** 위도 */
  latitude?: number | null;
  /** 경도 */
  longitude?: number | null;
  /** 현재가 텍스트 */
  current_price_text?: string | null;
  /** 현재가 숫자 */
  current_price_value: number | null;
  /** 공급면적 */
  area_supply_m2?: number | null;
  /** 전용면적 */
  area_private_m2?: number | null;
  /** 층 정보 */
  floor_info?: string | null;
  /** 향 */
  direction?: string | null;
  /** 이미지 URL 목록 */
  image_urls?: string[] | null;
  /** 크롤 원본 등 */
  metadata?: Record<string, unknown> | null;
  /** 희망가 숫자 */
  desired_price_value: number | null;
  /** 대표 이미지 URL */
  thumbnail_url: string | null;
  /** 방문 여부 */
  visited: boolean;
  /** 방문 일시 */
  visited_at: string | null;
  /** 위치 평가 점수(1~5) */
  rating_location: number | null;
  /** 가격 매력도 점수(1~5) */
  rating_price: number | null;
  /** 내부 상태 점수(1~5) */
  rating_condition: number | null;
  /** 채광/향 점수(1~5) */
  rating_sunlight: number | null;
  /** 주변 환경 점수(1~5) */
  rating_environment: number | null;
  /** 장점 요약 */
  pros: string | null;
  /** 단점 요약 */
  cons: string | null;
  /** 자유 메모 */
  memo: string | null;
  /** 의사결정 상태 */
  decision_status: DecisionStatus;
  /** 생성 시각 */
  created_at: string;
  /** 수정 시각 */
  updated_at: string;
};

/** 목록 필터 입력값 */
export type PropertyFilters = {
  /** 저장자 필터 */
  actorId?: string;
  /** 방문 여부 필터 */
  visited?: "all" | "yes" | "no";
  /** 상태 필터 */
  decisionStatus?: DecisionStatus | "all";
};

/** 폼에서 다루는 매물 입력 타입 */
export type PropertyFormValues = {
  /** 원본 링크 */
  source_url: string;
  /** 제목 */
  title: string;
  /** 거래유형 */
  deal_type: string;
  /** 주소 */
  address: string;
  /** 현재가 */
  current_price_value: number | null;
  /** 희망가 */
  desired_price_value: number | null;
  /** 방문 여부 */
  visited: boolean;
  /** 방문일(yyyy-mm-dd) */
  visited_at: string;
  /** 위치 점수 */
  rating_location: number | null;
  /** 가격 점수 */
  rating_price: number | null;
  /** 내부 상태 점수 */
  rating_condition: number | null;
  /** 채광 점수 */
  rating_sunlight: number | null;
  /** 주변 환경 점수 */
  rating_environment: number | null;
  /** 장점 */
  pros: string;
  /** 단점 */
  cons: string;
  /** 자유 메모 */
  memo: string;
  /** 상태 */
  decision_status: DecisionStatus;
  /** 대표 이미지 */
  thumbnail_url: string;
};

/** 링크 메타 자동 추출 응답 */
export type PropertyPreview = {
  /** 자동 추출 제목 */
  title?: string;
  /** 자동 추출 주소 */
  address?: string;
  /** 자동 추출 가격 텍스트 */
  priceText?: string;
  /** 자동 추출 거래유형 */
  dealType?: string;
  /** 대표 이미지 URL */
  thumbnailUrl?: string;
};

/** 즐겨찾기 레코드(추후 테이블 매핑용) */
export type PropertyFavoriteRecord = {
  id: string;
  actor_id: string;
  property_id: string;
  created_at: string;
};

/** 최근 본 매물 레코드(추후 테이블 매핑용) */
export type PropertyRecentViewRecord = {
  id: string;
  actor_id: string;
  property_id: string;
  viewed_at: string;
};

/** 평가 기록 레코드(추후 테이블 매핑용) */
export type PropertyRatedItemRecord = {
  id: string;
  actor_id: string;
  property_id: string;
  rating_avg: number;
  rated_at: string;
};

/** 방문 히스토리 레코드(추후 테이블 매핑용) */
export type PropertyVisitHistoryRecord = {
  id: string;
  actor_id: string;
  property_id: string;
  visited_at: string;
  note: string | null;
};
