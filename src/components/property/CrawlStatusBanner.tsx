/**
 * @file CrawlStatusBanner.tsx
 * @description 매물 상세 상단 크롤 상태 배너.
 *
 * pending / processing / failed 일 때만 노출한다.
 * completed 이면 null 을 반환해 본문만 보여준다.
 */
import LoaderCircle from "lucide-react/dist/esm/icons/loader-circle";

import { Button } from "../ui/Button";
import {
  getCrawlStatusDescription,
  getCrawlStatusLabel,
  getPropertyCrawlStatus,
} from "../../features/property/property-crawl-status";
import { cn } from "../../lib/cn";
import type { PropertyRecord } from "../../types/property";

type CrawlStatusBannerProps = {
  property: PropertyRecord;
  onRetry?: () => void;
  isRetrying?: boolean;
};

export function CrawlStatusBanner({ property, onRetry, isRetrying = false }: CrawlStatusBannerProps) {
  const status = getPropertyCrawlStatus(property);

  if (status === "completed") {
    return null;
  }

  const label = getCrawlStatusLabel(status);
  const description = getCrawlStatusDescription(property);

  return (
    <div
      className={cn(
        "border-b px-4 py-3",
        status === "failed" && "border-rose-100 bg-rose-50/80",
        status === "pending" && "border-slate-100 bg-slate-50",
        status === "processing" && "border-blue-100 bg-blue-50/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {status === "processing" ? (
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-hidden="true" />
            ) : null}
            <p
              className={cn(
                "text-[13px] font-semibold",
                status === "failed" && "text-rose-700",
                status === "pending" && "text-slate-700",
                status === "processing" && "text-blue-700",
              )}
            >
              {label}
            </p>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{description}</p>
        </div>

        {status === "failed" && onRetry ? (
          <Button
            type="button"
            variant="surface"
            size="sm"
            className="shrink-0 border-rose-200 text-rose-600"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying ? "재시도 중" : "다시 시도"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
