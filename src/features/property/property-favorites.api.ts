/**
 * @file property-favorites.api.ts
 * @description 매물 즐겨찾기 toggle·목록.
 * 모든 매물 목록/상세에서 FavoriteButton 이 이 API 를 호출한다.
 */
import { getMockFavorites } from "../../fixtures/mobile-mvp-ui-mock";
import {
  addStoredFavorite,
  isStoredFavorite,
  listStoredFavorites,
  removeStoredFavorite,
  replaceStoredFavorites,
} from "../../lib/property-favorites.storage";
import { isSupabaseConfigured } from "../../lib/supabase";
import type { PropertyFavoriteRecord, SelectedActor } from "../../types/property";

let seeded = false;

/** 최초 1회 mock 즐겨찾기를 storage 에 복사 (데모 데이터) */
function seedFromMockIfEmpty(actor: SelectedActor) {
  if (seeded) {
    return;
  }
  seeded = true;

  if (listStoredFavorites(actor.actorId).length > 0) {
    return;
  }

  const mock = getMockFavorites(actor);
  if (mock.length === 0) {
    return;
  }

  const existing = listStoredFavorites(actor.actorId);
  replaceStoredFavorites([...mock, ...existing]);
}

export async function listFavorites(actor: SelectedActor): Promise<PropertyFavoriteRecord[]> {
  seedFromMockIfEmpty(actor);

  if (!isSupabaseConfigured()) {
    return listStoredFavorites(actor.actorId);
  }

  // TODO: Supabase property_favorites 테이블 연동
  return listStoredFavorites(actor.actorId);
}

export async function isFavorite(actor: SelectedActor, propertyId: string): Promise<boolean> {
  await listFavorites(actor);
  return isStoredFavorite(actor.actorId, propertyId);
}

/** toggle 후 새 즐겨찾기 여부 반환 */
export async function toggleFavorite(actor: SelectedActor, propertyId: string): Promise<boolean> {
  seedFromMockIfEmpty(actor);

  const favorited = isStoredFavorite(actor.actorId, propertyId);

  if (favorited) {
    removeStoredFavorite(actor.actorId, propertyId);
    return false;
  }

  addStoredFavorite({
    id: crypto.randomUUID(),
    actor_id: actor.actorId,
    property_id: propertyId,
    created_at: new Date().toISOString(),
  });

  return true;
}

export function getFavoritePropertyIds(actor: SelectedActor | null, favorites: PropertyFavoriteRecord[]): Set<string> {
  if (!actor) {
    return new Set();
  }
  return new Set(favorites.filter((item) => item.actor_id === actor.actorId).map((item) => item.property_id));
}
