/**
 * @file property.api.ts
 * @description balpoom.properties CRUD와 목록 필터 조회를 담당한다.
 */
import { getMockProperty } from "../../fixtures/mobile-mvp-ui-mock";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { buildPropertySavePayload } from "./property-crawl.mapper";
import { getQueuePropertyFromStorage } from "./property-crawl.api";
import { removeStoredQueueProperty } from "./property-crawl-queue.storage";
import type { PropertyCrawlPayload } from "../../types/property-crawl";
import type {
  PropertyFilters,
  PropertyFormValues,
  PropertyRecord,
  SelectedActor,
} from "../../types/property";
const BALPOOM_SCHEMA = "balpoom";

/**
 * 로컬 mock·크롤 큐에서 매물을 동기 조회한다.
 * 즐겨찾기 목록 등 propertyId lookup 에 사용.
 */
export function resolveLocalProperty(propertyId: string, actor: SelectedActor | null): PropertyRecord | null {
  return getQueuePropertyFromStorage(propertyId) ?? getMockProperty(propertyId, actor);
}

/**
 * 매물 목록을 필터 조건으로 조회한다.
 * @param filters 저장자/방문/상태 필터
 */
export async function listProperties(filters: PropertyFilters): Promise<PropertyRecord[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  let query = supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId);
  }
  if (filters.visited === "yes") {
    query = query.eq("visited", true);
  }
  if (filters.visited === "no") {
    query = query.eq("visited", false);
  }
  if (filters.decisionStatus && filters.decisionStatus !== "all") {
    query = query.eq("decision_status", filters.decisionStatus);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "매물 목록 조회에 실패했습니다.");
  }

  return data as PropertyRecord[];
}

/**
 * 상세 화면용 매물 단건을 조회한다.
 * @param propertyId 매물 ID
 */
export async function getProperty(propertyId: string): Promise<PropertyRecord | null> {
  if (!isSupabaseConfigured()) {
    return getQueuePropertyFromStorage(propertyId);
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

/**
 * 신규/수정 저장을 수행한다.
 * @param values 폼 입력값
 * @param actor 현재 선택 저장자
 * @param propertyId 수정 모드면 대상 ID
 */
export async function saveProperty(
  values: PropertyFormValues,
  actor: SelectedActor,
  propertyId?: string,
  crawl?: PropertyCrawlPayload | null,
): Promise<PropertyRecord> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }

  const payload = {
    actor_id: actor.actorId,
    phone_suffix: actor.phoneSuffix,
    actor_name: actor.actorName,
    ...buildPropertySavePayload(values, crawl ?? null),
    updated_at: new Date().toISOString(),
  };

  if (propertyId) {
    const { data, error } = await supabase
      .schema(BALPOOM_SCHEMA)
      .from("properties")
      .update(payload)
      .eq("id", propertyId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "매물 수정에 실패했습니다.");
    }

    return data as PropertyRecord;
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("properties")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "매물 저장에 실패했습니다.");
  }

  return data as PropertyRecord;
}

/**
 * 매물 1건을 삭제한다.
 * @param propertyId 삭제할 매물 ID
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    removeStoredQueueProperty(propertyId);
    return;
  }

  const { error } = await supabase.schema(BALPOOM_SCHEMA).from("properties").delete().eq("id", propertyId);
  if (error) {
    throw new Error(error.message);
  }
}
