/**
 * @file activity-property-lookup.ts
 * @description 활동 목록(즐겨찾기·최근·평가 등)에서 property_id → 매물 레코드 조회.
 * 홈 전체 목록이 아닌, 해당 활동에 포함된 ID만 resolve 한다.
 */
import { getMockProperties } from "../../fixtures/mobile-mvp-ui-mock";
import { resolveLocalProperty } from "../property/property.api";
import { listCompletedQueuePropertiesForHome } from "../property/property-crawl.api";
import type { PropertyRecord, SelectedActor } from "../../types/property";

export function createActivityPropertyLookup(actor: SelectedActor | null | undefined) {
  const propertyById = new Map<string, PropertyRecord>();

  for (const property of [
    ...listCompletedQueuePropertiesForHome(actor),
    ...getMockProperties(actor),
  ]) {
    propertyById.set(property.id, property);
  }

  return {
    resolve(propertyId: string): PropertyRecord | null {
      return propertyById.get(propertyId) ?? resolveLocalProperty(propertyId, actor);
    },
  };
}
