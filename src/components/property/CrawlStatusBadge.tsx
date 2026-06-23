import {
  getCrawlStatusLabel,
  getPropertyCrawlStatus,
  isCrawlCompleted,
} from "../../features/property/property-crawl-status";
import { cn } from "../../lib/cn";
import type { PropertyRecord } from "../../types/property";

type CrawlStatusBadgeProps = {
  property: PropertyRecord;
  className?: string;
};

/** 크롤 미완료·실패 매물에만 상태 칩을 표시한다. */
export function CrawlStatusBadge({ property, className }: CrawlStatusBadgeProps) {
  if (isCrawlCompleted(property)) {
    return null;
  }

  const status = getPropertyCrawlStatus(property);
  const label = getCrawlStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
        status === "pending" && "bg-slate-100 text-slate-600",
        status === "processing" && "bg-blue-50 text-blue-700",
        status === "failed" && "bg-rose-50 text-rose-700",
        className,
      )}
    >
      {label}
    </span>
  );
}
