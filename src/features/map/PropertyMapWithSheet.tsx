import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import FileText from "lucide-react/dist/esm/icons/file-text";

import { PropertyRatingSummary } from "../../components/PropertyRatingSummary";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { MapFilterStatsBar } from "./MapFilterStatsBar";
import { MapFloatingControls, RegisterMap } from "./MapFloatingControls";
import { PropertyMarkerClusterLayer } from "./PropertyMarkerClusterLayer";
import {
  getLocationGroupKey,
  getMapPropertyStats,
  getPropertiesInLocationGroup,
} from "./propertyMapMarkers";
import {
  getPropertyAverageRating,
} from "../property/property-ratings";
import { formatDate, formatPriceEok, formatPyeong, formatWon } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { DecisionStatus, PropertyRecord } from "../../types/property";

import "leaflet/dist/leaflet.css";

const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

const userLocationIcon = L.divIcon({
  className: "property-map-user-location",
  html: '<span class="property-map-user-location-dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

type MapInitialViewProps = {
  center: [number, number];
  zoom: number;
};

function MapInitialView({ center, zoom }: MapInitialViewProps) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    map.setView(center, zoom, { animate: false });
    initializedRef.current = true;
  }, [center, map, zoom]);

  return null;
}

type MapFocusSelectionProps = {
  property: (PropertyRecord & { latitude: number; longitude: number }) | null;
  exploredGroupKey: string | null;
};

function MapFocusSelection({ property, exploredGroupKey }: MapFocusSelectionProps) {
  const map = useMap();
  const lastFocusedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!property) {
      lastFocusedIdRef.current = null;
      return;
    }

    if (lastFocusedIdRef.current === property.id) return;

    const groupKey = getLocationGroupKey(property);
    const isSameGroupSwitch =
      exploredGroupKey != null && groupKey === exploredGroupKey && lastFocusedIdRef.current != null;

    lastFocusedIdRef.current = property.id;
    if (isSameGroupSwitch) return;

    const point = map.latLngToContainerPoint([property.latitude, property.longitude]);
    const size = map.getSize();
    const paddingX = 72;
    const paddingTop = 96;
    const paddingBottom = 220;
    const inView =
      point.x > paddingX &&
      point.x < size.x - paddingX &&
      point.y > paddingTop &&
      point.y < size.y - paddingBottom;

    if (!inView) {
      map.panTo([property.latitude, property.longitude], { animate: true, duration: 0.35 });
    }
  }, [exploredGroupKey, map, property]);

  return null;
}

type MapPropertyGroupSwitcherProps = {
  properties: Array<PropertyRecord & { latitude: number; longitude: number }>;
  selectedId: string;
  onSelect: (propertyId: string) => void;
};

