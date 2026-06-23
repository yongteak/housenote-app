import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import FileText from "lucide-react/dist/esm/icons/file-text";

import { PropertyRatingSummary } from "../../components/PropertyRatingSummary";
import { ActorAvatar } from "../../components/actor/ActorAvatar";
import { PriceDisplay } from "../../components/PriceDisplay";
import { CrawlStatusBadge } from "../../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../../components/property/FavoriteButton";
import { PropertyListThumbnail } from "../../components/property/PropertyListThumbnail";
import { Button } from "../../components/ui/Button";
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
import { formatDate, formatPriceManwon, formatPyeong } from "../../lib/format";
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
      <p className="mb-2 text-ui-caption font-semibold text-slate-500">같은 위치 매물 {properties.length}건</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {properties.map((property) => {
          const selected = property.id === selectedId;
          return (
            <button
              key={property.id}
              type="button"
              onClick={() => onSelect(property.id)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-4 py-2.5 text-ui-body font-semibold transition active:scale-[0.98]",
                selected
                  ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-200/70"
                  : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
              )}
            >
              {formatPyeong(property.area_supply_m2)} · {formatPriceManwon(property.current_price_value)}
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
  propertyId: string;
  sourceUrl: string;
};

function PropertyMapSheetHeaderActions({ propertyId, sourceUrl }: PropertyMapSheetHeaderActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <FavoriteButton propertyId={propertyId} size="sm" />
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ui-link-btn gap-1 px-2 text-slate-500 hover:text-slate-700"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
        <span>원본</span>
      </a>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: ReactNode;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-ui-caption text-slate-500">{label}</span>
      <span className="text-right text-ui-body font-semibold text-slate-900">{value}</span>
    </div>
  );
}

type PropertyMapDetailProps = {
  property: PropertyRecord;
  onOpenDetail: () => void;
};

function PropertyMapDetail({ property, onOpenDetail }: PropertyMapDetailProps) {
  const ratingAvg = getPropertyAverageRating(property);

  return (
    <div className="space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-1">
      <div className="flex gap-3">
        <PropertyListThumbnail property={property} className="h-20 w-20 text-[26px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-ui-emphasis font-bold leading-snug text-slate-950 flex-1">{property.title ?? "제목 없음"}</p>
            <div className="shrink-0 pt-0.5">
              <PropertyMapSheetHeaderActions propertyId={property.id} sourceUrl={property.source_url} />
            </div>
          </div>
          <p className="mt-1.5 text-ui-caption leading-relaxed text-slate-500">{property.address ?? "-"}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <CrawlStatusBadge property={property} />
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-ui-caption font-normal text-slate-600">
              {property.property_type ?? "매물"}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-ui-caption font-normal text-slate-600">
              {property.deal_type ?? "-"}
            </span>
            <PropertyRatingSummary property={property} compact />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-ui-caption font-medium text-slate-500">등록가</span>
          <PriceDisplay value={property.current_price_value} size="md" className="text-slate-950" />
        </div>
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
        <DetailRow
          label="기록자"
          value={
            <span className="inline-flex items-center justify-end gap-1.5">
              <ActorAvatar phoneSuffix={property.phone_suffix} size="xs" label={property.actor_name} />
              <span>{property.actor_name}</span>
            </span>
          }
        />
      </div>

      {property.memo ? (
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <p className="text-ui-caption font-semibold text-slate-500">메모</p>
          <p className="mt-1 text-ui-body leading-relaxed text-slate-700">{property.memo}</p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="primary"
        className="w-full"
        leadingIcon={<FileText className="h-4 w-4" strokeWidth={2.25} />}
        onClick={onOpenDetail}
      >
        상세보기
      </Button>
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
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col bg-slate-100",
          fullScreen && "pt-[calc(max(env(safe-area-inset-top),12px)+3.25rem)]",
        )}
      >
        <div className={cn("flex flex-1 items-center justify-center", fullScreen ? "px-4 pb-8" : "p-4")}>
          <EmptyState
            className="w-full"
            title="지도로 볼 수 있는 매물이 없어요."
            description="좌표가 포함된 매물부터 지도 탐색이 가능해요."
          />
        </div>
      </div>
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
          scrollWheelZoom={fullScreen}
          touchZoom
          dragging
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
        title={selectedProperty?.title ?? "매물 정보"}
      >
        {selectedProperty ? (
          <>
            <MapPropertyGroupSwitcher
              properties={selectedGroupProperties}
              selectedId={selectedProperty.id}
              onSelect={handleSelectProperty}
            />
            <PropertyMapDetail
              property={selectedProperty}
              onOpenDetail={() => navigate(`/properties/${selectedProperty.id}`)}
            />
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}
