#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { fetchHtmlWithLightpanda } from "./lib/fetch-html.mjs";
import { extractNaverCrawlPayloadFromHtml } from "./lib/extract-naver-crawl-payload.mjs";

function parseArgs(argv) {
  const args = {
    once: false,
    actorId: null,
    intervalMs: 5000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--once") {
      args.once = true;
      continue;
    }
    if (token === "--actor-id") {
      args.actorId = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--interval-ms") {
      const parsed = Number(argv[i + 1] ?? "5000");
      if (Number.isFinite(parsed) && parsed >= 1000) {
        args.intervalMs = parsed;
      }
      i += 1;
    }
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("환경변수 누락: VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY(또는 publishable key)");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function nextMetadata(currentMetadata, patch) {
  const current = currentMetadata && typeof currentMetadata === "object" ? currentMetadata : {};
  const currentCrawl = current.crawl && typeof current.crawl === "object" ? current.crawl : {};
  return {
    ...current,
    crawl: {
      ...currentCrawl,
      ...patch,
    },
  };
}

async function saveProperty(supabase, property) {
  const { data, error } = await supabase.rpc("hnote_save_property", {
    p_property: property,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "hnote_save_property 실패");
  }
  return data;
}

async function markProcessing(supabase, record) {
  const now = new Date().toISOString();
  const next = {
    ...record,
    metadata: nextMetadata(record.metadata, {
      status: "processing",
      startedAt: now,
      errorMessage: null,
    }),
    updated_at: now,
  };
  return saveProperty(supabase, next);
}

function applyCrawlToRecord(record, crawl) {
  const now = new Date().toISOString();
  const metadata = nextMetadata(
    {
      ...(record.metadata ?? {}),
      ...(crawl.metadata ?? {}),
    },
    {
      status: "completed",
      completedAt: now,
      errorMessage: null,
    },
  );

  return {
    ...record,
    source_url: crawl.source_url ?? record.source_url,
    source_domain: crawl.source_domain ?? record.source_domain,
    source_listing_id: crawl.source_listing_id ?? record.source_listing_id,
    title: crawl.title ?? record.title,
    property_type: crawl.property_type ?? record.property_type,
    deal_type: crawl.deal_type ?? record.deal_type,
    address: crawl.address ?? record.address,
    road_address: crawl.road_address ?? record.road_address,
    latitude: crawl.latitude ?? record.latitude,
    longitude: crawl.longitude ?? record.longitude,
    current_price_text: crawl.current_price_text ?? record.current_price_text,
    current_price_value: crawl.current_price_value ?? record.current_price_value,
    area_supply_m2: crawl.area_supply_m2 ?? record.area_supply_m2,
    area_private_m2: crawl.area_private_m2 ?? record.area_private_m2,
    floor_info: crawl.floor_info ?? record.floor_info,
    direction: crawl.direction ?? record.direction,
    thumbnail_url: crawl.thumbnail_url ?? record.thumbnail_url,
    image_urls: Array.isArray(crawl.image_urls) ? crawl.image_urls : (record.image_urls ?? []),
    metadata: {
      ...metadata,
      crawledAt: now,
      crawlSource: crawl.metadata?.crawlSource ?? "lightpanda-rsc",
    },
    updated_at: now,
  };
}

async function markFailed(supabase, record, message) {
  const now = new Date().toISOString();
  const next = {
    ...record,
    metadata: nextMetadata(record.metadata, {
      status: "failed",
      failedAt: now,
      errorMessage: message,
    }),
    updated_at: now,
  };
  return saveProperty(supabase, next);
}

async function crawlOne(supabase, record) {
  const processing = await markProcessing(supabase, record);
  try {
    const { html, httpStatus } = fetchHtmlWithLightpanda(record.source_url, {
      waitMs: 40_000,
      waitUntil: "networkidle",
    });
    if (typeof httpStatus === "number" && httpStatus >= 500) {
      throw new Error(`원격 응답 오류(${httpStatus})`);
    }

    const crawl = extractNaverCrawlPayloadFromHtml(html, record.source_url);
    const completed = applyCrawlToRecord(processing, crawl);
    await saveProperty(supabase, completed);
    const imageCount = Array.isArray(completed.image_urls) ? completed.image_urls.length : 0;
    console.log(`✅ 완료 ${record.id} ${completed.title ?? "-"} (images=${imageCount})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailed(supabase, processing, message);
    console.log(`❌ 실패 ${record.id} ${message}`);
  }
}

async function listPending(supabase, actorId) {
  const { data, error } = await supabase.rpc("hnote_list_pending_crawl", {
    p_actor_id: actorId,
    p_limit: 20,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "hnote_list_pending_crawl 실패");
  }
  return data;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = getSupabaseClient();

  console.log(
    `[hnote-crawl-worker] start once=${args.once} actorId=${args.actorId ?? "all"} interval=${args.intervalMs}ms`,
  );

  while (true) {
    const pending = await listPending(supabase, args.actorId);
    if (pending.length === 0) {
      console.log("[hnote-crawl-worker] pending 없음");
      if (args.once) {
        return;
      }
      await sleep(args.intervalMs);
      continue;
    }

    console.log(`[hnote-crawl-worker] pending ${pending.length}건 처리`);
    for (const record of pending) {
      await crawlOne(supabase, record);
    }

    if (args.once) {
      return;
    }
    await sleep(args.intervalMs);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[hnote-crawl-worker] fatal:", message);
  process.exitCode = 1;
});
