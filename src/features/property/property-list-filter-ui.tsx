import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Map from "lucide-react/dist/esm/icons/map";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";

import { StarRatingInput } from "../../components/StarRatingInput";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { Button } from "../../components/ui/Button";
import { SelectorField, SelectorList, type SelectorOption } from "../../components/ui/Selector";
import {
  DEFAULT_RATING_FILTER,
  PROPERTY_RATING_ITEMS,
  getRatingFilterLabel,
  hasAnyPropertyRating,
  matchesRatingFilter,
  type RatingFilterCriteria,
  type RatingFilterStatus,
} from "./property-ratings";
import { cn } from "../../lib/cn";
import type {
  PropertyListFilterState,
  StatusFilterValue,
  VisitedFilterValue,
} from "../../lib/property-list-filter-storage";
import type { DecisionStatus, PropertyRecord } from "../../types/property";

const PropertyMapWithSheet = lazy(() =>
  import("../map/PropertyMapWithSheet").then((module) => ({ default: module.PropertyMapWithSheet })),
);

export type FilterSheet = "visited" | "status" | "rating" | null;

export const visitedOptions: SelectorOption<VisitedFilterValue>[] = [
  { value: "all", label: "전체" },
  { value: "yes", label: "방문함" },
  { value: "no", label: "미방문" },
];

export const statusOptions: SelectorOption<StatusFilterValue>[] = [
  { value: "all", label: "전체" },
  { value: "review", label: "다시보기" },
  { value: "hold", label: "보류" },
  { value: "exclude", label: "제외" },
  { value: "revisit", label: "재방문" },
];

const defaultRatingStatusOptions: SelectorOption<RatingFilterStatus>[] = [
  { value: "all", label: "전체" },
  { value: "rated", label: "평가함" },
  { value: "unrated", label: "미평가" },
];

/** 활동 목록 등 — 현재 화면 매물 집합에서만 필터 선택지를 만든다. */
export type ScopedFilterOptions = {
  visited: SelectorOption<VisitedFilterValue>[];
  status: SelectorOption<StatusFilterValue>[];
  ratingStatus: SelectorOption<RatingFilterStatus>[];
};

export function deriveScopedFilterOptions(properties: PropertyRecord[]): ScopedFilterOptions {
  const visited: SelectorOption<VisitedFilterValue>[] = [{ value: "all", label: "전체" }];
  if (properties.some((property) => property.visited)) {
    visited.push({ value: "yes", label: "방문함" });
  }
  if (properties.some((property) => !property.visited)) {
    visited.push({ value: "no", label: "미방문" });
  }

  const statusValues = new Set(properties.map((property) => property.decision_status));
  const status: SelectorOption<StatusFilterValue>[] = [{ value: "all", label: "전체" }];
  for (const option of statusOptions) {
    if (option.value !== "all" && statusValues.has(option.value)) {
      status.push(option);
    }
  }

  const ratingStatus: SelectorOption<RatingFilterStatus>[] = [{ value: "all", label: "전체" }];
  if (properties.some((property) => hasAnyPropertyRating(property))) {
    ratingStatus.push({ value: "rated", label: "평가함" });
  }
  if (properties.some((property) => !hasAnyPropertyRating(property))) {
    ratingStatus.push({ value: "unrated", label: "미평가" });
  }

  return { visited, status, ratingStatus };
}

export function clampFiltersToScope(
  filters: PropertyListFilterState,
  options: ScopedFilterOptions,
): PropertyListFilterState {
  const visitedValues = new Set(options.visited.map((option) => option.value));
  const statusValues = new Set(options.status.map((option) => option.value));
  const ratingStatusValues = new Set(options.ratingStatus.map((option) => option.value));

  let next = filters;
  if (!visitedValues.has(filters.visited)) {
    next = { ...next, visited: "all" };
  }
  if (!statusValues.has(filters.status)) {
    next = { ...next, status: "all" };
  }
  if (!ratingStatusValues.has(filters.rating.status)) {
    next = { ...next, rating: { ...next.rating, status: "all" } };
  }
  return next;
}

