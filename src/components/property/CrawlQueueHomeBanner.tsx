/**
 * @file CrawlQueueHomeBanner.tsx
 * @description 홈 상단 — 크롤 대기/실패 건이 있으면 「매물 저장하기」로 안내.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { listCrawlQueue } from "../../features/property/property-crawl.api";
import type { SelectedActor } from "../../types/property";

type CrawlQueueHomeBannerProps = {
  actor: SelectedActor;
};

export function CrawlQueueHomeBanner({ actor }: CrawlQueueHomeBannerProps) {
  const queueQuery = useQuery({
    queryKey: ["crawl-queue", actor.actorId],
    queryFn: () => listCrawlQueue(actor),
    refetchInterval: 3000,
  });

  const pending = queueQuery.data?.pending.length ?? 0;
  const failed = queueQuery.data?.failed.length ?? 0;
  const attention = pending + failed;

  if (attention === 0) {
    return null;
  }

  const parts: string[] = [];
  if (pending > 0) {
    parts.push(`처리 대기 ${pending}건`);
  }
  if (failed > 0) {
    parts.push(`실패 ${failed}건`);
  }

  return (
    <Link
      to="/properties/new"
      className="mx-4 mb-2 flex min-h-11 items-center justify-between gap-2 border-b border-slate-100 py-2.5 ui-list-row"
    >
      <div className="min-w-0">
        <p className="text-ui-body font-semibold text-slate-900">저장한 링크 처리 현황</p>
        <p className="mt-0.5 text-ui-caption text-slate-500">{parts.join(" · ")}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>
  );
}
