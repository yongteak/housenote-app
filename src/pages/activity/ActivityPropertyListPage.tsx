import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

import { PropertyRatingSummary } from "../../components/PropertyRatingSummary";
import { CrawlStatusBadge } from "../../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../../components/property/FavoriteButton";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { NavBar } from "../../components/ui/NavBar";
import { PriceDisplay } from "../../components/PriceDisplay";
import {
  applyPropertyListFilters,
  clampFiltersToScope,
  deriveScopedFilterOptions,
  MapViewFloatingButton,
  PropertyListFilterControls,
  PropertyListFilterSheets,
  PropertyMapViewOverlay,
  propertyStatusLabel,
  type FilterSheet,
} from "../../features/property/property-list-filter-ui";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import {
  DEFAULT_PROPERTY_LIST_FILTERS,
  type PropertyListFilterState,
} from "../../lib/property-list-filter-storage";
import type { PropertyRecord } from "../../types/property";

export type ActivityPropertyRow = {
  id: string;
  property: PropertyRecord;
  meta: string;
  badge?: string;
};

type ActivityPropertyListPageProps = {
  title: string;
  rows: ActivityPropertyRow[];
  emptyTitle: string;
  emptyDescription: string;
  footer?: ReactNode;
};

export function ActivityPropertyListPage({
  title,
  rows,
  emptyTitle,
  emptyDescription,
  footer,
}: ActivityPropertyListPageProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PropertyListFilterState>(DEFAULT_PROPERTY_LIST_FILTERS);
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);

  const sourceProperties = useMemo(() => rows.map((row) => row.property), [rows]);

  /** 이 화면 rows 에 포함된 매물만 기준으로 필터·지도 마커를 구성한다. */
  const scopedFilterOptions = useMemo(() => deriveScopedFilterOptions(sourceProperties), [sourceProperties]);

  useEffect(() => {
    setFilters((current) => clampFiltersToScope(current, scopedFilterOptions));
  }, [scopedFilterOptions]);

  const filteredProperties = useMemo(
    () => applyPropertyListFilters(sourceProperties, filters.visited, filters.status, filters.rating),
    [filters.rating, filters.status, filters.visited, sourceProperties],
  );

  const filteredPropertyIds = useMemo(
    () => new Set(filteredProperties.map((property) => property.id)),
    [filteredProperties],
  );

  const visibleRows = useMemo(
    () => rows.filter((row) => filteredPropertyIds.has(row.property.id)),
    [filteredPropertyIds, rows],
  );

  const filterSheets = (
    <PropertyListFilterSheets
      openSheet={openSheet}
      filters={filters}
      onClose={() => setOpenSheet(null)}
      onFiltersChange={setFilters}
      filterOptions={scopedFilterOptions}
    />
  );

  if (filters.viewMode === "map") {
    return (
      <PropertyMapViewOverlay
        properties={sourceProperties}
        filters={filters}
        onClose={() => setFilters((current) => ({ ...current, viewMode: "list" }))}
        onOpenSheet={setOpenSheet}
        filterSheets={filterSheets}
        filterOptions={scopedFilterOptions}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <NavBar
        title={title}
        leftSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="뒤로 가기"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate("/activity")}
          />
        }
      />
      {rows.length > 0 ? (
        <div className="border-b border-slate-100 py-2">
          <div className="property-map-filter-scroll property-map-filter-scroll--center px-4">
            <PropertyListFilterControls
              layout="scrollable"
              flat
              centered
              visitedFilter={filters.visited}
              statusFilter={filters.status}
              ratingFilter={filters.rating}
              onOpenSheet={setOpenSheet}
              filterOptions={scopedFilterOptions}
            />
          </div>
        </div>
      ) : null}
      <main className="flex flex-1 flex-col px-4 pb-24 pt-2">
        {rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <EmptyState className="w-full" title={emptyTitle} description={emptyDescription} />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <EmptyState
              className="w-full"
              title="조건에 맞는 매물이 없어요."
              description="필터를 바꿔 다시 확인해 보세요."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <div key={row.id} className="relative flex gap-2 py-4">
                <Link
                  to={`/properties/${row.property.id}`}
                  className="flex min-w-0 flex-1 gap-4 transition active:opacity-80"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {row.property.thumbnail_url ? (
                      <img
                        src={row.property.thumbnail_url}
                        alt={row.property.title ?? "매물 이미지"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-[15px] font-bold text-slate-950">
                        {row.property.title ?? "제목 없음"}
                      </p>
                      <PriceDisplay
                        value={row.property.current_price_value}
                        size="sm"
                        className="shrink-0 text-emerald-600"
                        stopPropagation
                      />
                    </div>
                    <p className="mt-1 truncate text-[12px] text-slate-500">{row.property.address ?? "-"}</p>
                    <p className="mt-1 text-[12px] font-medium text-slate-500">{row.meta}</p>
                    {row.badge ? (
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">{row.badge}</p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <CrawlStatusBadge property={row.property} />
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                          row.property.visited ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {row.property.visited ? "방문함" : "미방문"}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                          row.property.decision_status === "revisit" && "bg-amber-50 text-amber-700",
                          row.property.decision_status === "review" && "bg-blue-50 text-blue-700",
                          row.property.decision_status === "hold" && "bg-slate-100 text-slate-600",
                          row.property.decision_status === "exclude" && "bg-rose-50 text-rose-700",
                        )}
                      >
                        {propertyStatusLabel(row.property.decision_status)}
                      </span>
                      <PropertyRatingSummary property={row.property} compact />
                    </div>
                  </div>
                </Link>
                <FavoriteButton propertyId={row.property.id} className="self-start" />
              </div>
            ))}
          </div>
        )}
        {footer}
      </main>

      {sourceProperties.length > 0 ? (
        <MapViewFloatingButton onClick={() => setFilters((current) => ({ ...current, viewMode: "map" }))} />
      ) : null}

      {filterSheets}
    </div>
  );
}

export function buildMeta(prefix: string, value: string) {
  return `${prefix} ${formatDate(value)}`;
}
