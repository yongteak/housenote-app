import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

import {
  createClusterIcon,
  createPropertyMarkerIcon,
  getLocationGroupKeyFromLatLng,
} from "./propertyMapMarkers";
import type { PropertyRecord } from "../../types/property";

import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

type MappableProperty = PropertyRecord & { latitude: number; longitude: number };

type PropertyMarkerClusterLayerProps = {
  properties: MappableProperty[];
  selectedId: string | null;
  exploredGroupKey: string | null;
  onSelect: (propertyId: string) => void;
  onExploreGroupChange: (groupKey: string | null) => void;
  onMapBackgroundPress?: () => void;
};

const MARKER_FIT_PADDING: L.PointExpression = [110, 110];
const EXPLORATION_MIN_ZOOM = 16;
const EXPLORATION_COLLAPSE_ZOOM = 14;

function clusterRadiusForZoom(zoom: number): number {
  if (zoom >= 18) return 42;
  if (zoom >= 16) return 58;
  if (zoom >= 14) return 72;
  return 84;
}

function getClusterGroupKey(cluster: L.MarkerCluster): string {
  const center = cluster.getLatLng();
  return getLocationGroupKeyFromLatLng(center.lat, center.lng);
}

export function PropertyMarkerClusterLayer({
  properties,
  selectedId,
  exploredGroupKey,
  onSelect,
  onExploreGroupChange,
  onMapBackgroundPress,
}: PropertyMarkerClusterLayerProps) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const pinnedClusterRef = useRef<L.MarkerCluster | null>(null);
  const exploredGroupKeyRef = useRef(exploredGroupKey);
  const keepExpandedRef = useRef(false);
  const markerClickRef = useRef(false);

  exploredGroupKeyRef.current = exploredGroupKey;

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false,
      removeOutsideVisibleBounds: false,
      maxClusterRadius: clusterRadiusForZoom,
      spiderfyDistanceMultiplier: 3,
      animate: true,
      iconCreateFunction: createClusterIcon,
    });

    const markers = new Map<string, L.Marker>();

    const restoreSpiderfyIfNeeded = () => {
      if (!keepExpandedRef.current || !exploredGroupKeyRef.current || !pinnedClusterRef.current) return;
      if (map.getZoom() < EXPLORATION_MIN_ZOOM) return;
      if (clusterGroupRef.current?._spiderfied) return;
      pinnedClusterRef.current.spiderfy();
    };

    for (const property of properties) {
      const marker = L.marker([property.latitude, property.longitude], {
        icon: createPropertyMarkerIcon(property, false),
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        markerClickRef.current = true;
        keepExpandedRef.current = true;
        onSelect(property.id);
        queueMicrotask(() => {
          markerClickRef.current = false;
          restoreSpiderfyIfNeeded();
        });
      });

      markers.set(property.id, marker);
      clusterGroup.addLayer(marker);
    }

    clusterGroup.on("spiderfied", (event: L.LeafletEvent) => {
      const cluster = event.layer as L.MarkerCluster;
      pinnedClusterRef.current = cluster;
      keepExpandedRef.current = true;
      onExploreGroupChange(getClusterGroupKey(cluster));
    });

    clusterGroup.on("unspiderfied", () => {
      if (markerClickRef.current || !keepExpandedRef.current || !exploredGroupKeyRef.current) return;
      queueMicrotask(restoreSpiderfyIfNeeded);
    });

    clusterGroup.on("clusterclick", (event: L.LeafletEvent) => {
      const cluster = event.layer as L.MarkerCluster;
      if (cluster.getChildCount() <= 1) return;

      L.DomEvent.stopPropagation(event);

      const bounds = cluster.getBounds();
      const nextZoom = Math.min(map.getBoundsZoom(bounds, false) + 1, map.getMaxZoom());

      const finishExplore = () => {
        const groupKey = getClusterGroupKey(cluster);
        onExploreGroupChange(groupKey);
        keepExpandedRef.current = true;
        pinnedClusterRef.current = cluster;

        if (cluster.getChildCount() > 1) {
          cluster.spiderfy();
        }
      };

      if (nextZoom > map.getZoom()) {
        map.fitBounds(bounds, {
          padding: MARKER_FIT_PADDING,
          maxZoom: nextZoom,
          animate: true,
        });
        map.once("moveend", () => {
          if (cluster.getChildCount() > 1) {
            finishExplore();
          }
        });
        return;
      }

      finishExplore();
    });

    const handleMapBackgroundClick = () => {
      if (markerClickRef.current) return;
      keepExpandedRef.current = false;
      pinnedClusterRef.current = null;
      onExploreGroupChange(null);
      onMapBackgroundPress?.();
      clusterGroup.unspiderfy();
    };

    const handleZoomEnd = () => {
      if (map.getZoom() < EXPLORATION_COLLAPSE_ZOOM) {
        keepExpandedRef.current = false;
        pinnedClusterRef.current = null;
        onExploreGroupChange(null);
        return;
      }
      restoreSpiderfyIfNeeded();
    };

    map.addLayer(clusterGroup);
    map.on("click", handleMapBackgroundClick);
    map.on("zoomend", handleZoomEnd);
    clusterGroupRef.current = clusterGroup;
    markersRef.current = markers;

    return () => {
      map.off("click", handleMapBackgroundClick);
      map.off("zoomend", handleZoomEnd);
      map.removeLayer(clusterGroup);
      clusterGroup.clearLayers();
      clusterGroupRef.current = null;
      markersRef.current = new Map();
      pinnedClusterRef.current = null;
    };
  }, [map, onExploreGroupChange, onMapBackgroundPress, onSelect, properties]);

  useEffect(() => {
    if (!exploredGroupKey || !pinnedClusterRef.current) return;
    keepExpandedRef.current = true;
    if (!clusterGroupRef.current?._spiderfied && map.getZoom() >= EXPLORATION_MIN_ZOOM) {
      pinnedClusterRef.current.spiderfy();
    }
  }, [exploredGroupKey, map]);

  useEffect(() => {
    for (const property of properties) {
      const marker = markersRef.current.get(property.id);
      if (!marker) continue;
      marker.setIcon(createPropertyMarkerIcon(property, property.id === selectedId));
    }
  }, [properties, selectedId]);

  return null;
}
