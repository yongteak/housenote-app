import L from "leaflet";

import { formatPriceEok, formatPyeong } from "../../lib/format";
import type { PropertyRecord } from "../../types/property";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readMetadataString(metadata: PropertyRecord["metadata"], path: string[]): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  let current: unknown = metadata;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim().length > 0 ? current.trim() : null;
}

function readMetadataNumber(metadata: PropertyRecord["metadata"], path: string[]): number | null {
  if (!metadata || typeof metadata !== "object") return null;

  let current: unknown = metadata;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return null;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "number" && !Number.isNaN(current) ? current : null;
}

export function getComplexKey(property: PropertyRecord): string {
  const fromMetadata =
    readMetadataString(property.metadata, ["complex", "name"]) ??
    readMetadataString(property.metadata, ["extras", "communalComplexInfo", "complexName"]) ??
    readMetadataString(property.metadata, ["basicInfo", "communalComplexInfo", "complexName"]);

  if (fromMetadata) return fromMetadata;

  const title = property.title?.trim();
  if (title) {
    const withoutUnit = title.replace(/\s+\d+[A-Za-z]?$/, "").trim();
    if (withoutUnit.length > 0) return withoutUnit;
    return title;
  }

  return property.address?.trim() || property.id;
}

type MappableProperty = PropertyRecord & { latitude: number; longitude: number };

export function getLocationGroupKeyFromLatLng(latitude: number, longitude: number): string {
  const latKey = Math.round(latitude * 4000) / 4000;
  const lngKey = Math.round(longitude * 4000) / 4000;
  return `${latKey}:${lngKey}`;
}

export function getLocationGroupKey(property: MappableProperty): string {
  return getLocationGroupKeyFromLatLng(property.latitude, property.longitude);
}

export function getPropertiesInLocationGroup<T extends MappableProperty>(properties: T[], groupKey: string): T[] {
  return properties.filter((property) => getLocationGroupKey(property) === groupKey);
}

export function getActualPriceValue(property: PropertyRecord): number | null {
  const fromMetadata =
    readMetadataNumber(property.metadata, ["actual_transaction_price"]) ??
    readMetadataNumber(property.metadata, ["basicInfo", "priceInfo", "recentTradePrice"]);

  if (fromMetadata != null) return fromMetadata;
  if (property.desired_price_value != null) return property.desired_price_value;
  return null;
}

export type MapPropertyStats = {
  propertyCount: number;
  complexCount: number;
};

export function getMapPropertyStats(properties: PropertyRecord[]): MapPropertyStats {
  const mappable = properties.filter(
    (property): property is PropertyRecord & { latitude: number; longitude: number } =>
      typeof property.latitude === "number" && typeof property.longitude === "number",
  );

  return {
    propertyCount: mappable.length,
    complexCount: new Set(mappable.map(getComplexKey)).size,
  };
}

export function createPropertyMarkerIcon(property: PropertyRecord, selected = false): L.DivIcon {
  const pyeongLabel = formatPyeong(property.area_supply_m2);
  const listingPrice = formatPriceEok(property.current_price_value);
  const actualPrice = formatPriceEok(getActualPriceValue(property));
  const selectedClass = selected ? " property-map-price-marker--selected" : "";

  const html = `
    <div class="property-map-price-marker${selectedClass}">
      <div class="property-map-price-marker-card">
        <div class="property-map-price-marker-header">${escapeHtml(pyeongLabel)}</div>
        <div class="property-map-price-marker-body">
          <div class="property-map-price-marker-row">
            <span class="property-map-price-marker-label">매</span>
            <span class="property-map-price-marker-value">${escapeHtml(listingPrice)}</span>
          </div>
          <div class="property-map-price-marker-row property-map-price-marker-row-actual">
            <span class="property-map-price-marker-label">실</span>
            <span class="property-map-price-marker-value">${escapeHtml(actualPrice)}</span>
          </div>
        </div>
      </div>
      <div class="property-map-price-marker-pin" aria-hidden="true"></div>
    </div>
  `;

  return L.divIcon({
    className: "property-map-price-marker-wrap",
    html,
    iconSize: [92, 78],
    iconAnchor: [46, 78],
  });
}

export function createClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();

  return L.divIcon({
    className: "property-map-cluster-wrap",
    html: `<div class="property-map-cluster"><span>${count}</span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}
