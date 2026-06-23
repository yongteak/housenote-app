/**
 * @file property-crawl-queue.storage.ts
 * @description Supabase 미연결 환경에서 크롤 큐 매물을 localStorage 에 보관한다.
 *
 * ## PC 크롤러 연동 전 (현재 MVP)
 * - 모바일에서 저장한 pending 매물은 이 저장소 + mock worker 로 시뮬레이션한다.
 * - Supabase 연결 후에는 property-crawl.api.ts 가 DB 를 우선 사용하고,
 *   이 파일은 fallback·오프라인용으로만 남는다.
 */
import type { PropertyRecord } from "../../types/property";
import type { SelectedActor } from "../../types/property";

const STORAGE_KEY = "hnote:crawl-queue-properties";

function readAll(): PropertyRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PropertyRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: PropertyRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function listStoredQueueProperties(actor: SelectedActor | null): PropertyRecord[] {
  if (!actor) {
    return [];
  }

  return readAll().filter((record) => record.actor_id === actor.actorId);
}

export function getStoredQueueProperty(propertyId: string): PropertyRecord | null {
  return readAll().find((record) => record.id === propertyId) ?? null;
}

export function upsertStoredQueueProperty(record: PropertyRecord): PropertyRecord {
  const all = readAll();
  const index = all.findIndex((item) => item.id === record.id);

  if (index >= 0) {
    all[index] = record;
  } else {
    all.unshift(record);
  }

  writeAll(all);
  return record;
}

export function removeStoredQueueProperty(propertyId: string): void {
  writeAll(readAll().filter((record) => record.id !== propertyId));
}

/** 개발용: 저장소 전체 비우기 */
export function clearStoredQueueProperties(): void {
  localStorage.removeItem(STORAGE_KEY);
}
