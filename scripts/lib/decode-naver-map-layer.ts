import LZString from "lz-string";

export type NaverMapLayerEntry = {
  id: string;
  params: Record<string, string>;
  searchParams?: Record<string, string>;
};

export type NaverMapLayerAnalysis = {
  entries: NaverMapLayerEntry[];
  articleId: string | null;
  complexId: string | null;
  searchParams: Record<string, string>;
  viewType: "article_detail" | "complex_detail" | "unknown";
};

export class NaverMapLayerError extends Error {
  readonly finalUrl: string;
  readonly analysis: NaverMapLayerAnalysis;

  constructor(message: string, finalUrl: string, analysis: NaverMapLayerAnalysis) {
    super(message);
    this.name = "NaverMapLayerError";
    this.finalUrl = finalUrl;
    this.analysis = analysis;
  }
}

function decompressLayer(layerEncoded: string): string {
  const value = layerEncoded.includes("%") ? decodeURIComponent(layerEncoded) : layerEncoded;
  const direct = LZString.decompressFromBase64(value);
  if (direct) {
    return direct;
  }
  // 일부 공유 URL에서 lz base64 '+' 가 '-' 로 치환된 경우
  return LZString.decompressFromBase64(value.replace(/-/g, "+")) ?? "";
}

function extractSearchParamsFromDecoded(decoded: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pyeong = decoded.match(/"transactionPyeongTypeNumber"\s*:\s*"(\d+)/)?.[1];
  const trade = decoded.match(/"transactionTradeType"\s*:\s*"([A-Z0-9]+)/)?.[1];
  const trades = decoded.match(/"articleTradeTypes"\s*:\s*"([^"]+)"/)?.[1];
  if (pyeong) {
    params.transactionPyeongTypeNumber = pyeong;
  }
  if (trade) {
    params.transactionTradeType = trade;
  }
  if (trades) {
    params.articleTradeTypes = trades;
  }
  return params;
}

function extractLayerFromDecoded(decoded: string): NaverMapLayerEntry[] {
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          id: typeof entry.id === "string" ? entry.id : "unknown",
          params: (entry.params ?? {}) as Record<string, string>,
          searchParams: entry.searchParams as Record<string, string> | undefined,
        }));
    }
  } catch {
    // lz 복원 JSON이 깨진 경우 regex fallback (naver layer 공유 URL에서 종종 발생)
  }

  const articleId = decoded.match(/"articleId"\s*:\s*"(\d+)"/)?.[1];
  const complexId = decoded.match(/"complexId"\s*:\s*"(\d+)"/)?.[1];
  const viewId = decoded.match(/"id"\s*:\s*"([^"]+)"/)?.[1];

  if (articleId) {
    return [{ id: "article_detail", params: { articleId } }];
  }
  if (complexId || viewId === "complex_detail") {
    return [
      {
        id: "complex_detail",
        params: { complexId: complexId ?? "?" },
        searchParams: extractSearchParamsFromDecoded(decoded),
      },
    ];
  }
  return [];
}

export function decodeNaverMapLayerParam(layerEncoded: string): NaverMapLayerEntry[] {
  const decoded = decompressLayer(layerEncoded);
  if (!decoded) {
    return [];
  }
  return extractLayerFromDecoded(decoded);
}

export function analyzeNaverMapUrl(finalUrl: string): NaverMapLayerAnalysis {
  let layerParam: string | null = null;
  try {
    layerParam = new URL(finalUrl).searchParams.get("layer");
  } catch {
    return { entries: [], articleId: null, complexId: null, searchParams: {}, viewType: "unknown" };
  }

  if (!layerParam) {
    return { entries: [], articleId: null, complexId: null, searchParams: {}, viewType: "unknown" };
  }

  const entries = decodeNaverMapLayerParam(layerParam);
  const articleEntry = entries.find((entry) => entry.id === "article_detail");
  const complexEntry = entries.find((entry) => entry.id === "complex_detail");

  const articleId = articleEntry?.params.articleId ?? null;
  const complexId = complexEntry?.params.complexId ?? null;
  const searchParams = complexEntry?.searchParams ?? articleEntry?.searchParams ?? {};
  const viewType = articleId ? "article_detail" : complexId ? "complex_detail" : "unknown";

  return { entries, articleId, complexId, searchParams, viewType };
}

