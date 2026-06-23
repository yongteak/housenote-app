import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

import { PropertyRatingSummary } from "../../components/PropertyRatingSummary";
import { CrawlStatusBadge } from "../../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../../components/property/FavoriteButton";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { NavBar } from "../../components/ui/NavBar";
import { PriceDisplay } from "../../components/PriceDisplay";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import type { DecisionStatus, PropertyRecord } from "../../types/property";

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

const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

function statusLabel(status: DecisionStatus): string {
  return statusLabelMap[status] ?? "검토";
}

export function ActivityPropertyListPage({
  title,
  rows,
  emptyTitle,
  emptyDescription,
  footer,
}: ActivityPropertyListPageProps) {
  const navigate = useNavigate();

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
      <main className="flex flex-1 flex-col px-4 pb-6 pt-2">
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <p className="mb-2 px-1 text-[12px] font-medium text-slate-500">총 {rows.length}건</p>
            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
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
                        className="shrink-0 text-[15px] font-bold text-emerald-600"
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
                        {statusLabel(row.property.decision_status)}
                      </span>
                      <PropertyRatingSummary property={row.property} compact />
                    </div>
                  </div>
                  </Link>
                  <FavoriteButton propertyId={row.property.id} className="self-start" />
                </div>
              ))}
            </div>
          </>
        )}
        {footer}
      </main>
    </div>
  );
}

export function buildMeta(prefix: string, value: string) {
  return `${prefix} ${formatDate(value)}`;
}
