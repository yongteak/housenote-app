#!/usr/bin/env bun
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  crawlOne,
  crawlPropertyWithUrl,
  crawlUrlDirect,
  getItemLabel,
  listPendingCrawl,
} from "./lib/crawl-worker";
import {
  describeNaverMapLayer,
} from "./lib/decode-naver-map-layer";
import {
  printBanner,
  printBatchSummary,
  printFatal,
  printIdle,
  printItemFail,
  printItemStart,
  printItemSuccess,
  printQueueSnapshot,
  printSessionSummary,
  printUrlDryRunResult,
  printResolvedUrlHint,
  printLayerHint,
  printComplexResolveHint,
  printMultiPickWarning,
  type CrawlCliConfig,
  type SessionStats,
} from "./lib/cli-output";
import { getSupabaseClient } from "./lib/supabase";

function parseArgs(argv: string[]): CrawlCliConfig {
  const config: CrawlCliConfig = {
    once: false,
    actorId: null,
    propertyId: null,
    url: null,
    intervalMs: 5000,
    batchLimit: 20,
    waitMs: 40_000,
    resolveArticle: false,
    pickFirst: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--once") {
      config.once = true;
      continue;
    }
    if (token === "--resolve-article") {
      config.resolveArticle = true;
      continue;
    }
    if (token === "--pick-first") {
      config.pickFirst = true;
      config.resolveArticle = true;
      continue;
    }
    if (token === "--url") {
      config.url = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--property-id") {
      config.propertyId = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--actor-id") {
      config.actorId = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--interval-ms") {
      const parsed = Number(argv[i + 1] ?? "5000");
      if (Number.isFinite(parsed) && parsed >= 1000) {
        config.intervalMs = parsed;
      }
      i += 1;
      continue;
    }
    if (token === "--batch-limit") {
      const parsed = Number(argv[i + 1] ?? "20");
      if (Number.isFinite(parsed) && parsed >= 1) {
        config.batchLimit = Math.floor(parsed);
      }
      i += 1;
      continue;
    }
    if (token === "--wait-ms") {
      const parsed = Number(argv[i + 1] ?? "40000");
      if (Number.isFinite(parsed) && parsed >= 5000) {
        config.waitMs = Math.floor(parsed);
      }
      i += 1;
    }
  }

  return config;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const PENDING_SCAN_LIMIT = 200;

async function runBatch(
  supabase: SupabaseClient,
  config: CrawlCliConfig,
  batchNumber: number,
  stats: SessionStats,
): Promise<void> {
  const allPending = await listPendingCrawl(supabase, config.actorId, PENDING_SCAN_LIMIT);
  const batch = allPending.slice(0, config.batchLimit);
  printQueueSnapshot({
    pending: allPending.length,
    batchSize: batch.length,
    batchNumber,
  });

  if (batch.length === 0) {
    printIdle(config.intervalMs);
    return;
  }

  const batchStartedAt = Date.now();
  let batchOk = 0;
  let batchFail = 0;

  for (const [index, record] of batch.entries()) {
    const itemIndex = index + 1;
    const label = getItemLabel(record);
    printItemStart(itemIndex, batch.length, record.id, label);

    const result = await crawlOne(supabase, record, config.waitMs);
    if (result.ok) {
      batchOk += 1;
      stats.succeeded += 1;
      printItemSuccess(itemIndex, batch.length, record.id, result.record.title ?? label, {
        imageCount: result.imageCount,
        elapsedMs: result.elapsedMs,
      });
    } else {
      batchFail += 1;
      stats.failed += 1;
      printItemFail(itemIndex, batch.length, result.id, result.message, result.elapsedMs);
    }
  }

  printBatchSummary(batchNumber, batchOk, batchFail, Date.now() - batchStartedAt);
}

async function runUrlMode(config: CrawlCliConfig): Promise<void> {
  if (!config.url) {
    throw new Error("--url 값이 필요합니다.");
  }

  printBanner(config);

  if (config.propertyId) {
    const supabase = getSupabaseClient();
    const label = config.url;
    printItemStart(1, 1, config.propertyId, label);

    const result = await crawlPropertyWithUrl(supabase, config.propertyId, config.url, config.waitMs);
    if (result.ok) {
      printItemSuccess(1, 1, config.propertyId, result.record.title ?? label, {
        imageCount: result.imageCount,
        elapsedMs: result.elapsedMs,
      });
      return;
    }
    printItemFail(1, 1, result.id, result.message, result.elapsedMs);
    process.exitCode = 1;
    return;
  }

  const startedAt = Date.now();

  try {
    const result = await crawlUrlDirect(config.url, config.waitMs, {
      resolveArticle: config.resolveArticle,
      pickFirst: config.pickFirst,
    });
    printResolvedUrlHint(config.url, result.finalUrl);
    printLayerHint(describeNaverMapLayer(result.layerAnalysis));
    if (result.resolvedFromComplex && result.layerAnalysis.articleId) {
      printComplexResolveHint(result.layerAnalysis.articleId, result.candidateCount);
    }
    const crawlKind = result.payload.metadata?.crawlKind ?? "article";
    printUrlDryRunResult({
      crawlKind,
      title: result.payload.title,
      deal_type: result.payload.deal_type,
      address: result.payload.address,
      current_price_text: result.payload.current_price_text,
      source_listing_id: result.payload.source_listing_id,
      imageCount: result.payload.image_urls?.length ?? 0,
      tradeCount: result.payload.metadata?.complexSnapshot?.recentRealTrades?.length ?? 0,
      listingCount: result.payload.metadata?.complexSnapshot?.listingCounts?.dealCount ?? null,
      priceSource: result.payload.metadata?.complexSnapshot?.priceSource ?? null,
      elapsedMs: result.elapsedMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printItemFail(1, 1, "-", message, Date.now() - startedAt);
    process.exitCode = 1;
  }
}

async function run(): Promise<void> {
  const config = parseArgs(process.argv.slice(2));

  if (config.url) {
    await runUrlMode(config);
    return;
  }

  const supabase = getSupabaseClient();
  const stats: SessionStats = {
    batches: 0,
    succeeded: 0,
    failed: 0,
    startedAt: Date.now(),
  };

  printBanner(config);

  while (true) {
    stats.batches += 1;
    await runBatch(supabase, config, stats.batches, stats);

    if (config.once) {
      printSessionSummary(stats);
      return;
    }

    await sleep(config.intervalMs);
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  printFatal(message);
  process.exitCode = 1;
});