function MapPropertyGroupSwitcher({ properties, selectedId, onSelect }: MapPropertyGroupSwitcherProps) {
  if (properties.length <= 1) return null;

  return (
    <div className="px-4 pb-3">
      <p className="mb-2 text-[11px] font-semibold text-slate-500">같은 위치 매물 {properties.length}건</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {properties.map((property) => {
          const selected = property.id === selectedId;
          return (
            <button
              key={property.id}
              type="button"
              onClick={() => onSelect(property.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                selected ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-700",
              )}
            >
              {formatPyeong(property.area_supply_m2)} · {formatPriceEok(property.current_price_value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatArea(property: PropertyRecord): string {
  if (property.area_supply_m2 == null || property.area_private_m2 == null) return "-";
  return `${property.area_supply_m2.toFixed(1)}㎡ / ${property.area_private_m2.toFixed(1)}㎡`;
}

type PropertyMapSheetHeaderActionsProps = {
  sourceUrl: string;
  onOpenDetail: () => void;
};

function PropertyMapSheetHeaderActions({ sourceUrl, onOpenDetail }: PropertyMapSheetHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600 transition hover:text-emerald-700 active:opacity-70"
        onClick={onOpenDetail}
      >
        <FileText className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span>상세</span>
      </button>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-700 active:opacity-70"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span>원본</span>
      </a>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-[12px] text-slate-500">{label}</span>
      <span className="text-right text-[13px] font-semibold text-slate-900">{value}</span>
    </div>
  );
}

type PropertyMapDetailProps = {
  property: PropertyRecord;
};

function PropertyMapDetail({ property }: PropertyMapDetailProps) {
  const ratingAvg = getPropertyAverageRating(property);
  const priceGap =
    property.current_price_value != null && property.desired_price_value != null
      ? property.current_price_value - property.desired_price_value
      : null;

  return (
    <div className="space-y-4 px-4 pb-6 pt-1">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
          {property.thumbnail_url ? (
            <img src={property.thumbnail_url} alt={property.title ?? "매물"} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold leading-tight text-slate-950">{property.title ?? "제목 없음"}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{property.address ?? "-"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {property.property_type ?? "매물"}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {property.deal_type ?? "-"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        <p className="text-[12px] text-slate-500">등록가</p>
        <p className="text-[22px] font-bold text-slate-950">{formatWon(property.current_price_value)}</p>
        {property.desired_price_value != null ? (
          <p className="mt-1 text-[12px] font-medium text-emerald-700">
            희망가 {formatWon(property.desired_price_value)}
            {priceGap != null && priceGap > 0 ? ` · ${formatWon(priceGap)} 여유` : null}
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-3">
        <DetailRow label="면적" value={formatArea(property)} />
        <DetailRow
          label="층·향"
          value={`${property.floor_info ?? "-"} · ${property.direction ? `${property.direction}향` : "-"}`}
        />
        <DetailRow label="방문" value={property.visited ? `방문 · ${formatDate(property.visited_at)}` : "미방문"} />
        <DetailRow label="판단" value={statusLabelMap[property.decision_status]} />
        <DetailRow label="평가" value={ratingAvg != null ? `평균 ${ratingAvg.toFixed(1)}점` : "미평가"} />
        <DetailRow label="기록자" value={property.actor_name} />
      </div>

      <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <p className="mb-2 text-[12px] font-semibold text-slate-500">항목별 평가</p>
        <PropertyRatingSummary property={property} />
      </div>

      {property.memo ? (
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <p className="text-[12px] font-semibold text-slate-500">메모</p>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{property.memo}</p>
        </div>
      ) : null}
    </div>
  );
}

type PropertyMapWithSheetProps = {
  properties: PropertyRecord[];
  mapClassName?: string;
  fullScreen?: boolean;
};

export function PropertyMapWithSheet({
  properties,
  mapClassName = "h-[62dvh]",
  fullScreen = false,
}: PropertyMapWithSheetProps) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exploredGroupKey, setExploredGroupKey] = useState<string | null>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const handleMapReady = useCallback((map: L.Map | null) => {
    setLeafletMap(map);
  }, []);

  const handleExploreGroupChange = useCallback((groupKey: string | null) => {
    setExploredGroupKey(groupKey);
  }, []);

  const handleMapBackgroundPress = useCallback(() => {
    setSelectedId(null);
  }, []);

  const mapProperties = useMemo(
    () =>
      properties.filter(
        (property): property is PropertyRecord & { latitude: number; longitude: number } =>
          typeof property.latitude === "number" && typeof property.longitude === "number",
      ),
    [properties],
  );

  const handleSelectProperty = useCallback(
    (propertyId: string) => {
      setSelectedId(propertyId);

      const property = mapProperties.find((item) => item.id === propertyId);
      if (!property) return;

      const groupKey = getLocationGroupKey(property);
      if (getPropertiesInLocationGroup(mapProperties, groupKey).length > 1) {
        setExploredGroupKey(groupKey);
      }
    },
    [mapProperties],
  );

  const boundsPoints = useMemo(
    () => mapProperties.map((property) => [property.latitude, property.longitude] as [number, number]),
    [mapProperties],
  );

  const mapStats = useMemo(() => getMapPropertyStats(properties), [properties]);

  const selectedProperty = useMemo(
    () => (selectedId ? mapProperties.find((property) => property.id === selectedId) ?? null : null),
    [mapProperties, selectedId],
  );

  const selectedGroupProperties = useMemo(() => {
    if (!selectedProperty) return [];
    return getPropertiesInLocationGroup(mapProperties, getLocationGroupKey(selectedProperty));
  }, [mapProperties, selectedProperty]);

  const mapCenter = useMemo((): [number, number] | null => {
    if (mapProperties.length === 0) return null;
    const latitude = mapProperties.reduce((sum, property) => sum + property.latitude, 0) / mapProperties.length;
    const longitude = mapProperties.reduce((sum, property) => sum + property.longitude, 0) / mapProperties.length;
    return [latitude, longitude];
  }, [mapProperties]);

  useEffect(() => {
    if (selectedId && !mapProperties.some((property) => property.id === selectedId)) {
      setSelectedId(null);
    }
  }, [mapProperties, selectedId]);

  if (!mapCenter) {
    return (
      <EmptyState
        title="지도로 볼 수 있는 매물이 없어요."
        description="좌표가 포함된 매물부터 지도 탐색이 가능해요."
      />
    );
  }

  const mapHeightClass = fullScreen ? "h-full" : mapClassName;

  return (
    <>
      <div
        className={
          fullScreen
            ? "property-location-map absolute inset-0 bg-slate-100"
            : "property-location-map overflow-hidden rounded-2xl border border-slate-200 bg-white"
        }
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          className={`w-full ${mapHeightClass}`}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
        >
          <RegisterMap onMap={handleMapReady} />
          <MapInitialView center={mapCenter} zoom={13} />
          <MapFocusSelection property={selectedProperty} exploredGroupKey={exploredGroupKey} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {userPosition ? <Marker position={userPosition} icon={userLocationIcon} /> : null}
          <PropertyMarkerClusterLayer
            properties={mapProperties}
            selectedId={selectedId}
            exploredGroupKey={exploredGroupKey}
            onSelect={handleSelectProperty}
            onExploreGroupChange={handleExploreGroupChange}
            onMapBackgroundPress={handleMapBackgroundPress}
          />
        </MapContainer>

        <MapFloatingControls
          map={leafletMap}
          boundsPoints={boundsPoints}
          fullScreen={fullScreen}
          onUserPositionChange={setUserPosition}
        />

        <MapFilterStatsBar
          propertyCount={mapStats.propertyCount}
          complexCount={mapStats.complexCount}
          fullScreen={fullScreen}
        />
      </div>

      <BottomSheet
        open={Boolean(selectedProperty)}
        onClose={() => setSelectedId(null)}
        layout="inset"
        title={selectedProperty?.title ?? "매물 정보"}
        headerLeading={
          selectedProperty ? (
            <PropertyMapSheetHeaderActions
              sourceUrl={selectedProperty.source_url}
              onOpenDetail={() => navigate(`/properties/${selectedProperty.id}`)}
            />
          ) : null
        }
      >
        {selectedProperty ? (
          <>
            <MapPropertyGroupSwitcher
              properties={selectedGroupProperties}
              selectedId={selectedProperty.id}
              onSelect={handleSelectProperty}
            />
            <PropertyMapDetail property={selectedProperty} />
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}
