/**
 * @file actor-storage.ts
 * @description 저장자(아빠/엄마) 선택값을 localStorage에 보관하고 읽는 유틸.
 */
import type { SelectedActor } from "../types/property";

/** 저장자 선택값 localStorage 키 */
const ACTOR_STORAGE_KEY = "balpoom:selected-actor";

/**
 * 현재 저장된 저장자 정보를 읽는다.
 */
export function getSelectedActor(): SelectedActor | null {
  const rawValue = localStorage.getItem(ACTOR_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SelectedActor;
  } catch {
    return null;
  }
}

/**
 * 저장자 정보를 로컬에 저장한다.
 * @param actor 선택한 저장자 정보
 */
export function setSelectedActor(actor: SelectedActor) {
  localStorage.setItem(ACTOR_STORAGE_KEY, JSON.stringify(actor));
}

/** 저장자 선택값을 초기화한다. */
export function clearSelectedActor() {
  localStorage.removeItem(ACTOR_STORAGE_KEY);
}
