import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Plus from "lucide-react/dist/esm/icons/plus";
import { Link, useNavigate } from "react-router-dom";

import { ActorAvatar } from "../components/actor/ActorAvatar";
import { CrawlQueueHomeBanner } from "../components/property/CrawlQueueHomeBanner";
import { CrawlStatusBadge } from "../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../components/property/FavoriteButton";
import { PropertyListThumbnail } from "../components/property/PropertyListThumbnail";
import { EmptyState } from "../components/ui/EmptyState";
import { PriceDisplay } from "../components/PriceDisplay";
import { PropertyRatingSummary } from "../components/PropertyRatingSummary";
import { Button } from "../components/ui/Button";
import {
  applyPropertyListFilters,
  MapViewFloatingButton,
  PropertyListFilterControls,
  PropertyListFilterSheets,
  PropertyMapViewOverlay,
  propertyStatusLabel,
  type FilterSheet,
} from "../features/property/property-list-filter-ui";
import { listProperties } from "../features/property/property.api";
import { cn } from "../lib/cn";
import { useAuth } from "../lib/auth-context";
import {
  DEFAULT_PROPERTY_LIST_FILTERS,
  loadPropertyListFilters,
  savePropertyListFilters,
  type PropertyListFilterState,
} from "../lib/property-list-filter-storage";
import type { PropertyRecord } from "../types/property";

function sortForListView(properties: PropertyRecord[]) {
  return [...properties].sort((a, b) => {
    if (a.visited !== b.visited) {
      return a.visited ? 1 : -1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function PropertyListPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();
  const [filters, setFilters] = useState<PropertyListFilterState>(() => loadPropertyListFilters());
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);

  useEffect(() => {
    savePropertyListFilters(filters);
  }, [filters]);

  const query = useQuery({
    queryKey: ["properties", "home"],
    queryFn: () =>
      listProperties({
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const sourceProperties = useMemo<PropertyRecord[]>(() => query.data ?? [], [query.data]);

  const listFilters = sourceProperties.length > 0 ? filters : DEFAULT_PROPERTY_LIST_FILTERS;

  const filteredProperties = useMemo(
    () => applyPropertyListFilters(sourceProperties, listFilters.visited, listFilters.status, listFilters.rating),
    [listFilters.rating, listFilters.status, listFilters.visited, sourceProperties],
  );

  const listPropertiesSorted = useMemo(() => sortForListView(filteredProperties), [filteredProperties]);

  const filterSheets = (
    <PropertyListFilterSheets
      openSheet={openSheet}
      filters={filters}
      onClose={() => setOpenSheet(null)}
      onFiltersChange={setFilters}
    />
  );

  if (filters.viewMode === "map") {
    return (
      <PropertyMapViewOverlay
        properties={sourceProperties}
        filters={listFilters}
        onClose={() => setFilters((current) => ({ ...current, viewMode: "list" }))}
        onOpenSheet={setOpenSheet}
        filterSheets={filterSheets}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="flex h-12 items-center justify-between px-4">
          <button
            type="button"
            className="inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full transition active:scale-[0.98]"
            aria-label="프로필"
            onClick={() => navigate("/profile")}
          >
            <ActorAvatar phoneSuffix={actor?.phoneSuffix} size="sm" label={actor?.actorName} />
          </button>
          <h1 className="text-ui-nav font-bold text-slate-950">홈</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="활동"
              leadingIcon={<Clock3 className="h-5 w-5" />}
              onClick={() => navigate("/activity")}
            />
            <Button
              variant="ghost"
              size="sm"
              className="font-semibold text-emerald-600"
              aria-label="새 매물 기록하기"
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate("/properties/new")}
            >
              추가
            </Button>
          </div>
        </div>
        <div className="border-t border-slate-100/60 py-2">
          <div className="property-map-filter-scroll property-map-filter-scroll--center px-4">
            <PropertyListFilterControls
              layout="scrollable"
              flat
              centered
              visitedFilter={listFilters.visited}
              statusFilter={listFilters.status}
              ratingFilter={listFilters.rating}
              onOpenSheet={setOpenSheet}
            />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 pb-24 pt-2">
        {actor ? <CrawlQueueHomeBanner actor={actor} /> : null}
        {query.isLoading ? <p className="mt-3 px-1 text-ui-body text-slate-500">목록을 불러오는 중...</p> : null}
        {query.error ? <p className="mt-3 px-1 text-ui-body text-rose-500">{(query.error as Error).message}</p> : null}

        {filteredProperties.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <EmptyState
              className="w-full"
              title="매물이 없어요."
              description="필터를 바꾸거나 + 버튼으로 첫 매물을 추가하세요."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listPropertiesSorted.map((property) => (
              <div key={property.id} className="relative flex gap-2 py-4">
                <Link
                  to={`/properties/${property.id}`}
                  className="flex min-w-0 flex-1 gap-4 transition active:opacity-80 active:scale-[0.99]"
                >
                  <PropertyListThumbnail property={property} />
                  <div className="min-w-0 flex-1 flex flex-col gap-1 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-ui-emphasis font-bold text-slate-950">
                        {property.title ?? "제목 없음"}
                      </p>
                      <PriceDisplay
                        value={property.current_price_value}
                        size="sm"
                        className="shrink-0 min-h-0 py-0 text-emerald-600"
                        stopPropagation
                      />
                    </div>
                    <p className="truncate text-ui-caption text-slate-500">{property.address ?? "주소 없음"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <CrawlStatusBadge property={property} />
                      <span
                        className={cn(
                          "ui-badge",
                          property.visited ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {property.visited ? "방문함" : "미방문"}
                      </span>
                      <span
                        className={cn(
                          "ui-badge",
                          property.decision_status === "revisit" && "bg-amber-50 text-amber-700",
                          property.decision_status === "review" && "bg-blue-50 text-blue-700",
                          property.decision_status === "hold" && "bg-slate-100 text-slate-600",
                          property.decision_status === "exclude" && "bg-rose-50 text-rose-700",
                        )}
                      >
                        {propertyStatusLabel(property.decision_status)}
                      </span>
                      <PropertyRatingSummary property={property} compact />
                    </div>
                  </div>
                </Link>
                <FavoriteButton propertyId={property.id} className="self-start" />
              </div>
            ))}
          </div>
        )}
      </main>

      {filteredProperties.length > 0 ? (
        <MapViewFloatingButton onClick={() => setFilters((current) => ({ ...current, viewMode: "map" }))} />
      ) : null}

      {filterSheets}
    </div>
  );
}
