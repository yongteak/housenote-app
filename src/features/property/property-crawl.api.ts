/**
 * @file property-crawl.api.ts
 * @description hnote RPC 기반 매물 URL 큐·상태 갱신 API.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PropertyCrawlPayload } from "../../types/property-crawl";
import { getPropertyCrawlKind } from "../../types/property-crawl-kind";
import type { PropertyRecord, SelectedActor } from "../../types/property";
import { buildPropertySavePayload } from "./property-crawl.mapper";
import { assertNaverPropertyUrl } from "./naver-property-url";
import {
  createPendingCrawlMeta,
  createRetryCrawlMeta,
  getPropertyCrawlStatus,
  mergeCrawlMeta,
  readPropertyMetadata,
} from "./property-crawl-status";

export type CrawlQueueBuckets = {
  pending: PropertyRecord[];
  completed: PropertyRecord[];
  failed: PropertyRecord[];
};

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }
}

function createQueuePropertyId(): string {
  return crypto.randomUUID();
}

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

async function savePropertyRecord(record: PropertyRecord): Promise<PropertyRecord> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_save_property", {
    p_property: record,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "매물 저장에 실패했습니다.");
  }
  return data as PropertyRecord;
}

async function fetchPropertyRecord(propertyId: string): Promise<PropertyRecord | null> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_get_property", {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data as PropertyRecord | null) ?? null;
}

async function updatePropertyRecord(propertyId: string, patch: Partial<PropertyRecord>): Promise<PropertyRecord> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    throw new Error("매물을 찾을 수 없습니다.");
  }
  const next = {
    ...current,
    ...patch,
    id: propertyId,
    updated_at: new Date().toISOString(),
  } as PropertyRecord;
  return savePropertyRecord(next);
}

async function fetchActorQueueRecords(actor: SelectedActor): Promise<PropertyRecord[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_list_crawl_queue", {
    p_actor_id: actor.actorId,
    p_limit: 200,
  });
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

export async function enqueuePropertyUrl(sourceUrl: string, actor: SelectedActor): Promise<PropertyRecord> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("링크를 붙여넣어 주세요.");
  }
  assertNaverPropertyUrl(trimmed);
  const record = buildPendingPropertyRecord(trimmed, actor);
  return savePropertyRecord(record);
}

export async function listCrawlQueue(actor: SelectedActor): Promise<CrawlQueueBuckets> {
  const records = await fetchActorQueueRecords(actor);
  return bucketQueueRecords(records);
}

export async function listPropertiesPendingCrawl(actorId?: string): Promise<PropertyRecord[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_list_pending_crawl", {
    p_actor_id: actorId ?? null,
    p_limit: 50,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "pending 목록 조회 실패");
  }
  return data as PropertyRecord[];
}

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

export async function completePropertyCrawl(propertyId: string, crawl: PropertyCrawlPayload): Promise<PropertyRecord> {
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
    desired_price_value: current.desired_price_value ?? null,
    visited: current.visited,
    visited_at: current.visited_at ? current.visited_at.slice(0, 10) : "",
    rating_location: current.rating_location,
    rating_price: current.rating_price,
    rating_condition: current.rating_condition,
    rating_sunlight: current.rating_sunlight,
    rating_environment: current.rating_environment,
    pros: current.pros ?? "",
    cons: current.cons ?? "",
    memo: current.memo ?? "",
    decision_status: current.decision_status,
    thumbnail_url: crawl.thumbnail_url ?? current.thumbnail_url ?? "",
  };

  const payload = buildPropertySavePayload(formValues, crawl);
  const crawlMeta = mergeCrawlMeta(current, {
    status: "completed",
    completedAt: new Date().toISOString(),
    errorMessage: null,
  });

  return updatePropertyRecord(propertyId, {
    ...payload,
    metadata: {
      ...payload.metadata,
      crawl: crawlMeta.crawl,
      crawlKind: crawl.metadata?.crawlKind ?? getPropertyCrawlKind(crawl),
      crawledAt: new Date().toISOString(),
      crawlSource: crawl.metadata?.crawlSource ?? "lightpanda-rsc",
    },
  });
}

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
  return updatePropertyRecord(propertyId, { metadata });
}

export async function deleteQueuedProperty(propertyId: string): Promise<void> {
  const current = await fetchPropertyRecord(propertyId);
  if (!current) {
    return;
  }
  const status = getPropertyCrawlStatus(current);
  if (status === "processing") {
    throw new Error("처리 중인 매물은 삭제할 수 없어요.");
  }

  assertSupabaseConfigured();
  const { error } = await supabase.rpc("hnote_delete_property", {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
}