function resolveFilterOptions(filterOptions?: ScopedFilterOptions) {
  return {
    visited: filterOptions?.visited ?? visitedOptions,
    status: filterOptions?.status ?? statusOptions,
    ratingStatus: filterOptions?.ratingStatus ?? defaultRatingStatusOptions,
  };
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

export function applyPropertyListFilters(
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

export function MapViewFloatingButton({ onClick }: { onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setExpanded(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-xl justify-center pb-[calc(16px+env(safe-area-inset-bottom))]">
      <motion.button
        type="button"
        className="property-map-floating-btn pointer-events-auto flex items-center justify-start overflow-hidden"
        aria-label="지도 보기"
        onClick={onClick}
        initial={{ width: 44 }}
        animate={{
          width: expanded ? 116 : 44,
        }}
        style={{
          paddingLeft: 14,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 26,
          mass: 1,
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
            ease: "easeOut",
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
  /** 활동 목록 등 — 이 화면 매물만 기준으로 한 필터 선택지 */
  filterOptions?: ScopedFilterOptions;
};

export function PropertyListFilterControls({
  visitedFilter,
  statusFilter,
  ratingFilter,
  onOpenSheet,
  compact = false,
  layout = "grid",
  flat = false,
  centered = false,
  filterOptions,
}: FilterControlsProps) {
  const scrollable = layout === "scrollable";
  const filterBtnClass = flat ? "property-list-filter-btn" : "property-map-filter-btn";
  const options = resolveFilterOptions(filterOptions);

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
        valueLabel={findLabel(options.visited, visitedFilter)}
        onClick={() => onOpenSheet("visited")}
      />
      <SelectorField
        compact={compact && !scrollable}
        scrollable={scrollable}
        className={cn(scrollable ? filterBtnClass : null)}
        label="상태"
        valueLabel={findLabel(options.status, statusFilter)}
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
  ratingStatusOptions?: SelectorOption<RatingFilterStatus>[];
};

function RatingFilterSheet({
  open,
  value,
  onChange,
  onClose,
  ratingStatusOptions = defaultRatingStatusOptions,
}: RatingFilterSheetProps) {
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
          <Button variant="surface" className="w-full" onClick={() => onChange(DEFAULT_RATING_FILTER)}>
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
  filterOptions?: ScopedFilterOptions;
};

export function PropertyListFilterSheets({
  openSheet,
  filters,
  onClose,
  onFiltersChange,
  filterOptions,
}: FilterSheetsProps) {
  const options = resolveFilterOptions(filterOptions);

  return (
    <>
      <BottomSheet open={openSheet === "visited"} onClose={onClose} title="방문 필터">
        <SelectorList
          selectedValue={filters.visited}
          options={options.visited}
          onSelect={(visited) => {
            onFiltersChange({ ...filters, visited });
            onClose();
          }}
        />
      </BottomSheet>
      <BottomSheet open={openSheet === "status"} onClose={onClose} title="상태 필터">
        <SelectorList
          selectedValue={filters.status}
          options={options.status}
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
        ratingStatusOptions={options.ratingStatus}
      />
    </>
  );
}

type PropertyMapViewOverlayProps = {
  properties: PropertyRecord[];
  filters: PropertyListFilterState;
  onClose: () => void;
  onOpenSheet: (sheet: Exclude<FilterSheet, null>) => void;
  filterSheets: ReactNode;
  filterOptions?: ScopedFilterOptions;
};

export function PropertyMapViewOverlay({
  properties,
  filters,
  onClose,
  onOpenSheet,
  filterSheets,
  filterOptions,
}: PropertyMapViewOverlayProps) {
  const filteredProperties = applyPropertyListFilters(
    properties,
    filters.visited,
    filters.status,
    filters.rating,
  );

  return (
    <div className="fixed inset-0 z-40 mx-auto w-full max-w-xl bg-slate-100">
      <div className="absolute inset-0">
        <Suspense fallback={<div className="h-full animate-pulse bg-slate-200" />}>
          <PropertyMapWithSheet properties={filteredProperties} fullScreen />
        </Suspense>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 px-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="pointer-events-auto flex items-stretch gap-2">
          <button type="button" className="property-map-close-btn" aria-label="지도 닫고 목록으로" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>닫기</span>
          </button>
          <div className="property-map-top-bar property-map-filter-scroll min-w-0 flex-1">
            <PropertyListFilterControls
              layout="scrollable"
              visitedFilter={filters.visited}
              statusFilter={filters.status}
              ratingFilter={filters.rating}
              onOpenSheet={onOpenSheet}
              filterOptions={filterOptions}
            />
          </div>
        </div>
      </div>

      {filterSheets}
    </div>
  );
}

export const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

export function propertyStatusLabel(status: DecisionStatus): string {
  return statusLabelMap[status] ?? "검토";
}
