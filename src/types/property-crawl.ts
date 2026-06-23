/**
 * @file property-crawl.ts
 * @description Lightpanda RSC 크롤 결과 → properties 테이블 매핑 타입.
 */

/** 크롤 대상: 개별 매물(article) 또는 단지 지도 공유(complex) */
export type PropertyCrawlKind = "article" | "complex";

/** 단지 layer 필터 (공유 URL의 평형·거래유형) */
export type ComplexLayerFilter = {
  transactionPyeongTypeNumber?: string | null;
  transactionTradeType?: string | null;
  articleTradeTypes?: string | null;
  pyeongLabel?: string | null;
  dealTypeLabel?: string | null;
};

/** 단지 매물 수 (article/count API) */
export type ComplexListingCounts = {
  dealCount?: number | null;
  leaseDepositCount?: number | null;
  leaseMonthlyCount?: number | null;
  leaseShortTerm?: number | null;
};

/** 단지 실거래 1건 (API·RSC 정규화) */
export type ComplexRecentRealTrade = {
  tradeDate?: string | null;
  priceValue?: number | null;
  priceText?: string | null;
  areaSupplyM2?: number | null;
  areaPrivateM2?: number | null;
  pyeongArea?: number | null;
  floor?: string | null;
  dealType?: string | null;
  raw?: Record<string, unknown> | null;
};

/** 단지 크롤 스냅샷 — UI·metadata에 저장 */
export type ComplexCrawlSnapshot = {
  complexId: string;
  complexNumber?: number | null;
  name?: string | null;
  typeName?: string | null;
  typeCode?: string | null;
  address?: {
    city?: string | null;
    division?: string | null;
    sector?: string | null;
    jibun?: string | null;
    roadName?: string | null;
    zipCode?: string | null;
    legalDivisionNumber?: string | null;
  };
  coordinates?: {
    latitude?: number | null;
    longitude?: number | null;
  };
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
  layerFilter?: ComplexLayerFilter | null;
  listingCounts?: ComplexListingCounts | null;
  listingCountsFiltered?: ComplexListingCounts | null;
  /** inject article/list — 실거래 API 대체 미리보기 */
  listingPreviews?: ComplexRecentRealTrade[];
  priceSource?: "real_trade" | "listing_min" | null;
  injectApiErrors?: string[] | null;
  recentRealTrades?: ComplexRecentRealTrade[];
  realTradesFetchStatus?: "ok" | "rate_limited" | "empty" | "skipped" | "failed" | null;
  raw?: Record<string, unknown> | null;
};

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
  crawlKind?: PropertyCrawlKind;
  crawledAt?: string;
  crawlSource?: string;
  /** article 전용 RSC */
  articleKey?: Record<string, unknown> | null;
  basicInfo?: Record<string, unknown> | null;
  /** article·complex 공통 RSC complex 블록 */
  complex?: Record<string, unknown> | null;
  /** complex 전용 정규화 스냅샷 */
  complexSnapshot?: ComplexCrawlSnapshot | null;
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
