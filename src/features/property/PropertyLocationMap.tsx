/**
 * @file PropertyLocationMap.tsx
 * @description 크롤 좌표 기준 OpenStreetMap + Leaflet 미리보기. 클릭 시 네이버 원본 링크로 이동.
 */
import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

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

function OpenSourceOnMapClick({ url }: { url: string }) {
  useMapEvents({
    click: () => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });
  return null;
}

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

  if (!center || !sourceUrl) {
    return null;
  }

  return (
    <div className="property-location-map overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50 [&_.leaflet-container]:cursor-pointer">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-44 w-full"
        scrollWheelZoom={false}
        touchZoom
        dragging
        zoomControl={false}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={center} icon={markerIcon} />
        <OpenSourceOnMapClick url={sourceUrl} />
      </MapContainer>
    </div>
  );
}
