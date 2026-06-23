/**
 * @file property-crawl-queue.ts
 * @description 매물 크롤링 큐 상태 타입.
 *
 * ## 전체 흐름 (모바일 → PC 크롤러)
 * 1. 사용자가 모바일에서 네이버 부동산 URL을 붙여넣고 「저장」한다.
 * 2. `properties` 레코드가 `metadata.crawl.status = pending` 으로 생성된다.
 * 3. PC(로컬) 크롤러가 `pending` 목록을 주기적으로 조회한다.
 * 4. 크롤러가 항목을 `processing` 으로 바꾼 뒤 Lightpanda 등으로 페이지를 파싱한다.
 * 5. 성공 시 크롤 JSON을 properties 컬럼·metadata에 merge 하고 `completed`.
 * 6. 실패 시 `failed` + `errorMessage` 를 남긴다. 모바일에서 「다시 시도」하면 `pending` 으로 되돌린다.
 *
 * ## PC 크롤러 구현 시 참고
 * - 조회: `listPropertiesPendingCrawl()` (property-crawl.api.ts)
 * - 시작: `markCrawlProcessing(propertyId)`
 * - 완료: `completePropertyCrawl(propertyId, crawlPayload)`
 * - 실패: `failPropertyCrawl(propertyId, errorMessage)`
 * - metadata.crawl.retryCount 를 올려 재시도 횟수를 추적할 수 있다.
 */

/** 크롤 파이프라인 단계 */
export type PropertyCrawlStatus = "pending" | "processing" | "completed" | "failed";

/**
 * properties.metadata.crawl 블록.
 * DB migration 없이 jsonb metadata 로 큐를 표현한다.
 */
export type PropertyCrawlQueueMeta = {
  /** 현재 큐 상태 */
  status: PropertyCrawlStatus;
  /** 모바일에서 URL 저장 시각 (ISO) */
  queuedAt: string;
  /** PC 크롤러가 작업을 가져간 시각 */
  startedAt?: string | null;
  /** 크롤 성공 시각 */
  completedAt?: string | null;
  /** 크롤 실패 시각 */
  failedAt?: string | null;
  /** 사용자에게 보여줄 짧은 실패 사유 */
  errorMessage?: string | null;
  /** pending 으로 재등록된 횟수 */
  retryCount: number;
};

/** metadata 루트에 crawl 키로 저장 */
export type PropertyMetadataWithCrawl = {
  crawl?: PropertyCrawlQueueMeta;
  crawledAt?: string;
  crawlSource?: string;
  [key: string]: unknown;
};
