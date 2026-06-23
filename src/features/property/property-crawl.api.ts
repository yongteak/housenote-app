/**
 * @file property-crawl.api.ts
 * @description 매물 URL 큐 등록·조회·재시도·PC 크롤러 연동 API.
 *
 * ┌─────────────┐     enqueue URL      ┌──────────────────┐
 * │ 모바일 앱    │ ──────────────────► │ properties       │
 * │ /properties │   status=pending    │ metadata.crawl   │
 * │ /new        │                     └────────┬─────────┘
 * └─────────────┘                              │
 *                                              │ poll pending
 *                                              ▼
 *                                     ┌──────────────────┐
 *                                     │ PC 크롤러         │
 *                                     │ (Lightpanda 등)   │
 *                                     │ mark processing   │
 *                                     │ complete / fail   │
 *                                     └──────────────────┘
 *
 * ## PC 크롤러가 구현해야 할 함수 (이 파일 export)
 * 1. `listPropertiesPendingCrawl()` — pending 목록 조회
 * 2. `markCrawlProcessing(propertyId)` — processing 으로 잠금
 * 3. `completePropertyCrawl(propertyId, payload)` — 파싱 결과 반영
 * 4. `failPropertyCrawl(propertyId, message)` — 실패 기록
 *
 * ## 모바일 앱이 쓰는 함수
 * - `enqueuePropertyUrl(sourceUrl, actor)` — URL 저장 (pending 생성)
 * - `listCrawlQueue(actor)` — 저장 화면 하단 목록
 * - `retryPropertyCrawl(propertyId, actor)` — failed → pending
 * - `deleteQueuedProperty(propertyId)` — pending/failed 삭제
 *
 * Supabase 미설정 시 localStorage + mock worker 로 동일 흐름을 시뮬레이션한다.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PropertyCrawlPayload } from "../../types/property-crawl";
import type { PropertyRecord, SelectedActor } from "../../types/property";
import { searchPropertyByUrl } from "./mock-crawl.api";
import { buildPropertySavePayload } from "./property-crawl.mapper";
import {
  createPendingCrawlMeta,
  createRetryCrawlMeta,
  getPropertyCrawlStatus,
  mergeCrawlMeta,
  readPropertyMetadata,
} from "./property-crawl-status";
import {
  getStoredQueueProperty,
  listStoredQueueProperties,
  removeStoredQueueProperty,
  upsertStoredQueueProperty,
} from "./property-crawl-queue.storage";

const BALPOOM_SCHEMA = "balpoom";

/** mock PC worker 가 이미 돌고 있는 property id (중복 실행 방지) */
const processingIds = new Set<string>();

export type CrawlQueueBuckets = {
  /** PC 크롤 대기 + 처리 중 */
  pending: PropertyRecord[];
  /** 크롤 완료 (최 recent) */
  completed: PropertyRecord[];
  /** 크롤 실패 */
  failed: PropertyRecord[];
};

function assertNaverLandUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("링크 형식이 올바르지 않아요.");
  }

  if (!parsed.hostname.includes("naver.com")) {
    throw new Error("네이버 부동산 링크만 저장할 수 있어요.");
  }
}

function createQueuePropertyId(): string {
  return crypto.randomUUID();
}

/**
 * URL만 담긴 pending 매물 레코드 골격.
 * PC 크롤러가 title/address/price 등을 채운다.
 */
function buildPendingPropertyRecord(sourceUrl: string, actor: SelectedActor): PropertyRecord {
  const now = new Date().toISOString();
  let sourceDomain: string | null = null;

  try {
    sourceDomain = new URL(sourceUrl).hostname;
  } catch {
    sourceDomain = null;
  }

  return {
    id: createQueuePropertyId(),
    actor_id: actor.actorId,
    phone_suffix: actor.phoneSuffix,
    actor_name: actor.actorName,
    source_url: sourceUrl,
    source_domain: sourceDomain,
    source_listing_id: null,
    title: null,
    property_type: null,
    deal_type: null,
    address: null,
    road_address: null,
    latitude: null,
    longitude: null,
    current_price_text: null,
    current_price_value: null,
    desired_price_value: null,
    area_supply_m2: null,
    area_private_m2: null,
    floor_info: null,
    direction: null,
    thumbnail_url: null,
    image_urls: [],
    metadata: {
      crawl: createPendingCrawlMeta(now),
    },
    visited: false,
    visited_at: null,
    rating_location: null,
    rating_price: null,
    rating_condition: null,
    rating_sunlight: null,
    rating_environment: null,
    pros: null,
    cons: null,
    memo: null,
    decision_status: "review",
    created_at: now,
    updated_at: now,
  };
}