export type ResolvedCrawlMapUrl = {
  crawlUrl: string;
  layerAnalysis: NaverMapLayerAnalysis;
  resolvedFromComplex: boolean;
  resolvedArticleId: string | null;
  candidateCount?: number;
};

export type ResolveCrawlOptions = {
  pickFirst?: boolean;
};

export async function resolveCrawlMapUrl(
  mapUrl: string,
  layerAnalysis: NaverMapLayerAnalysis,
  options: ResolveCrawlOptions = {},
): Promise<ResolvedCrawlMapUrl> {
  if (layerAnalysis.viewType === "article_detail" && layerAnalysis.articleId) {
    return {
      crawlUrl: mapUrl,
      layerAnalysis,
      resolvedFromComplex: false,
      resolvedArticleId: layerAnalysis.articleId,
    };
  }

  if (layerAnalysis.viewType !== "complex_detail" || !layerAnalysis.complexId) {
    return {
      crawlUrl: mapUrl,
      layerAnalysis,
      resolvedFromComplex: false,
      resolvedArticleId: null,
    };
  }

  const { fetchComplexArticleCandidates, pickSingleArticleCandidate } = await import("./fetch-complex-articles");
  const { buildArticleDetailMapUrl, readMapUrlCoords } = await import("./build-article-map-url");

  const candidates = await fetchComplexArticleCandidates(layerAnalysis.complexId, layerAnalysis.searchParams);
  const picked = pickSingleArticleCandidate(candidates, layerAnalysis.searchParams, {
    pickFirst: options.pickFirst ?? false,
  });
  const coords = readMapUrlCoords(mapUrl);
  const crawlUrl = buildArticleDetailMapUrl({
    articleId: picked.articleId,
    center: coords.center,
    zoom: coords.zoom,
  });

  return {
    crawlUrl,
    layerAnalysis: {
      ...layerAnalysis,
      articleId: picked.articleId,
      viewType: "article_detail",
    },
    resolvedFromComplex: true,
    resolvedArticleId: picked.articleId,
    candidateCount: candidates.length,
  };
}

export function describeNaverMapLayer(analysis: NaverMapLayerAnalysis): string {
  if (analysis.viewType === "article_detail" && analysis.articleId) {
    return `article_detail · articleId=${analysis.articleId}`;
  }
  if (analysis.viewType === "complex_detail" && analysis.complexId) {
    const filterParts = [
      analysis.searchParams.transactionPyeongTypeNumber
        ? `${analysis.searchParams.transactionPyeongTypeNumber}평`
        : null,
      analysis.searchParams.transactionTradeType ?? analysis.searchParams.articleTradeTypes ?? null,
    ].filter(Boolean);
    const filterText = filterParts.length > 0 ? ` · ${filterParts.join(" · ")}` : "";
    return `complex_detail · complexId=${analysis.complexId}${filterText}`;
  }
  return "layer 정보 없음";
}

/** Lightpanda finalUrl 이 짧을 때 og:url 에서 layer 전체를 복원 */
export function resolveCanonicalMapUrl(html: string, finalUrl: string): string {
  const ogMatch = html.match(/property="og:url" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
  if (!ogMatch) {
    return finalUrl;
  }

  try {
    const ogLayerLen = new URL(ogMatch).searchParams.get("layer")?.length ?? 0;
    const finalLayerLen = new URL(finalUrl).searchParams.get("layer")?.length ?? 0;
    return ogLayerLen >= finalLayerLen ? ogMatch : finalUrl;
  } catch {
    return finalUrl;
  }
}
