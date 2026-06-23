import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Map from "lucide-react/dist/esm/icons/map";
import Plus from "lucide-react/dist/esm/icons/plus";
import X from "lucide-react/dist/esm/icons/x";
import { Link, useNavigate } from "react-router-dom";

import { ActorAvatar } from "../components/actor/ActorAvatar";
import { CrawlQueueHomeBanner } from "../components/property/CrawlQueueHomeBanner";
import { CrawlStatusBadge } from "../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../components/property/FavoriteButton";
import { EmptyState } from "../components/ui/EmptyState";
import { PriceDisplay } from "../components/PriceDisplay";
import { StarRatingInput } from "../components/StarRatingInput";
import { PropertyRatingSummary } from "../components/PropertyRatingSummary";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { SelectorField, SelectorList, type SelectorOption } from "../components/ui/Selector";
import { getMockProperties } from "../fixtures/mobile-mvp-ui-mock";
import { listCompletedQueuePropertiesForHome } from "../features/property/property-crawl.api";
import { listProperties } from "../features/property/property.api";
import {
  DEFAULT_RATING_FILTER,
  PROPERTY_RATING_ITEMS,
  getRatingFilterLabel,
  matchesRatingFilter,
  type RatingFilterCriteria,
  type RatingFilterStatus,
} from "../features/property/property-ratings";
import { cn } from "../lib/cn";
import { useAuth } from "../lib/auth-context";
import {
  DEFAULT_PROPERTY_LIST_FILTERS,
  loadPropertyListFilters,
  savePropertyListFilters,
  type PropertyListFilterState,
  type StatusFilterValue,
  type VisitedFilterValue,
} from "../lib/property-list-filter-storage";
import type { DecisionStatus, PropertyRecord } from "../types/property";

const PropertyMapWithSheet = lazy(() =>
  import("../features/map/PropertyMapWithSheet").then((module) => ({ default: module.PropertyMapWithSheet })),
);

type FilterSheet = "visited" | "status" | "rating" | null;

const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

const visitedOptions: SelectorOption<VisitedFilterValue>[] = [
  { value: "all", label: "전체" },
  { value: "yes", label: "방문함" },
  { value: "no", label: "미방문" },
];

const statusOptions: SelectorOption<StatusFilterValue>[] = [
  { value: "all", label: "전체" },
  { value: "review", label: "다시보기" },
  { value: "hold", label: "보류" },
  { value: "exclude", label: "제외" },
  { value: "revisit", label: "재방문" },
];

const ratingStatusOptions: SelectorOption<RatingFilterStatus>[] = [
  { value: "all", label: "전체" },
  { value: "rated", label: "평가함" },
  { value: "unrated", label: "미평가" },
];

function statusLabel(status: DecisionStatus): string {
  return statusLabelMap[status] ?? "검토";
}

function findLabel<T extends string>(options: SelectorOption<T>[], value: T) {
  return options.find((option) => option.value === value)?.label ?? "-";
}

function getRatingFilterDisplayLabel(criteria: RatingFilterCriteria, compact = false): string {
  const label = getRatingFilterLabel(criteria);
  if (compact && label === "평가 · 조건") {
    return "조건";
  }
  return label;
}

function applyFilters(
  properties: PropertyRecord[],
  visitedFilter: VisitedFilterValue,
  statusFilter: StatusFilterValue,
  ratingFilter: RatingFilterCriteria,
) {
  return properties.filter((property) => {
    if (visitedFilter === "yes" && !property.visited) return false;
    if (visitedFilter === "no" && property.visited) return false;
    if (statusFilter !== "all" && property.decision_status !== statusFilter) return false;
    if (!matchesRatingFilter(property, ratingFilter)) return false;
    return true;
  });
}

