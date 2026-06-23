/**
 * @file PropertyRatingSummary.tsx
 * @description 매물 카드·상세에 3개 별점 요약을 표시한다.
 */
import { PROPERTY_RATING_ITEMS } from "../features/property/property-ratings";
import type { PropertyRecord } from "../types/property";

type PropertyRatingSummaryProps = {
  property: PropertyRecord;
  compact?: boolean;
};

export function PropertyRatingSummary({ property, compact = false }: PropertyRatingSummaryProps) {
  const ratedItems = PROPERTY_RATING_ITEMS.filter((item) => property[item.key] != null);

  if (ratedItems.length === 0) {
    return <span className="text-[11px] font-medium text-slate-400">평가 전</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "gap-2"}`}>
      {ratedItems.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-normal text-emerald-700"
        >
          <span>{item.shortLabel}</span>
          <span aria-hidden="true">★{property[item.key]}</span>
        </span>
      ))}
    </div>
  );
}
