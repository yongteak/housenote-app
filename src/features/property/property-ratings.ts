/**
 * @file property-ratings.ts
 * @description 매물 별점 항목 정의와 평균·필터 판별 유틸.
 */
import type { PropertyRecord } from "../../types/property";

/** DB 컬럼에 매핑되는 별점 항목 키 */
export type PropertyRatingKey = "rating_location" | "rating_price" | "rating_condition";

export type PropertyRatingItem = {
  key: PropertyRatingKey;
  label: string;
  shortLabel: string;
  description: string;
};

/** 앱에서 사용하는 3개 별점 항목 */
export const PROPERTY_RATING_ITEMS: PropertyRatingItem[] = [
  {
    key: "rating_location",
    label: "출퇴근",
    shortLabel: "출퇴근",
    description: "회사·학교까지 가기 편한가요?",
  },
  {
    key: "rating_price",
    label: "주변 학교",
    shortLabel: "학교",
    description: "초·중·고와 학원이 가까운가요?",
  },
  {
    key: "rating_condition",
    label: "편의시설",
    shortLabel: "편의",
    description: "마트·병원·공원 등 생활이 편한가요?",
  },
];

export type RatingFilterStatus = "all" | "rated" | "unrated";

/** 평가 필터 상세 조건 */
export type RatingFilterCriteria = {
  status: RatingFilterStatus;
  minCommute: number | null;
  minSchools: number | null;
  minConvenience: number | null;
};

export const DEFAULT_RATING_FILTER: RatingFilterCriteria = {
  status: "all",
  minCommute: null,
  minSchools: null,
  minConvenience: null,
};

const MIN_RATING_BY_KEY: Record<PropertyRatingKey, keyof RatingFilterCriteria> = {
  rating_location: "minCommute",
  rating_price: "minSchools",
  rating_condition: "minConvenience",
};

/**
 * 매물의 3개 별점 값을 배열로 반환한다.
 * @param property 매물 레코드
 */
export function getPropertyRatingValues(property: PropertyRecord): number[] {
  return PROPERTY_RATING_ITEMS.map((item) => property[item.key]).filter((value): value is number => value != null);
}

/**
 * 매물 평균 별점을 계산한다. 미평가면 null.
 * @param property 매물 레코드
 */
export function getPropertyAverageRating(property: PropertyRecord): number | null {
  const ratings = getPropertyRatingValues(property);
  if (ratings.length === 0) {
    return null;
  }
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}

/**
 * 하나라도 별점이 입력됐는지 확인한다.
 * @param property 매물 레코드
 */
export function hasAnyPropertyRating(property: PropertyRecord): boolean {
  return getPropertyRatingValues(property).length > 0;
}

/**
 * 평가 필터 조건을 만족하는지 확인한다.
 * @param property 매물 레코드
 * @param criteria 평가 필터
 */
export function matchesRatingFilter(property: PropertyRecord, criteria: RatingFilterCriteria): boolean {
  const rated = hasAnyPropertyRating(property);

  if (criteria.status === "rated" && !rated) {
    return false;
  }
  if (criteria.status === "unrated" && rated) {
    return false;
  }

  const minimums: Record<PropertyRatingKey, number | null> = {
    rating_location: criteria.minCommute,
    rating_price: criteria.minSchools,
    rating_condition: criteria.minConvenience,
  };

  for (const item of PROPERTY_RATING_ITEMS) {
    const minimum = minimums[item.key];
    if (minimum == null) {
      continue;
    }

    const value = property[item.key];
    if (value == null || value < minimum) {
      return false;
    }
  }

  return true;
}

/**
 * 평가 필터 UI에 표시할 요약 라벨을 만든다.
 * @param criteria 평가 필터
 */
export function getRatingFilterLabel(criteria: RatingFilterCriteria): string {
  if (criteria.status === "unrated") {
    return "미평가";
  }
  if (criteria.status === "rated") {
    const hasMinimum =
      criteria.minCommute != null || criteria.minSchools != null || criteria.minConvenience != null;
    return hasMinimum ? "평가 · 조건" : "평가함";
  }

  const hasMinimum =
    criteria.minCommute != null || criteria.minSchools != null || criteria.minConvenience != null;
  return hasMinimum ? "평가 · 조건" : "평가 전체";
}

/**
 * 평가 필터의 최소 점수 필드명을 반환한다.
 * @param key 별점 항목 키
 */
export function getMinimumRatingField(key: PropertyRatingKey): keyof RatingFilterCriteria {
  return MIN_RATING_BY_KEY[key];
}
