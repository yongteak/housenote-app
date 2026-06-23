import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import { useMap } from "react-leaflet";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed";
import Minus from "lucide-react/dist/esm/icons/minus";
import Plus from "lucide-react/dist/esm/icons/plus";
import Scan from "lucide-react/dist/esm/icons/scan";

import { cn } from "../../lib/cn";

type RegisterMapProps = {
  onMap: (map: LeafletMap | null) => void;
};

/** MapContainer 내부에서 Leaflet map 인스턴스를 상위로 전달한다. */
export function RegisterMap({ onMap }: RegisterMapProps) {
  const map = useMap();

  useEffect(() => {
    onMap(map);
    return () => {
      onMap(null);
    };
  }, [map, onMap]);

  return null;
}

type MapGlassButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  className?: string;
};

function MapGlassButton({ label, onClick, disabled, active, children, className }: MapGlassButtonProps) {
  return (
    <button
      type="button"
      className={cn("property-map-glass-btn", active ? "property-map-glass-btn-active" : null, className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type MapFloatingControlsProps = {
  map: LeafletMap | null;
  boundsPoints: [number, number][];
  fullScreen?: boolean;
  onUserPositionChange: (position: [number, number] | null) => void;
};

export function MapFloatingControls({
  map,
  boundsPoints,
  fullScreen = false,
  onUserPositionChange,
}: MapFloatingControlsProps) {
  const [locating, setLocating] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);

  const zoomIn = useCallback(() => {
    map?.zoomIn();
  }, [map]);

  const zoomOut = useCallback(() => {
    map?.zoomOut();
  }, [map]);

  const fitAllMarkers = useCallback(() => {
    if (!map || boundsPoints.length === 0) return;
    const bounds = L.latLngBounds(boundsPoints);
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: true });
  }, [boundsPoints, map]);

  const goToCurrentLocation = useCallback(() => {
    if (!map || !navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition: [number, number] = [position.coords.latitude, position.coords.longitude];
        map.setView(nextPosition, 16, { animate: true });
        onUserPositionChange(nextPosition);
        setHasLocation(true);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [map, onUserPositionChange]);

  if (!map) return null;

  return (
    <div
      className="property-map-controls pointer-events-none absolute right-3 z-[3] flex flex-col items-end gap-2.5"
      style={{
        bottom: fullScreen
          ? "calc(env(safe-area-inset-bottom, 0px) + 16px)"
          : "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="property-map-glass-pill pointer-events-auto">
        <MapGlassButton label="확대" onClick={zoomIn}>
          <Plus className="h-[18px] w-[18px] stroke-[2.25px]" />
        </MapGlassButton>
        <div className="property-map-glass-divider" aria-hidden />
        <MapGlassButton label="축소" onClick={zoomOut}>
          <Minus className="h-[18px] w-[18px] stroke-[2.25px]" />
        </MapGlassButton>
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <MapGlassButton
          label="현재 위치"
          onClick={goToCurrentLocation}
          disabled={locating}
          active={hasLocation || locating}
          className="property-map-glass-circle rounded-full"
        >
          <LocateFixed className={cn("h-[18px] w-[18px] stroke-[2px]", locating ? "animate-pulse" : null)} />
        </MapGlassButton>

        <MapGlassButton label="전체 매물 보기" onClick={fitAllMarkers} className="property-map-glass-circle rounded-full">
          <Scan className="h-[17px] w-[17px] stroke-[2px]" />
        </MapGlassButton>
      </div>
    </div>
  );
}
