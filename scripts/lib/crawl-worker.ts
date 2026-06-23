import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPropertySavePayload } from "../../src/features/property/property-crawl.mapper";
import { getPropertyCrawlKind } from "../../src/types/property-crawl-kind";
import { getPropertyDisplayTitle, mergeCrawlMeta } from "../../src/features/property/property-crawl-status";
import { assertNaverPropertyUrl } from "../../src/features/property/naver-property-url";
import type { PropertyCrawlPayload } from "../../src/types/property-crawl";
import type { PropertyRecord } from "../../src/types/property";
import {
  analyzeNaverMapUrl,
  describeNaverMapLayer,
  resolveCanonicalMapUrl,
  resolveCrawlMapUrl,
  type NaverMapLayerAnalysis,
} from "./decode-naver-map-layer";
import { extractNaverComplexPayloadFromHtml } from "./extract-naver-complex-payload";
import { extractNaverCrawlPayloadFromHtml } from "./extract-naver-crawl-payload";
import { fetchComplexWithInjectedApi } from "./fetch-complex-via-lightpanda";
import { fetchHtmlWithLightpanda } from "./fetch-html";

export type CrawlUrlDirectResult = {
  payload: PropertyCrawlPayload;
  elapsedMs: number;
  httpStatus?: number;
  inputUrl: string;
  finalUrl: string;
  layerAnalysis: NaverMapLayerAnalysis;
  resolvedFromComplex: boolean;
  candidateCount?: number;
};

export type CrawlResolveOptions = {
  /** complex_detail URL을 article_detail 매물 1건으로 변환 (기본: 단지 데이터 그대로 저장) */
  resolveArticle?: boolean;
  pickFirst?: boolean;
};

function resolveSourceDomain(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return null;
  }
}

async function fetchAndExtract(
  inputUrl: string,
  waitMs: number,
  resolveOptions: CrawlResolveOptions = {},
): Promise<CrawlUrlDirectResult> {
  const startedAt = Date.now();
  const probe = fetchHtmlWithLightpanda(inputUrl, {
    waitMs,
    waitUntil: "networkidle",
  });

  if (typeof probe.httpStatus === "number" && probe.httpStatus >= 500) {
    throw new Error(`원격 응답 오류(${probe.httpStatus})`);
  }

  const mapUrl = resolveCanonicalMapUrl(probe.html, probe.finalUrl);
  const layerAnalysis = analyzeNaverMapUrl(mapUrl);

  if (
    layerAnalysis.viewType === "complex_detail" &&
    layerAnalysis.complexId &&
    !resolveOptions.resolveArticle
  ) {
    const enriched = fetchComplexWithInjectedApi({
      sourceUrl: inputUrl,
      layerAnalysis,
      waitMs,
    });
    const mapUrl = resolveCanonicalMapUrl(enriched.html, enriched.finalUrl);
    const resolvedAnalysis = analyzeNaverMapUrl(mapUrl);
    const payload = await extractNaverComplexPayloadFromHtml(
      enriched.html,
      mapUrl,
      resolvedAnalysis.complexId ? resolvedAnalysis : layerAnalysis,
      enriched.injected,
    );
    return {
      payload,
      elapsedMs: Date.now() - startedAt,
      httpStatus: enriched.httpStatus,
      inputUrl,
      finalUrl: mapUrl,
      layerAnalysis: resolvedAnalysis.complexId ? resolvedAnalysis : layerAnalysis,
      resolvedFromComplex: false,
    };
  }

  let html = probe.html;
  let httpStatus = probe.httpStatus;
  let finalUrl = mapUrl;
  let resolvedFromComplex = false;
  let candidateCount: number | undefined;
  let resolvedLayerAnalysis = layerAnalysis;

  if (layerAnalysis.viewType === "complex_detail" && layerAnalysis.complexId && resolveOptions.resolveArticle) {
    const resolved = await resolveCrawlMapUrl(mapUrl, layerAnalysis, {
      pickFirst: resolveOptions.pickFirst ?? false,
    });
    resolvedFromComplex = resolved.resolvedFromComplex;
    candidateCount = resolved.candidateCount;
    resolvedLayerAnalysis = resolved.layerAnalysis;
    finalUrl = resolved.crawlUrl;

    if (resolved.resolvedFromComplex) {
      const articlePage = fetchHtmlWithLightpanda(resolved.crawlUrl, {
        waitMs,
        waitUntil: "networkidle",
      });
      if (typeof articlePage.httpStatus === "number" && articlePage.httpStatus >= 500) {
        throw new Error(`원격 응답 오류(${articlePage.httpStatus})`);
      }
      html = articlePage.html;
      httpStatus = articlePage.httpStatus;
    }
  }

  const payload = extractNaverCrawlPayloadFromHtml(html, finalUrl);

  return {
    payload,
    elapsedMs: Date.now() - startedAt,
    httpStatus,
    inputUrl,
    finalUrl,
    layerAnalysis: resolvedLayerAnalysis,
    resolvedFromComplex,
    candidateCount,
  };
}

export async function crawlUrlDirect(
  sourceUrl: string,
  waitMs: number,
  resolveOptions: CrawlResolveOptions = {},
): Promise<CrawlUrlDirectResult> {
  const trimmed = sourceUrl.trim();
  assertNaverPropertyUrl(trimmed);
  return fetchAndExtract(trimmed, waitMs, resolveOptions);
}