function sortForListView(properties: PropertyRecord[]) {
  return [...properties].sort((a, b) => {
    if (a.visited !== b.visited) {
      return a.visited ? 1 : -1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function MapViewFloatingButton({ onClick }: { onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setExpanded(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl justify-center pb-[calc(16px+env(safe-area-inset-bottom))]">
      <motion.button
        type="button"
        className="property-map-floating-btn pointer-events-auto overflow-hidden flex items-center justify-start"
        aria-label="지도 보기"
        onClick={onClick}
        initial={{ width: 44 }}
        animate={{
          width: expanded ? 116 : 44,
        }}
        style={{
          paddingLeft: 14, // 아이콘의 왼쪽 여백을 14px로 절대 고정하여 뚝 끊기는 현상 방지
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 26,
          mass: 1
        }}
      >
        <Map className="h-4 w-4 shrink-0" />
        <motion.span
          className="overflow-hidden whitespace-nowrap text-[13px] font-bold text-white"
          initial={{ opacity: 0, width: 0, marginLeft: 0 }}
          animate={{
            opacity: expanded ? 1 : 0,
            width: expanded ? 54 : 0,
            marginLeft: expanded ? 6 : 0,
          }}
          transition={{
            duration: 0.18,
            delay: expanded ? 0.08 : 0,
            ease: "easeOut"
          }}
        >
          지도 보기
        </motion.span>
      </motion.button>
    </div>
  );
}

type FilterControlsProps = {
  visitedFilter: VisitedFilterValue;
  statusFilter: StatusFilterValue;
  ratingFilter: RatingFilterCriteria;
  onOpenSheet: (sheet: Exclude<FilterSheet, null>) => void;
  compact?: boolean;
  layout?: "grid" | "scrollable";
  flat?: boolean;
  centered?: boolean;
};

function FilterControls({
  visitedFilter,
  statusFilter,
  ratingFilter,
  onOpenSheet,
  compact = false,
  layout = "grid",
  flat = false,
  centered = false,
}: FilterControlsProps) {
  const scrollable = layout === "scrollable";
  const filterBtnClass = flat ? "property-list-filter-btn" : "property-map-filter-btn";

  return (
    <div
      className={cn(
        scrollable
          ? cn("flex w-max gap-2", centered ? "mx-auto" : "pr-8")
          : cn("grid min-w-0 grid-cols-3", compact ? "gap-1" : "w-full gap-2"),
      )}
    >
      <SelectorField
        compact={compact && !scrollable}
        scrollable={scrollable}
        className={cn(scrollable ? filterBtnClass : null)}
        label="방문"
        valueLabel={findLabel(visitedOptions, visitedFilter)}
        onClick={() => onOpenSheet("visited")}
      />
      <SelectorField
        compact={compact && !scrollable}
        scrollable={scrollable}
        className={cn(scrollable ? filterBtnClass : null)}
        label="상태"
        valueLabel={findLabel(statusOptions, statusFilter)}
        onClick={() => onOpenSheet("status")}
      />
      <SelectorField
        compact={compact && !scrollable}
        scrollable={scrollable}
        className={cn(scrollable ? filterBtnClass : null)}
        label="평가"
        valueLabel={getRatingFilterDisplayLabel(ratingFilter, compact && !scrollable)}
        onClick={() => onOpenSheet("rating")}
      />
    </div>
  );
}

type RatingFilterSheetProps = {
  open: boolean;
  value: RatingFilterCriteria;
  onClose: () => void;
  onChange: (value: RatingFilterCriteria) => void;
};

function RatingFilterSheet({ open, value, onChange, onClose }: RatingFilterSheetProps) {
  const minimumFields = {
    rating_location: "minCommute",
    rating_price: "minSchools",
    rating_condition: "minConvenience",
  } as const;

  return (
    <BottomSheet open={open} onClose={onClose} title="평가 필터">
      <div className="space-y-5 px-4 pb-6 pt-2">
        <SelectorList
          className="px-0 pt-0 pb-0"
          selectedValue={value.status}
          options={ratingStatusOptions}
          onSelect={(status) => onChange({ ...value, status })}
        />

        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-bold text-slate-900">항목별 최소 점수</p>
            <button
              type="button"
              className="text-[12px] font-semibold text-slate-500"
              onClick={() =>
                onChange({
                  ...value,
                  minCommute: null,
                  minSchools: null,
                  minConvenience: null,
                })
              }
            >
              점수 초기화
            </button>
          </div>

          {PROPERTY_RATING_ITEMS.map((item) => {
            const field = minimumFields[item.key];
            const minimum = value[field];

            return (
              <StarRatingInput
                key={item.key}
                label={`${item.label} ${minimum != null ? `${minimum}점 이상` : ""}`.trim()}
                hint={minimum == null ? `${item.description} (선택)` : item.description}
                value={minimum}
                onChange={(next) => onChange({ ...value, [field]: next })}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="surface"
            className="w-full"
            onClick={() => onChange(DEFAULT_RATING_FILTER)}
          >
            전체 초기화
          </Button>
          <Button variant="primary" className="w-full" onClick={onClose}>
            적용
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

type FilterSheetsProps = {
  openSheet: FilterSheet;
  filters: PropertyListFilterState;
  onClose: () => void;
  onFiltersChange: (next: PropertyListFilterState) => void;
};

function FilterSheets({ openSheet, filters, onClose, onFiltersChange }: FilterSheetsProps) {
  return (
    <>
      <BottomSheet open={openSheet === "visited"} onClose={onClose} title="방문 필터">
        <SelectorList
          selectedValue={filters.visited}
          options={visitedOptions}
          onSelect={(visited) => {
            onFiltersChange({ ...filters, visited });
            onClose();
          }}
        />
      </BottomSheet>
      <BottomSheet open={openSheet === "status"} onClose={onClose} title="상태 필터">
        <SelectorList
          selectedValue={filters.status}
          options={statusOptions}
          onSelect={(status) => {
            onFiltersChange({ ...filters, status });
            onClose();
          }}
        />
      </BottomSheet>
      <RatingFilterSheet
        open={openSheet === "rating"}
        value={filters.rating}
        onClose={onClose}
        onChange={(rating) => onFiltersChange({ ...filters, rating })}
      />
    </>
  );
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
    queryKey: ["properties", "home", actor?.actorId],
    queryFn: () =>
      listProperties({
        actorId: actor?.actorId,
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const sourceProperties = useMemo<PropertyRecord[]>(() => {
    if (query.data && query.data.length > 0) {
      return query.data;
    }

    const mock = getMockProperties(actor);
    const queued = listCompletedQueuePropertiesForHome(actor);
    const mockIds = new Set(mock.map((item) => item.id));
    const merged = [...queued.filter((item) => !mockIds.has(item.id)), ...mock];
    return merged;
  }, [actor, query.data]);

  const listFilters =
    query.data && query.data.length > 0 ? filters : DEFAULT_PROPERTY_LIST_FILTERS;

  const filteredProperties = useMemo(
    () => applyFilters(sourceProperties, listFilters.visited, listFilters.status, listFilters.rating),
    [listFilters.rating, listFilters.status, listFilters.visited, sourceProperties],
  );

  const listPropertiesSorted = useMemo(() => sortForListView(filteredProperties), [filteredProperties]);

  const filterSheets = (
    <FilterSheets
      openSheet={openSheet}
      filters={filters}
      onClose={() => setOpenSheet(null)}
      onFiltersChange={setFilters}
    />
  );

  if (filters.viewMode === "map") {
    return (
      <div className="fixed inset-0 z-40 mx-auto w-full max-w-xl bg-slate-100">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full animate-pulse bg-slate-200" />}>
            <PropertyMapWithSheet properties={filteredProperties} fullScreen />
          </Suspense>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 px-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="pointer-events-auto flex items-stretch gap-2">
            <button
              type="button"
              className="property-map-close-btn"
              aria-label="닫기"
              onClick={() => setFilters((current) => ({ ...current, viewMode: "list" }))}
            >
              <X className="h-4 w-4 shrink-0" />
              <span>닫기</span>
            </button>
            <div className="property-map-top-bar property-map-filter-scroll min-w-0 flex-1">
              <FilterControls
                layout="scrollable"
                visitedFilter={listFilters.visited}
                statusFilter={listFilters.status}
                ratingFilter={listFilters.rating}
                onOpenSheet={setOpenSheet}
              />
            </div>
          </div>
        </div>

        {filterSheets}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="flex h-12 items-center justify-between px-4">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="프로필"
            onClick={() => navigate("/profile")}
          >
            <ActorAvatar phoneSuffix={actor?.phoneSuffix} size="sm" label={actor?.actorName} />
          </button>
          <h1 className="text-[15px] font-bold text-slate-950">홈</h1>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="활동"
              leadingIcon={<Clock3 className="h-5 w-5" />}
              onClick={() => navigate("/activity")}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="새 매물 기록하기"
              leadingIcon={<Plus className="h-5 w-5 text-emerald-600" />}
              onClick={() => navigate("/properties/new")}
            />
          </div>
        </div>
        <div className="border-t border-slate-100/60 py-2">
          <div className="property-map-filter-scroll property-map-filter-scroll--center px-4">
            <FilterControls
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
        {query.isLoading ? <p className="mt-3 px-1 text-[13px] text-slate-500">목록을 불러오는 중...</p> : null}
        {query.error ? <p className="mt-3 px-1 text-[13px] text-rose-500">{(query.error as Error).message}</p> : null}

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
                  className="flex min-w-0 flex-1 gap-4 transition active:opacity-80"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                    {property.thumbnail_url ? (
                      <img
                        src={property.thumbnail_url}
                        alt={property.title ?? "매물"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-[15px] font-bold text-slate-950">
                        {property.title ?? "제목 없음"}
                      </p>
                      <PriceDisplay
                        value={property.current_price_value}
                        size="sm"
                        className="shrink-0 text-[15px] font-bold text-emerald-600"
                        stopPropagation
                      />
                    </div>
                    <p className="mt-1 truncate text-[12px] text-slate-500">{property.address ?? "주소 없음"}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <CrawlStatusBadge property={property} />
                      <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                      property.visited 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {property.visited ? "방문함" : "미방문"}
                    </span>
                    
                    <span className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
                      property.decision_status === "revisit" && "bg-amber-50 text-amber-700",
                      property.decision_status === "review" && "bg-blue-50 text-blue-700",
                      property.decision_status === "hold" && "bg-slate-100 text-slate-600",
                      property.decision_status === "exclude" && "bg-rose-50 text-rose-700",
                    )}>
                      {statusLabel(property.decision_status)}
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

      <MapViewFloatingButton onClick={() => setFilters((current) => ({ ...current, viewMode: "map" }))} />

      {filterSheets}
    </div>
  );
}
