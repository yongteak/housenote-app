import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NaverMapLayerAnalysis } from "./decode-naver-map-layer";
import { fetchHtmlWithLightpanda } from "./fetch-html";
import {
  buildComplexApiInjectScript,
  parseInjectedComplexApiPayload,
  type ComplexInjectedApiPayload,
} from "./lightpanda-inject-complex-api";

function parseTradeTypes(analysis: NaverMapLayerAnalysis): string[] {
  const primary = analysis.searchParams.transactionTradeType;
  if (primary) {
    return [primary];
  }
  const multi = analysis.searchParams.articleTradeTypes;
  if (multi) {
    return multi.split("-").filter(Boolean);
  }
  return ["A1"];
}

function writeTempInjectScript(content: string): string {
  const dir = join(tmpdir(), "hnote-crawl");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `complex-inject-${Date.now()}.js`);
  writeFileSync(path, content, "utf8");
  return path;
}

export type FetchComplexInjectedApiOptions = {
  sourceUrl: string;
  layerAnalysis: NaverMapLayerAnalysis;
  waitMs?: number;
};

export type FetchComplexInjectedApiResult = {
  html: string;
  finalUrl: string;
  httpStatus?: number;
  injected: ComplexInjectedApiPayload | null;
};

/** map URL을 Lightpanda로 연 뒤 inject API → HTML 마커 파싱 */
export function fetchComplexWithInjectedApi(
  options: FetchComplexInjectedApiOptions,
): FetchComplexInjectedApiResult {
  const complexId = options.layerAnalysis.complexId;
  if (!complexId) {
    throw new Error("complexId가 없어 inject API 크롤을 할 수 없습니다.");
  }

  const injectScript = buildComplexApiInjectScript({
    complexId,
    pyeongTypeNumber: options.layerAnalysis.searchParams.transactionPyeongTypeNumber ?? null,
    tradeType: options.layerAnalysis.searchParams.transactionTradeType ?? "A1",
    articleTradeTypes: parseTradeTypes(options.layerAnalysis),
  });

  const injectScriptFile = writeTempInjectScript(injectScript);
  const waitMs = options.waitMs ?? 20_000;

  const fetched = fetchHtmlWithLightpanda(options.sourceUrl, {
    waitMs,
    waitUntil: "networkidle",
    injectScriptFile,
    waitScript: "window.__HNOTE_COMPLEX_API_DONE__ === true",
    terminateMs: Math.max(waitMs + 25_000, 55_000),
  });

  return {
    html: fetched.html,
    finalUrl: fetched.finalUrl,
    httpStatus: fetched.httpStatus,
    injected: parseInjectedComplexApiPayload(fetched.html),
  };
}