async function insertPropertyRecord(record: PropertyRecord): Promise<PropertyRecord> {
  if (!isSupabaseConfigured()) {
    return upsertStoredQueueProperty(record);
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .insert(record)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "매물 저장에 실패했습니다.");
  }

  return data as PropertyRecord;
}

async function updatePropertyRecord(propertyId: string, patch: Partial<PropertyRecord>): Promise<PropertyRecord> {
  if (!isSupabaseConfigured()) {
    const current = getStoredQueueProperty(propertyId);
    if (!current) {
      throw new Error("매물을 찾을 수 없습니다.");
    }

    const next = {
      ...current,
      ...patch,
      updated_at: new Date().toISOString(),
    } as PropertyRecord;

    return upsertStoredQueueProperty(next);
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", propertyId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "매물 업데이트에 실패했습니다.");
  }

  return data as PropertyRecord;
}

async function fetchPropertyRecord(propertyId: string): Promise<PropertyRecord | null> {
  if (!isSupabaseConfigured()) {
    return getStoredQueueProperty(propertyId);
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PropertyRecord | null) ?? null;
}

async function fetchActorQueueRecords(actor: SelectedActor): Promise<PropertyRecord[]> {
  if (!isSupabaseConfigured()) {
    return listStoredQueueProperties(actor);
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .select("*")
    .eq("actor_id", actor.actorId)
    .not("metadata->crawl", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    throw new Error(error?.message ?? "크롤 목록 조회에 실패했습니다.");
  }

  return data as PropertyRecord[];
}

function bucketQueueRecords(records: PropertyRecord[]): CrawlQueueBuckets {
  const pending: PropertyRecord[] = [];
  const completed: PropertyRecord[] = [];
  const failed: PropertyRecord[] = [];

  for (const record of records) {
    const status = getPropertyCrawlStatus(record);
    if (status === "pending" || status === "processing") {
      pending.push(record);
    } else if (status === "failed") {
      failed.push(record);
    } else {
      completed.push(record);
    }
  }

  return { pending, completed, failed };
}

/**
 * 모바일: 네이버 부동산 URL을 큐에 등록한다.
 * 즉시 크롤하지 않고 pending 상태로 PC 작업 대기열에 넣는다.
 */
export async function enqueuePropertyUrl(sourceUrl: string, actor: SelectedActor): Promise<PropertyRecord> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("링크를 붙여넣어 주세요.");
  }

  assertNaverLandUrl(trimmed);

  const record = buildPendingPropertyRecord(trimmed, actor);
  const saved = await insertPropertyRecord(record);

  scheduleMockPcWorker(saved.id);

  return saved;
}

/** 저장 화면 하단: pending / completed / failed 버킷. */
export async function listCrawlQueue(actor: SelectedActor): Promise<CrawlQueueBuckets> {
  const records = await fetchActorQueueRecords(actor);
  return bucketQueueRecords(records);
}

/**
 * PC 크롤러: pending 항목만 조회.
 * @param actorId 특정 저장자만 (없으면 전체 — PC 배치용)
 */
export async function listPropertiesPendingCrawl(actorId?: string): Promise<PropertyRecord[]> {
  if (!isSupabaseConfigured()) {
    const records = listStoredQueueProperties(
      actorId ? { actorId, actorName: "", phoneSuffix: "" } : null,
    );
    return records.filter((record) => getPropertyCrawlStatus(record) === "pending");
  }

  let query = supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .select("*")
    .eq("metadata->crawl->>status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (actorId) {
    query = query.eq("actor_id", actorId);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "pending 목록 조회 실패");
  }

  return data as PropertyRecord[];
}

/** PC 크롤러: 작업 시작 — pending → processing */
export async function markCrawlProcessing(propertyId: string): Promise<PropertyRecord> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    throw new Error("매물을 찾을 수 없습니다.");
  }

  const metadata = mergeCrawlMeta(current, {
    status: "processing",
    startedAt: new Date().toISOString(),
  });

  return updatePropertyRecord(propertyId, { metadata });
}

