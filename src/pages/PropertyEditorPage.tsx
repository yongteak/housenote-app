/**
 * @file PropertyEditorPage.tsx
 * @description 「매물 저장하기」— 네이버 부동산 링크를 큐에 등록하고 처리 상태를 관리한다.
 *
 * ## 사용자 흐름
 * 1. 링크 붙여넣기 → 「저장하기」
 * 2. pending 레코드 생성 (즉시 크롤하지 않음)
 * 3. PC 크롤러(worker)가 pending 목록을 가져가 처리
 * 4. 완료되면 홈 목록·상세에서 매물 정보 확인 → 상세에서 평가
 *
 * ## PC 크롤러 연동
 * @see property-crawl.api.ts 의 `listPropertiesPendingCrawl`, `completePropertyCrawl`
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Link2 from "lucide-react/dist/esm/icons/link-2";

import { CrawlQueuePanel } from "../components/property/CrawlQueuePanel";
import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import { enqueuePropertyUrl, listCrawlQueue } from "../features/property/property-crawl.api";
import { useAuth } from "../lib/auth-context";

export function PropertyEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useAuth();
  const [sourceUrl, setSourceUrl] = useState("");

  const queueQuery = useQuery({
    queryKey: ["crawl-queue", actor?.actorId],
    queryFn: () => listCrawlQueue(actor!),
    enabled: Boolean(actor),
    refetchInterval: 2000,
  });

  const enqueueMutation = useMutation({
    mutationFn: async (url: string) => {
      if (!actor) {
        throw new Error("저장자를 먼저 선택해 주세요.");
      }
      return enqueuePropertyUrl(url, actor);
    },
    onSuccess: async () => {
      setSourceUrl("");
      await queryClient.invalidateQueries({ queryKey: ["crawl-queue", actor?.actorId] });
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  const queueCount =
    (queueQuery.data?.pending.length ?? 0) +
    (queueQuery.data?.completed.length ?? 0) +
    (queueQuery.data?.failed.length ?? 0);

  const showCenterGuide = !enqueueMutation.isPending && sourceUrl.trim().length === 0 && queueCount === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <NavBar
        title="매물 저장하기"
        leftSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="뒤로 가기"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          />
        }
      />

      <main className="flex flex-1 flex-col px-4 pb-8 pt-2">
        <div className="space-y-2">
          <div className="relative">
            <input
              className="toss-input pl-10"
              placeholder="매물 링크 붙여넣기"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
            <Link2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={enqueueMutation.isPending || !sourceUrl.trim()}
            onClick={() => enqueueMutation.mutate(sourceUrl.trim())}
          >
            {enqueueMutation.isPending ? "저장 중..." : "저장하기"}
          </Button>
          {enqueueMutation.error ? (
            <p className="px-1 text-[12px] text-rose-500">{(enqueueMutation.error as Error).message}</p>
          ) : null}
        </div>

        {showCenterGuide ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <p className="text-[14px] font-medium text-slate-700">관심 매물 링크를 저장해 보세요</p>
            <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-slate-400">
              저장하면 PC에서 순서대로 정보를 불러와요.
              <br />
              완료된 매물은 목록과 상세에서 확인할 수 있어요.
            </p>
          </div>
        ) : null}

        {actor ? <CrawlQueuePanel actor={actor} /> : null}
      </main>
    </div>
  );
}
