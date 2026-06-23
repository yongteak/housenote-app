import type { PropertyCrawlStatus } from "../../src/types/property-crawl-queue";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
} as const;

function color(text: string, code: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }
  return `${code}${text}${ANSI.reset}`;
}

function statusColor(status: PropertyCrawlStatus): string {
  switch (status) {
    case "pending":
      return ANSI.yellow;
    case "processing":
      return ANSI.cyan;
    case "completed":
      return ANSI.green;
    case "failed":
      return ANSI.red;
    default:
      return ANSI.dim;
  }
}

export type CrawlCliConfig = {
  once: boolean;
  actorId: string | null;
  propertyId: string | null;
  url: string | null;
  intervalMs: number;
  batchLimit: number;
  waitMs: number;
  /** complex_detail → article_detail 변환 (기본: 단지 데이터 저장) */
  resolveArticle: boolean;
  /** resolveArticle 시 후보 여러 건이면 최저가 1건 자동 선택 */
  pickFirst: boolean;
};

export type QueueSnapshot = {
  pending: number;
  batchSize: number;
  batchNumber: number;
};

export type SessionStats = {
  batches: number;
  succeeded: number;
  failed: number;
  startedAt: number;
};

function truncateUrl(url: string, max = 56): string {
  if (url.length <= max) {
    return url;
  }
  return `${url.slice(0, max - 1)}…`;
}

export function printBanner(config: CrawlCliConfig): void {
  console.log("");
  console.log(color("┌─ hnote crawl ─────────────────────────────", ANSI.bold));
  if (config.url) {
    console.log(`│ 모드       URL 직접 크롤${config.propertyId ? " (DB 반영)" : " (미리보기)"}`);
    console.log(`│ URL        ${truncateUrl(config.url)}`);
    if (config.propertyId) {
      console.log(`│ 매물 ID    ${config.propertyId}`);
    }
  } else {
    console.log(`│ 모드       ${config.once ? "1회 실행 (--once)" : "폴링 (Ctrl+C 종료)"}`);
    console.log(`│ 저장자     ${config.actorId ?? "전체"}`);
    console.log(`│ 배치 한도  ${config.batchLimit}건`);
    console.log(`│ 폴링 간격  ${config.intervalMs}ms`);
  }
  console.log(`│ Lightpanda wait ${config.waitMs}ms`);
  console.log(color("└────────────────────────────────────────────", ANSI.bold));
  console.log("");
}

export function printResolvedUrlHint(inputUrl: string, resolvedUrl: string): void {
  if (inputUrl.trim() === resolvedUrl.trim()) {
    return;
  }
  console.log(color(`  ↳ Lightpanda 최종 URL → ${truncateUrl(resolvedUrl, 72)}`, ANSI.dim));
}

export function printLayerHint(layerDescription: string): void {
  console.log(color(`  ↳ layer ${layerDescription}`, ANSI.dim));
}

export function printComplexResolveHint(articleId: string, candidateCount?: number): void {
  const suffix = candidateCount && candidateCount > 1 ? ` (${candidateCount}건 중 최저가 1건)` : "";
  console.log(color(`  ↳ complex_detail → articleId=${articleId}${suffix} · Lightpanda 재크롤`, ANSI.cyan));
  console.log("");
}

export function printMultiPickWarning(count: number): void {
  console.log(
    color(`  ↳ complex_detail 후보 ${count}건 · --pick-first 로 최저가 1건 자동 선택`, ANSI.yellow),
  );
  console.log("");
}

