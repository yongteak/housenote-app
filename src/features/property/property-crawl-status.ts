/**
 * @file property-crawl-status.ts
 * @description properties.metadata.crawl 상태 읽기·쓰기·UI 라벨 유틸.
 *
 * 크롤러·UI 양쪽에서 동일한 metadata 형식을 쓰도록 이 파일만 import 하면 된다.
 */
import type { PropertyRecord } from "../../types/property";
import type { PropertyCrawlQueueMeta, PropertyCrawlStatus, PropertyMetadataWithCrawl } from "../../types/property-crawl-queue";

/** metadata 에 crawl 블록이 없으면 completed 로 간주 (기존 mock·수동 입력 데이터 호환) */
export const DEFAULT_CRAWL_STATUS: PropertyCrawlStatus = "completed";

export function readPropertyMetadata(record: PropertyRecord): PropertyMetadataWithCrawl {
  return (record.metadata ?? {}) as PropertyMetadataWithCrawl;
}

export function getPropertyCrawlMeta(record: PropertyRecord): PropertyCrawlQueueMeta | null {
  return readPropertyMetadata(record).crawl ?? null;
}

/**
 * 매물의 크롤 상태를 반환한다.
 * crawl 메타가 없으면 이미 처리된 레거시 데이터로 본다.
 */
export function getPropertyCrawlStatus(record: PropertyRecord): PropertyCrawlStatus {
  return getPropertyCrawlMeta(record)?.status ?? DEFAULT_CRAWL_STATUS;
}

export function isCrawlCompleted(record: PropertyRecord): boolean {
  return getPropertyCrawlStatus(record) === "completed";
}

export function isCrawlPending(record: PropertyRecord): boolean {
  const status = getPropertyCrawlStatus(record);
  return status === "pending" || status === "processing";
}

export function isCrawlFailed(record: PropertyRecord): boolean {
  return getPropertyCrawlStatus(record) === "failed";
}

/** 화면·배지용 한글 라벨 */
export function getCrawlStatusLabel(status: PropertyCrawlStatus): string {
  switch (status) {
    case "pending":
      return "대기 중";
    case "processing":
      return "처리 중";
    case "completed":
      return "완료";
    case "failed":
      return "실패";
    default:
      return status;
  }
}

/** 사용자에게 보여줄 짧은 설명 */
export function getCrawlStatusDescription(record: PropertyRecord): string {
  const status = getPropertyCrawlStatus(record);
  const meta = getPropertyCrawlMeta(record);

  switch (status) {
    case "pending":
      return "PC에서 순서대로 정보를 가져올 예정이에요.";
    case "processing":
      return "지금 PC에서 매물 정보를 불러오는 중이에요.";
    case "failed":
      return meta?.errorMessage ?? "정보를 가져오지 못했어요. 다시 시도해 주세요.";
    case "completed":
      return "매물 정보를 모두 불러왔어요.";
    default:
      return "";
  }
}

/**
 * 새 pending 큐 항목용 metadata.crawl 초기값.
 * @param queuedAt ISO 시각 (기본: now)
 */
export function createPendingCrawlMeta(queuedAt = new Date().toISOString()): PropertyCrawlQueueMeta {
  return {
    status: "pending",
    queuedAt,
    retryCount: 0,
  };
}

/**
 * 실패 후 재시도 시 pending 으로 되돌릴 metadata.
 */
export function createRetryCrawlMeta(previous: PropertyCrawlQueueMeta | null): PropertyCrawlQueueMeta {
  return {
    status: "pending",
    queuedAt: new Date().toISOString(),
    retryCount: (previous?.retryCount ?? 0) + 1,
    errorMessage: null,
    failedAt: null,
    startedAt: null,
    completedAt: null,
  };
}

/** metadata 객체에 crawl 블록을 merge 한다. */
export function mergeCrawlMeta(
  record: PropertyRecord,
  crawlPatch: Partial<PropertyCrawlQueueMeta> & { status: PropertyCrawlStatus },
): PropertyMetadataWithCrawl {
  const current = readPropertyMetadata(record);
  const prevCrawl = current.crawl ?? createPendingCrawlMeta();

  return {
    ...current,
    crawl: {
      ...prevCrawl,
      ...crawlPatch,
    },
  };
}

/** 목록 URL 표시용 — title 이 없으면 도메인·경로 일부를 잘라 보여준다. */
export function getPropertyDisplayTitle(record: PropertyRecord): string {
  if (record.title?.trim()) {
    return record.title.trim();
  }

  try {
    const url = new URL(record.source_url);
    const tail = url.pathname.split("/").filter(Boolean).at(-1);
    return tail ? `링크 …${tail.slice(-8)}` : url.hostname;
  } catch {
    return "저장한 링크";
  }
}
