import type { ComplexRecentRealTrade } from "../../src/types/property-crawl";
import { formatPrice } from "./naver-rsc";

const REAL_TRADE_RSC_KEYS = [
  "GET /complex/realTradePrice",
  "GET /complex/realTradePriceHistory",
  "GET /complex/marketPrice",
  "GET /complex/tradePrice",
] as const;

const REAL_TRADE_API =
  "https://fin.land.naver.com/front-api/v1/complex/realTradePrice";

function buildCookieHeader(): string {
  const ts = Date.now();
  return `PROP_TEST_KEY=${ts}.session; PROP_TEST_ID=land_session`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeTradeDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const raw = String(value).replace(/\D/g, "");
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (raw.length === 6) {
    return `20${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }
  return typeof value === "string" ? value : null;
}

function pickPriceValue(row: Record<string, unknown>): number | null {
  const candidates = [
    row.dealPrice,
    row.tradePrice,
    row.price,
    row.realTradePrice,
    row.depositPrice,
    row.rentPrice,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return null;
}

function normalizeTradeRow(row: Record<string, unknown>): ComplexRecentRealTrade {
  const priceValue = pickPriceValue(row);
  const tradeTypeCode = typeof row.tradeType === "string" ? row.tradeType : null;
  const dealType =
    typeof row.dealType === "string"
      ? row.dealType
      : tradeTypeCode === "A1"
        ? "매매"
        : tradeTypeCode === "B1"
          ? "전세"
          : tradeTypeCode;

  return {
    tradeDate: normalizeTradeDate(row.tradeDate ?? row.contractDate ?? row.dealDate ?? row.date),
    priceValue,
    priceText: formatPrice(priceValue),
    areaSupplyM2: typeof row.supplySpace === "number" ? row.supplySpace : null,
    areaPrivateM2: typeof row.exclusiveSpace === "number" ? row.exclusiveSpace : null,
    pyeongArea: typeof row.pyeongArea === "number" ? row.pyeongArea : null,
    floor: typeof row.floor === "string" ? row.floor : typeof row.floorInfo === "string" ? row.floorInfo : null,
    dealType,
    raw: row,
  };
}

function extractTradeListFromResult(result: Record<string, unknown>): ComplexRecentRealTrade[] {
  const listCandidates = [
    result.list,
    result.realTradePriceList,
    result.tradeList,
    result.items,
    result.realTradeList,
    (result.result as Record<string, unknown> | undefined)?.list,
  ];

  for (const candidate of listCandidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    return candidate
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => normalizeTradeRow(item));
  }

  return [];
}

export function extractRealTradesFromRsc(combined: string, extractByQueryKey: (combined: string, key: string) => Record<string, unknown> | null): ComplexRecentRealTrade[] {
  for (const key of REAL_TRADE_RSC_KEYS) {
    const result = extractByQueryKey(combined, key);
    if (!result) {
      continue;
    }
    const trades = extractTradeListFromResult(result);
    if (trades.length > 0) {
      return trades;
    }
  }
  return [];
}

export async function fetchComplexRealTrades(
  complexId: string,
  searchParams: Record<string, string>,
): Promise<{ trades: ComplexRecentRealTrade[]; fetchStatus: "ok" | "rate_limited" | "empty" | "failed" }> {
  const pyeong = searchParams.transactionPyeongTypeNumber;
  const trade = searchParams.transactionTradeType ?? searchParams.articleTradeTypes?.split("-")[0];
  const query = new URLSearchParams({ complexNumber: complexId });
  if (pyeong) {
    query.set("pyeongTypeNumber", pyeong);
  }
  if (trade) {
    query.set("tradeType", trade);
  }

  const url = `${REAL_TRADE_API}?${query.toString()}`;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Referer: "https://fin.land.naver.com/",
        Origin: "https://fin.land.naver.com",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Cookie: buildCookieHeader(),
      },
    });

    if (response.status === 429) {
      if (attempt >= 3) {
        return { trades: [], fetchStatus: "rate_limited" };
      }
      await sleep(6000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      return { trades: [], fetchStatus: "failed" };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const trades = extractTradeListFromResult(data.result && typeof data.result === "object" ? (data.result as Record<string, unknown>) : data);
    return { trades, fetchStatus: trades.length > 0 ? "ok" : "empty" };
  }

  return { trades: [], fetchStatus: "rate_limited" };
}

export type RealTradesFetchStatus = "ok" | "rate_limited" | "empty" | "skipped" | "failed";

export async function enrichComplexRealTrades(
  combined: string,
  extractByQueryKey: (combined: string, key: string) => Record<string, unknown> | null,
  complexId: string,
  searchParams: Record<string, string>,
): Promise<{ trades: ComplexRecentRealTrade[]; fetchStatus: RealTradesFetchStatus }> {
  const fromRsc = extractRealTradesFromRsc(combined, extractByQueryKey);
  if (fromRsc.length > 0) {
    return { trades: fromRsc, fetchStatus: "ok" };
  }

  const api = await fetchComplexRealTrades(complexId, searchParams);
  if (api.trades.length > 0) {
    return { trades: api.trades, fetchStatus: "ok" };
  }

  return { trades: [], fetchStatus: api.fetchStatus === "rate_limited" ? "rate_limited" : api.fetchStatus === "failed" ? "failed" : "empty" };
}
