/**
 * @file activity-property-lookup.ts
 * @description 활동 목록(즐겨찾기·최근·평가 등)에서 property_id → 매물 레코드 조회.
 */
import type { PropertyRecord } from "../../types/property";

export function createActivityPropertyLookup(properties: PropertyRecord[]) {
  const propertyById = new Map<string, PropertyRecord>();

  for (const property of properties) {
    propertyById.set(property.id, property);
  }

  return {
    resolve(propertyId: string): PropertyRecord | null {
      return propertyById.get(propertyId) ?? null;
    },
  };
}
