/**
 * @file property-crawl.ts
 * @description Lightpanda RSC 크롤 결과 → properties 테이블 매핑 타입.
 */

/** 크롤 결과 metadata.extras */
export type PropertyCrawlExtras = {
  roomCount?: number | null;
  bathRoomCount?: number | null;
  pyeongArea?: number | null;
  supplySpaceName?: string | null;
  exclusiveSpaceName?: string | null;
  articleFeatureDescription?: string | null;
  articleDescription?: string | null;
  movingInInfo?: Record<string, unknown> | null;
  verificationInfo?: Record<string, unknown> | null;
  facilityInfo?: Record<string, unknown> | null;
  zipCode?: string | null;
  legalDivisionNumber?: string | null;
  totalHouseholdNumber?: number | null;
  dongCount?: number | null;
  constructionCompany?: string | null;
  buildingUse?: string | null;
  useApprovalDate?: string | null;
  approvalElapsedYear?: number | null;
  parkingInfo?: Record<string, unknown> | null;
  heatingAndCoolingInfo?: Record<string, unknown> | null;
  managementOfficeContact?: string | null;
  buildingRatioInfo?: Record<string, unknown> | null;
  isDirectTrade?: boolean | null;
  isArticleImageExist?: boolean | null;
  cpId?: string | null;
  communalComplexInfo?: Record<string, unknown> | null;
  /** 재건축·재개발 등 단지/매물 유형 라벨 (예: 재건축) */
  redevelopmentLabel?: string | null;
  redevelopmentType?: string | null;
};

/** 크롤 metadata 블록 */
export type PropertyCrawlMetadata = {
  crawledAt?: string;
  crawlSource?: string;
  articleKey?: Record<string, unknown> | null;
  basicInfo?: Record<string, unknown> | null;
  complex?: Record<string, unknown> | null;
  extras?: PropertyCrawlExtras;
};

/** properties 컬럼 + metadata에 대응하는 크롤 페이로드 */
export type PropertyCrawlPayload = {
  source_url: string;
  source_domain?: string | null;
  source_listing_id?: string | null;
  title?: string | null;
  property_type?: string | null;
  deal_type?: string | null;
  address?: string | null;
  road_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  current_price_text?: string | null;
  current_price_value?: number | null;
  area_supply_m2?: number | null;
  area_private_m2?: number | null;
  floor_info?: string | null;
  direction?: string | null;
  thumbnail_url?: string | null;
  image_urls?: string[];
  metadata?: PropertyCrawlMetadata;
};