export async function fetchPropertyRecord(
  supabase: SupabaseClient,
  propertyId: string,
): Promise<PropertyRecord | null> {
  const { data, error } = await supabase.rpc("hnote_get_property", {
    p_property_id: propertyId,
  });
  if (error) {
    throw new Error(error.message);
  }
  return (data as PropertyRecord | null) ?? null;
}

export async function crawlPropertyWithUrl(
  supabase: SupabaseClient,
  propertyId: string,
  sourceUrl: string,
  waitMs: number,
): Promise<CrawlOneResult> {
  const trimmed = sourceUrl.trim();
  assertNaverPropertyUrl(trimmed);

  const record = await fetchPropertyRecord(supabase, propertyId);
  if (!record) {
    throw new Error("매물을 찾을 수 없습니다.");
  }

  const next: PropertyRecord = {
    ...record,
    source_url: trimmed,
    source_domain: resolveSourceDomain(trimmed),
  };
  const saved = await saveProperty(supabase, next);
  return crawlOne(supabase, saved, waitMs);
}

async function saveProperty(supabase: SupabaseClient, property: PropertyRecord): Promise<PropertyRecord> {
  const { data, error } = await supabase.rpc("hnote_save_property", {
    p_property: property,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "hnote_save_property 실패");
  }
  return data as PropertyRecord;
}

export async function listPendingCrawl(
  supabase: SupabaseClient,
  actorId: string | null,
  limit: number,
): Promise<PropertyRecord[]> {
  const { data, error } = await supabase.rpc("hnote_list_pending_crawl", {
    p_actor_id: actorId,
    p_limit: limit,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "hnote_list_pending_crawl 실패");
  }
  return data as PropertyRecord[];
}

export async function markProcessing(supabase: SupabaseClient, record: PropertyRecord): Promise<PropertyRecord> {
  const now = new Date().toISOString();
  const next: PropertyRecord = {
    ...record,
    metadata: mergeCrawlMeta(record, {
      status: "processing",
      startedAt: now,
      errorMessage: null,
    }),
    updated_at: now,
  };
  return saveProperty(supabase, next);
}

function applyCrawlToRecord(record: PropertyRecord, crawl: PropertyCrawlPayload): PropertyRecord {
  const now = new Date().toISOString();
  const crawlKind = getPropertyCrawlKind(crawl);
  const formValues = {
    source_url: crawl.source_url,
    title: crawl.title ?? "",
    deal_type: crawl.deal_type ?? "매매",
    address: crawl.address ?? "",
    current_price_value: crawl.current_price_value ?? null,
    desired_price_value: record.desired_price_value ?? null,
    visited: record.visited,
    visited_at: record.visited_at ? record.visited_at.slice(0, 10) : "",
    rating_location: record.rating_location,
    rating_price: record.rating_price,
    rating_condition: record.rating_condition,
    rating_sunlight: record.rating_sunlight,
    rating_environment: record.rating_environment,
    pros: record.pros ?? "",
    cons: record.cons ?? "",
    memo: record.memo ?? "",
    decision_status: record.decision_status,
    thumbnail_url: crawl.thumbnail_url ?? record.thumbnail_url ?? "",
  };

  const payload = buildPropertySavePayload(formValues, crawl);
  const crawlMeta = mergeCrawlMeta(record, {
    status: "completed",
    completedAt: now,
    errorMessage: null,
  });

  return {
    ...record,
    ...payload,
    metadata: {
      ...payload.metadata,
      crawl: crawlMeta.crawl,
      crawlKind,
      crawledAt: now,
      crawlSource: crawl.metadata?.crawlSource ?? "lightpanda-rsc",
    },
    updated_at: now,
  };
}

export async function markFailed(
  supabase: SupabaseClient,
  record: PropertyRecord,
  message: string,
): Promise<PropertyRecord> {
  const now = new Date().toISOString();
  const next: PropertyRecord = {
    ...record,
    metadata: mergeCrawlMeta(record, {
      status: "failed",
      failedAt: now,
      errorMessage: message,
    }),
    updated_at: now,
  };
  return saveProperty(supabase, next);
}

export type CrawlOneResult =
  | { ok: true; record: PropertyRecord; imageCount: number; elapsedMs: number }
  | { ok: false; id: string; message: string; elapsedMs: number };

export async function crawlOne(
  supabase: SupabaseClient,
  record: PropertyRecord,
  waitMs: number,
): Promise<CrawlOneResult> {
  const startedAt = Date.now();

  let processing: PropertyRecord;
  try {
    processing = await markProcessing(supabase, record);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, id: record.id, message, elapsedMs: Date.now() - startedAt };
  }

  try {
    const direct = await fetchAndExtract(processing.source_url, waitMs);
    const completed = applyCrawlToRecord(
      {
        ...processing,
        source_url: direct.finalUrl,
        source_domain: resolveSourceDomain(direct.finalUrl),
      },
      direct.payload,
    );
    completed.metadata = {
      ...(completed.metadata ?? {}),
      crawlLayer: describeNaverMapLayer(direct.layerAnalysis),
      crawlResolvedFromComplex: direct.resolvedFromComplex,
      crawlKind: getPropertyCrawlKind(direct.payload),
    };
    const saved = await saveProperty(supabase, completed);
    const imageCount = Array.isArray(saved.image_urls) ? saved.image_urls.length : 0;

    return {
      ok: true,
      record: saved,
      imageCount,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFailed(supabase, processing, message);
    return { ok: false, id: record.id, message, elapsedMs: Date.now() - startedAt };
  }
}

export function getItemLabel(record: PropertyRecord): string {
  return getPropertyDisplayTitle(record);
}
