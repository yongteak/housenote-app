/**
 * @file property.api.ts
 * @description hnote RPC 기반 매물 CRUD·목록 조회.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { buildPropertySavePayload } from "./property-crawl.mapper";
import type { PropertyCrawlPayload } from "../../types/property-crawl";
import type {
  PropertyFilters,
  PropertyFormValues,
  PropertyRecord,
  SelectedActor
} from "../../types/property";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }
}

/**
 * 매물 목록을 필터 조건으로 조회한다.
 * @param filters 저장자/방문/상태 필터
 */
export async function listProperties(filters: PropertyFilters): Promise<PropertyRecord[]> {
  assertSupabaseConfigured();

  const visitedFilter = filters.visited === "yes" ? true : filters.visited === "no" ? false : null;
  const decisionStatus = filters.decisionStatus && filters.decisionStatus !== "all" ? filters.decisionStatus : null;

  const { data, error } = await supabase.rpc("hnote_list_properties", {
    p_actor_id: filters.actorId ?? null,
    p_visited: visitedFilter,
    p_decision_status: decisionStatus,
    p_limit: 200,
  });

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
  assertSupabaseConfigured();
  if (!propertyId) {
    return null;
  }

  const { data, error } = await supabase.rpc("hnote_get_property", {
    p_property_id: propertyId,
  });

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
  assertSupabaseConfigured();

  const basePayload = {
    actor_id: actor.actorId,
    phone_suffix: actor.phoneSuffix,
    actor_name: actor.actorName,
    ...buildPropertySavePayload(values, crawl ?? null),
    id: propertyId,
    updated_at: new Date().toISOString()
  };

  const payload = propertyId ? basePayload : { ...basePayload, created_at: new Date().toISOString() };
  const { data, error } = await supabase.rpc("hnote_save_property", {
    p_property: payload,
  });

  if (error || !data) {
    throw new Error(error?.message ?? (propertyId ? "매물 수정에 실패했습니다." : "매물 저장에 실패했습니다."));
  }

  return data as PropertyRecord;
}

/**
 * 매물 1건을 삭제한다.
 * @param propertyId 삭제할 매물 ID
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  assertSupabaseConfigured();

  const { error } = await supabase.rpc("hnote_delete_property", {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
}
