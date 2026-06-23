/**
 * @file property-favorites.api.ts
 * @description 매물 즐겨찾기 toggle·목록.
 * 모든 매물 목록/상세에서 FavoriteButton 이 이 API 를 호출한다.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PropertyFavoriteRecord, SelectedActor } from "../../types/property";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }
}

export async function listFavorites(actor: SelectedActor): Promise<PropertyFavoriteRecord[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_list_favorites", {
    p_actor_id: actor.actorId,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "즐겨찾기 목록 조회에 실패했습니다.");
  }
  return data as PropertyFavoriteRecord[];
}

/** toggle 후 새 즐겨찾기 여부 반환 */
export async function toggleFavorite(actor: SelectedActor, propertyId: string): Promise<boolean> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_toggle_favorite", {
    p_actor_id: actor.actorId,
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return Boolean(data);
}

export function getFavoritePropertyIds(actor: SelectedActor | null, favorites: PropertyFavoriteRecord[]): Set<string> {
  if (!actor) {
    return new Set();
  }
  return new Set(favorites.filter((item) => item.actor_id === actor.actorId).map((item) => item.property_id));
}
