/**
 * @file CrawlQueuePanel.tsx
 * @description 「매물 저장하기」 화면 하단 — 크롤 대기·완료·실패 목록.
 *
 * pending: PC 크롤 전 — 삭제 가능
 * completed: 크롤 완료 — 탭하면 상세(평가)로 이동
 * failed: 실패 — 재시도·삭제
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { CrawlStatusBadge } from "../../components/property/CrawlStatusBadge";
import { Button } from "../ui/Button";
import {
  deleteQueuedProperty,
  listCrawlQueue,
  retryPropertyCrawl,
  type CrawlQueueBuckets,
} from "../../features/property/property-crawl.api";
import {
  getCrawlStatusLabel,
  getPropertyCrawlStatus,
  getPropertyDisplayTitle,
} from "../../features/property/property-crawl-status";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import type { PropertyRecord, SelectedActor } from "../../types/property";

type CrawlQueuePanelProps = {
  actor: SelectedActor;
};

type QueueSectionProps = {
  title: string;
  emptyText: string;
  items: PropertyRecord[];
  actor: SelectedActor;
  onMutated: () => void;
  allowDelete?: boolean;
  allowRetry?: boolean;
  linkWhenCompleted?: boolean;
};

function QueueRow({
  record,
  allowDelete,
  allowRetry,
  linkWhenCompleted,
  onDelete,
  onRetry,
  isDeleting,
  isRetrying,
}: {
  record: PropertyRecord;
  allowDelete?: boolean;
  allowRetry?: boolean;
  linkWhenCompleted?: boolean;
  onDelete: () => void;
  onRetry: () => void;
  isDeleting: boolean;
  isRetrying: boolean;
}) {
  const status = getPropertyCrawlStatus(record);
  const title = getPropertyDisplayTitle(record);
  const queuedAt = record.metadata && typeof record.metadata === "object" && "crawl" in record.metadata
    ? (record.metadata.crawl as { queuedAt?: string })?.queuedAt
    : record.created_at;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-ui-emphasis font-semibold text-slate-900">{title}</p>
          <CrawlStatusBadge property={record} />
        </div>
        <p className="mt-0.5 truncate text-ui-caption text-slate-500">{record.source_url}</p>
        <p className="mt-1 text-ui-caption text-slate-400">
          {getCrawlStatusLabel(status)} · {formatDate(queuedAt ?? record.created_at)}
        </p>
        {status === "failed" && record.metadata && typeof record.metadata === "object" && "crawl" in record.metadata ? (
          <p className="mt-1 text-ui-caption text-rose-500">
            {(record.metadata.crawl as { errorMessage?: string })?.errorMessage ?? "처리 실패"}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {allowRetry ? (
          <Button
            type="button"
            variant="surface"
            size="sm"
            className="border-slate-200 px-3"
            disabled={isRetrying}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRetry();
            }}
          >
            재시도
          </Button>
        ) : null}
        {allowDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="삭제"
            className="text-slate-400 hover:text-rose-500"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete();
            }}
            leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
          />
        ) : null}
        {linkWhenCompleted !== false ? <ChevronRight className="h-4 w-4 text-slate-300" /> : null}
      </div>
    </>
  );

  return (
    <Link
      to={`/properties/${record.id}`}
      className="flex min-h-11 items-center gap-3 py-3.5 ui-list-row"
    >
      {content}
    </Link>
  );
}

function QueueSection({
  title,
  emptyText,
  items,
  allowDelete,
  allowRetry,
  linkWhenCompleted,
  onMutated,
}: QueueSectionProps) {
  const deleteMutation = useMutation({
    mutationFn: deleteQueuedProperty,
    onSuccess: onMutated,
  });

  const retryMutation = useMutation({
    mutationFn: retryPropertyCrawl,
    onSuccess: onMutated,
  });

  return (
    <section>
      <p className="mb-1 px-1 text-ui-caption font-semibold text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-ui-caption text-slate-400">{emptyText}</p>
      ) : (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {items.map((record) => (
            <QueueRow
              key={record.id}
              record={record}
              allowDelete={allowDelete}
              allowRetry={allowRetry}
              linkWhenCompleted={linkWhenCompleted}
              isDeleting={deleteMutation.isPending}
              isRetrying={retryMutation.isPending}
              onDelete={() => {
                if (window.confirm("이 항목을 삭제할까요?")) {
                  void deleteMutation.mutateAsync(record.id);
                }
              }}
              onRetry={() => void retryMutation.mutateAsync(record.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CrawlQueuePanel({ actor }: CrawlQueuePanelProps) {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ["crawl-queue", actor.actorId],
    queryFn: () => listCrawlQueue(actor),
    refetchInterval: 2000,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["crawl-queue", actor.actorId] });
    void queryClient.invalidateQueries({ queryKey: ["properties"] });
  }

  const buckets: CrawlQueueBuckets = queueQuery.data ?? { pending: [], completed: [], failed: [] };
  const hasAny =
    buckets.pending.length > 0 || buckets.completed.length > 0 || buckets.failed.length > 0;

  if (!hasAny && !queueQuery.isLoading) {
    return (
      <section className="border-t border-slate-100 pt-6">
        <p className="px-1 text-ui-caption font-semibold text-slate-500">저장한 링크</p>
        <p className="mt-2 px-1 text-ui-caption text-slate-400">아직 저장한 링크가 없어요.</p>
      </section>
    );
  }

  return (
    <section className={cn("space-y-5 border-t border-slate-100 pt-6")}>
      <div className="px-1">
        <p className="text-ui-caption font-semibold text-slate-500">저장한 링크</p>
        <p className="mt-0.5 text-ui-caption text-slate-400">PC에서 정보를 가져온 뒤 목록에 표시돼요.</p>
      </div>

      <QueueSection
        title={`처리 대기 · ${buckets.pending.length}건`}
        emptyText="대기 중인 링크가 없어요."
        items={buckets.pending}
        actor={actor}
        allowDelete
        onMutated={invalidate}
      />

      <QueueSection
        title={`처리 완료 · ${buckets.completed.length}건`}
        emptyText="아직 완료된 항목이 없어요."
        items={buckets.completed.slice(0, 10)}
        actor={actor}
        linkWhenCompleted
        allowDelete
        onMutated={invalidate}
      />

      <QueueSection
        title={`처리 실패 · ${buckets.failed.length}건`}
        emptyText="실패한 항목이 없어요."
        items={buckets.failed}
        actor={actor}
        allowDelete
        allowRetry
        onMutated={invalidate}
      />
    </section>
  );
}
