/**
 * @file PropertyLocationMap.tsx
 * @description 크롤 좌표 기준 OpenStreetMap + Leaflet 미리보기 (iframe 없음).
 */
import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { resolveMapZoom } from "../../lib/property-map";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

import "leaflet/dist/leaflet.css";

const markerIcon = L.divIcon({
  className: "property-map-marker",
  html: '<span class="property-map-marker-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

type PropertyLocationMapProps = {
  crawl: PropertyCrawlPayload;
};

export function PropertyLocationMap({ crawl }: PropertyLocationMapProps) {
  const latitude = crawl.latitude;
  const longitude = crawl.longitude;
  const zoom = resolveMapZoom(crawl.source_url);
  const sourceUrl = crawl.source_url?.trim();
  const center = useMemo(
    () =>
      latitude != null && longitude != null ? ([latitude, longitude] as [number, number]) : null,
    [latitude, longitude],
  );

  if (!center || !sourceUrl) return null;

  return (
    <div className="property-location-map overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-44 w-full"
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={center} icon={markerIcon} />
      </MapContainer>
      <div className="flex items-center justify-between border-t border-slate-200/60 bg-white px-3 py-2">
        <span className="text-[11px] font-medium text-slate-400">위치 미리보기 · 줌 {zoom}</span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
        >
          크게 보기
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