export function printUrlDryRunResult(payload: {
  crawlKind?: string | null;
  title: string | null | undefined;
  deal_type: string | null | undefined;
  address: string | null | undefined;
  current_price_text: string | null | undefined;
  source_listing_id: string | null | undefined;
  imageCount: number;
  tradeCount?: number;
  listingCount?: number | null;
  priceSource?: string | null;
  elapsedMs: number;
}): void {
  const kindLabel = payload.crawlKind === "complex" ? "단지" : "매물";
  console.log(color("── 크롤 결과 (DB 미반영) ──", ANSI.bold));
  console.log(`  종류     ${kindLabel}${payload.crawlKind ? ` (${payload.crawlKind})` : ""}`);
  console.log(`  제목     ${payload.title ?? "-"}`);
  console.log(`  거래     ${payload.deal_type ?? "-"} · ${payload.current_price_text ?? "-"}`);
  console.log(`  주소     ${payload.address ?? "-"}`);
  console.log(`  ID       ${payload.source_listing_id ?? "-"}`);
  if (payload.crawlKind === "complex") {
    const listing = payload.listingCount != null ? ` · 매매 ${payload.listingCount}건` : "";
    const source = payload.priceSource === "listing_min" ? " · 최저 매물가" : "";
    console.log(`  실거래   ${payload.tradeCount ?? 0}건${listing}${source} · ${payload.elapsedMs}ms`);
  } else {
    console.log(`  이미지   ${payload.imageCount}장 · ${payload.elapsedMs}ms`);
  }
  console.log("");
}

export function printQueueSnapshot(snapshot: QueueSnapshot): void {
  const { pending, batchSize, batchNumber } = snapshot;
  console.log(
    color(`[배치 #${batchNumber}]`, ANSI.bold) +
      ` 대기 ${color(String(pending), ANSI.yellow)}건` +
      ` · 이번 처리 ${color(String(batchSize), ANSI.cyan)}건`,
  );
}

export function printIdle(nextPollMs: number): void {
  console.log(color(`  ↳ 대기 중인 매물 없음 · ${nextPollMs}ms 후 다시 확인`, ANSI.dim));
  console.log("");
}

export function printItemStart(index: number, total: number, id: string, label: string): void {
  const progress = color(`[${index}/${total}]`, ANSI.magenta);
  const status = color("처리 중", statusColor("processing"));
  console.log(`${progress} ${status} ${color(id.slice(0, 8), ANSI.dim)} · ${label}`);
}

export function printItemSuccess(
  index: number,
  total: number,
  id: string,
  title: string,
  details: { imageCount: number; elapsedMs: number },
): void {
  const progress = color(`[${index}/${total}]`, ANSI.magenta);
  const status = color("완료", statusColor("completed"));
  const meta = color(`images=${details.imageCount} · ${details.elapsedMs}ms`, ANSI.dim);
  console.log(`${progress} ${status} ${color(id.slice(0, 8), ANSI.dim)} · ${title} (${meta})`);
}

export function printItemFail(index: number, total: number, id: string, message: string, elapsedMs: number): void {
  const progress = color(`[${index}/${total}]`, ANSI.magenta);
  const status = color("실패", statusColor("failed"));
  const meta = color(`${elapsedMs}ms`, ANSI.dim);
  console.log(`${progress} ${status} ${color(id.slice(0, 8), ANSI.dim)} · ${message} (${meta})`);
}

export function printBatchSummary(batchNumber: number, ok: number, fail: number, elapsedMs: number): void {
  const parts = [
    color(`배치 #${batchNumber} 종료`, ANSI.bold),
    color(`성공 ${ok}`, ANSI.green),
    fail > 0 ? color(`실패 ${fail}`, ANSI.red) : color("실패 0", ANSI.dim),
    color(`${elapsedMs}ms`, ANSI.dim),
  ];
  console.log(`  ↳ ${parts.join(" · ")}`);
  console.log("");
}

export function printSessionSummary(stats: SessionStats): void {
  const elapsedSec = ((Date.now() - stats.startedAt) / 1000).toFixed(1);
  console.log(color("── 세션 요약 ──", ANSI.bold));
  console.log(`  배치 ${stats.batches}회 · 성공 ${stats.succeeded} · 실패 ${stats.failed} · ${elapsedSec}s`);
  console.log("");
}

export function printFatal(message: string): void {
  console.error(color(`[fatal] ${message}`, ANSI.red));
}