/** PC 크롤러: 크롤 성공 — payload 를 properties 컬럼에 merge. */
export async function completePropertyCrawl(
  propertyId: string,
  crawl: PropertyCrawlPayload,
): Promise<PropertyRecord> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    throw new Error("매물을 찾을 수 없습니다.");
  }

  const formValues = {
    source_url: crawl.source_url,
    title: crawl.title ?? "",
    deal_type: crawl.deal_type ?? "매매",
    address: crawl.address ?? "",
    current_price_value: crawl.current_price_value ?? null,
    desired_price_value: null,
    visited: current.visited,
    visited_at: current.visited_at ? current.visited_at.slice(0, 10) : "",
    rating_location: current.rating_location,
    rating_price: current.rating_price,
    rating_condition: current.rating_condition,
    rating_sunlight: null,
    rating_environment: null,
    pros: current.pros ?? "",
    cons: current.cons ?? "",
    memo: current.memo ?? "",
    decision_status: current.decision_status,
    thumbnail_url: crawl.thumbnail_url ?? "",
  };

  const payload = buildPropertySavePayload(formValues, crawl);
  const metadata = mergeCrawlMeta(current, {
    status: "completed",
    completedAt: new Date().toISOString(),
    errorMessage: null,
  });

  return updatePropertyRecord(propertyId, {
    ...payload,
    metadata: {
      ...payload.metadata,
      ...metadata,
      crawledAt: new Date().toISOString(),
      crawlSource: crawl.metadata?.crawlSource ?? "lightpanda-rsc",
    },
  });
}

/** PC 크롤러: 크롤 실패 */
export async function failPropertyCrawl(propertyId: string, errorMessage: string): Promise<PropertyRecord> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    throw new Error("매물을 찾을 수 없습니다.");
  }

  const metadata = mergeCrawlMeta(current, {
    status: "failed",
    failedAt: new Date().toISOString(),
    errorMessage,
  });

  return updatePropertyRecord(propertyId, { metadata });
}

/** 모바일: failed → pending 재등록. */
export async function retryPropertyCrawl(propertyId: string): Promise<PropertyRecord> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    throw new Error("매물을 찾을 수 없습니다.");
  }

  const prevCrawl = readPropertyMetadata(current).crawl ?? null;
  const metadata = {
    ...readPropertyMetadata(current),
    crawl: createRetryCrawlMeta(prevCrawl),
  };

  const saved = await updatePropertyRecord(propertyId, { metadata });
  scheduleMockPcWorker(saved.id);
  return saved;
}

/** 모바일: pending/failed/completed 항목 삭제 */
export async function deleteQueuedProperty(propertyId: string): Promise<void> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    return;
  }

  const status = getPropertyCrawlStatus(current);
  if (status === "processing") {
    throw new Error("처리 중인 매물은 삭제할 수 없어요.");
  }

  if (!isSupabaseConfigured()) {
    removeStoredQueueProperty(propertyId);
    return;
  }

  const { error } = await supabase.schema(BALPOOM_SCHEMA).from("properties").delete().eq("id", propertyId);
  if (error) {
    throw new Error(error.message);
  }
}

function scheduleMockPcWorker(propertyId: string) {
  if (isSupabaseConfigured()) {
    return;
  }

  if (processingIds.has(propertyId)) {
    return;
  }

  processingIds.add(propertyId);

  window.setTimeout(() => {
    void runMockPcWorkerJob(propertyId).finally(() => {
      processingIds.delete(propertyId);
    });
  }, 1500);
}

async function runMockPcWorkerJob(propertyId: string) {
  try {
    const current = await fetchPropertyRecord(propertyId);
    if (!current || getPropertyCrawlStatus(current) !== "pending") {
      return;
    }

    await markCrawlProcessing(propertyId);

    if (current.source_url.includes("#fail")) {
      await failPropertyCrawl(propertyId, "페이지를 열 수 없어요. 링크가 만료됐을 수 있어요.");
      return;
    }

    const crawl = await searchPropertyByUrl(current.source_url);
    await completePropertyCrawl(propertyId, crawl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    await failPropertyCrawl(propertyId, message);
  }
}

export function getQueuePropertyFromStorage(propertyId: string): PropertyRecord | null {
  return getStoredQueueProperty(propertyId);
}

export function listCompletedQueuePropertiesForHome(actor: SelectedActor | null): PropertyRecord[] {
  if (!actor) {
    return [];
  }

  return listStoredQueueProperties(actor).filter((record) => getPropertyCrawlStatus(record) === "completed");
}
