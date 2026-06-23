import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { NavBar } from "../../components/ui/NavBar";
import { formatDate, formatWon } from "../../lib/format";
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

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
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
      <main className="flex-1 space-y-3 px-4 py-4 pb-6">
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          rows.map((row) => (
            <article key={row.id} className="toss-card border-slate-200">
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                  {row.property.thumbnail_url ? (
                    <img src={row.property.thumbnail_url} alt={row.property.title ?? "매물 이미지"} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-slate-950">{row.property.title ?? "제목 없음"}</p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">{row.property.address ?? "-"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[12px] font-medium text-slate-500">{row.meta}</p>
                    {row.badge ? (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {row.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] font-semibold text-emerald-700">
                    {formatWon(row.property.desired_price_value ?? row.property.current_price_value)}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
        {footer}
      </main>
    </div>
  );
}

export function buildMeta(prefix: string, value: string) {
  return `${prefix} ${formatDate(value)}`;
}
