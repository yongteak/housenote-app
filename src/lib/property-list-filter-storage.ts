/**
 * @file property-list-filter-storage.ts
 * @description 매물 목록 필터 상태를 sessionStorage에 보관한다.
 */
import {
  DEFAULT_RATING_FILTER,
  type RatingFilterCriteria,
} from "../features/property/property-ratings";
import type { PropertyFilters } from "../types/property";

export type ListViewMode = "list" | "map";
export type VisitedFilterValue = NonNullable<PropertyFilters["visited"]>;
export type StatusFilterValue = NonNullable<PropertyFilters["decisionStatus"]>;

export type PropertyListFilterState = {
  visited: VisitedFilterValue;
  status: StatusFilterValue;
  rating: RatingFilterCriteria;
  viewMode: ListViewMode;
};

export const DEFAULT_PROPERTY_LIST_FILTERS: PropertyListFilterState = {
  visited: "all",
  status: "all",
  rating: DEFAULT_RATING_FILTER,
  viewMode: "list",
};

const FILTER_STORAGE_KEY = "balpoom:property-list-filters";

function isVisitedFilterValue(value: unknown): value is VisitedFilterValue {
  return value === "all" || value === "yes" || value === "no";
}

function isStatusFilterValue(value: unknown): value is StatusFilterValue {
  return (
    value === "all" ||
    value === "review" ||
    value === "hold" ||
    value === "exclude" ||
    value === "revisit"
  );
}

function isViewMode(value: unknown): value is ListViewMode {
  return value === "list" || value === "map";
}

function isRatingFilterCriteria(value: unknown): value is RatingFilterCriteria {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<RatingFilterCriteria>;
  const isMinimum = (input: unknown) => input == null || (typeof input === "number" && input >= 1 && input <= 5);

  return (
    (record.status === "all" || record.status === "rated" || record.status === "unrated") &&
    isMinimum(record.minCommute) &&
    isMinimum(record.minSchools) &&
    isMinimum(record.minConvenience)
  );
}

/**
 * sessionStorage에 저장된 필터 상태를 읽는다.
 */
export function loadPropertyListFilters(): PropertyListFilterState {
  const rawValue = sessionStorage.getItem(FILTER_STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_PROPERTY_LIST_FILTERS;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PropertyListFilterState>;
    return {
      visited: isVisitedFilterValue(parsed.visited) ? parsed.visited : DEFAULT_PROPERTY_LIST_FILTERS.visited,
      status: isStatusFilterValue(parsed.status) ? parsed.status : DEFAULT_PROPERTY_LIST_FILTERS.status,
      rating: isRatingFilterCriteria(parsed.rating) ? parsed.rating : DEFAULT_PROPERTY_LIST_FILTERS.rating,
      viewMode: isViewMode(parsed.viewMode) ? parsed.viewMode : DEFAULT_PROPERTY_LIST_FILTERS.viewMode,
    };
  } catch {
    return DEFAULT_PROPERTY_LIST_FILTERS;
  }
}

/**
 * 필터 상태를 sessionStorage에 저장한다.
 * @param filters 저장할 필터 상태
 */
export function savePropertyListFilters(filters: PropertyListFilterState) {
  sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
}
