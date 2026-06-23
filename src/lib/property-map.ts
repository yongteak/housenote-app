/**
 * @file property-map.ts
 * @description 크롤 좌표·URL 기준 지도 줌·외부 링크 유틸.
 */

const DEFAULT_MAP_ZOOM = 16;
const MIN_MAP_ZOOM = 10;
const MAX_MAP_ZOOM = 18;

/** fin.land 지도 URL의 zoom 쿼리 파싱 (없으면 null) */
export function parseFinLandMapZoom(sourceUrl: string): number | null {
  try {
    const url = new URL(sourceUrl);
    const zoomParam = url.searchParams.get("zoom");
    if (!zoomParam) return null;
    const zoom = Math.round(Number(zoomParam));
    if (!Number.isFinite(zoom)) return null;
    return clampMapZoom(zoom);
  } catch {
    return null;
  }
}

export function clampMapZoom(zoom: number): number {
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, zoom));
}

export function resolveMapZoom(sourceUrl: string | null | undefined, fallback = DEFAULT_MAP_ZOOM): number {
  if (sourceUrl?.includes("fin.land.naver.com/map")) {
    const parsed = parseFinLandMapZoom(sourceUrl);
    if (parsed != null) return parsed;
  }
  return fallback;
}
