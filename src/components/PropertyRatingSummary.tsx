/**
 * @file PropertyRatingSummary.tsx
 * @description 매물 카드·상세에 3개 별점 요약과 평가 메모 아이콘을 표시한다.
 */
import MessageSquare from "lucide-react/dist/esm/icons/message-square";

import {
  hasPropertyEvaluationComment,
  PROPERTY_RATING_ITEMS,
} from "../features/property/property-ratings";
import type { PropertyRecord } from "../types/property";

type PropertyRatingSummaryProps = {
  property: PropertyRecord;
  compact?: boolean;
};

function EvaluationCommentIcon() {
  return (
    <span
      className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500"
      aria-label="평가 메모 있음"
      title="평가 메모 있음"
    >
      <MessageSquare className="h-3 w-3" strokeWidth={2.25} />
    </span>
  );
}

export function PropertyRatingSummary({ property, compact = false }: PropertyRatingSummaryProps) {
  const ratedItems = PROPERTY_RATING_ITEMS.filter((item) => property[item.key] != null);
  const hasComment = hasPropertyEvaluationComment(property);

  if (ratedItems.length === 0) {
    if (hasComment) {
      return <EvaluationCommentIcon />;
    }
    return <span className="text-ui-caption font-medium text-slate-400">평가 전</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "gap-2"}`}>
      {ratedItems.map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-0.5 ui-badge bg-emerald-50 font-normal text-emerald-700"
        >
          <span>{item.shortLabel}</span>
          <span aria-hidden="true">★{property[item.key]}</span>
        </span>
      ))}
      {hasComment ? <EvaluationCommentIcon /> : null}
    </div>
  );
}
