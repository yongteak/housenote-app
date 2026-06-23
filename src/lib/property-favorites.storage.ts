/**
 * @file property-favorites.storage.ts
 * @description 즐겨찾기 localStorage 저장 (Supabase 미연결 MVP).
 */
import type { PropertyFavoriteRecord } from "../types/property";

const STORAGE_KEY = "hnote:property-favorites";

function readAll(): PropertyFavoriteRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PropertyFavoriteRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: PropertyFavoriteRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listStoredFavorites(actorId: string): PropertyFavoriteRecord[] {
  return readAll().filter((item) => item.actor_id === actorId);
}

export function isStoredFavorite(actorId: string, propertyId: string): boolean {
  return readAll().some((item) => item.actor_id === actorId && item.property_id === propertyId);
}

export function addStoredFavorite(record: PropertyFavoriteRecord): void {
  const all = readAll().filter(
    (item) => !(item.actor_id === record.actor_id && item.property_id === record.property_id),
  );
  all.unshift(record);
  writeAll(all);
}

export function removeStoredFavorite(actorId: string, propertyId: string): void {
  writeAll(readAll().filter((item) => !(item.actor_id === actorId && item.property_id === propertyId)));
}

export function replaceStoredFavorites(records: PropertyFavoriteRecord[]): void {
  writeAll(records);
}
