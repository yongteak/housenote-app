import type {
  ComplexCrawlSnapshot,
  ComplexLayerFilter,
  ComplexRecentRealTrade,
  PropertyCrawlPayload,
} from "../../src/types/property-crawl";
import type { ComplexInjectedApiPayload } from "./lightpanda-inject-complex-api";
import { formatPrice } from "./naver-rsc";

export type ComplexListingCounts = {
  dealCount?: number | null;
  leaseDepositCount?: number | null;
  leaseMonthlyCount?: number | null;
  leaseShortTerm?: number | null;
};

function readDealPrice(article: Record<string, unknown>): number | null {
  const priceInfo = (article.priceInfo ?? {}) as Record<string, unknown>;
  const deal = priceInfo.dealPrice;
  if (typeof deal === "number" && deal > 0) {
    return deal;
  }
  return null;
}

function articleToListingPreview(article: Record<string, unknown>): ComplexRecentRealTrade {
  const space = (article.spaceInfo ?? {}) as Record<string, unknown>;
  const detail = (article.articleDetail ?? {}) as Record<string, unknown>;
  const priceValue = readDealPrice(article);
  const supply = typeof space.supplySpace === "number" ? space.supplySpace : null;

  return {
    tradeDate: null,
    priceValue,
    priceText: formatPrice(priceValue),
    areaSupplyM2: supply,
    areaPrivateM2: typeof space.exclusiveSpace === "number" ? space.exclusiveSpace : null,
    pyeongArea: supply != null ? Math.round(supply / 3.3058) : null,
    floor: typeof detail.floorInfo === "string" ? detail.floorInfo : null,
    dealType: "매매",
    raw: article,
  };
}

export function applyInjectedComplexApi(
  snapshot: ComplexCrawlSnapshot,
  injected: ComplexInjectedApiPayload | null,
  layerFilter: ComplexLayerFilter,
): {
  snapshot: ComplexCrawlSnapshot;
  currentPriceValue: number | null;
  currentPriceText: string | null;
  priceSource: "real_trade" | "listing_min" | null;
  areaSupplyM2: number | null;
  areaPrivateM2: number | null;
  pyeongArea: number | null;
} {
  if (!injected) {
    return {
      snapshot,
      currentPriceValue: null,
      currentPriceText: null,
      priceSource: null,
      areaSupplyM2: null,
      areaPrivateM2: null,
      pyeongArea: null,
    };
  }

  const listingCounts: ComplexListingCounts | null = injected.articleCounts ?? null;
  const filteredCounts: ComplexListingCounts | null = injected.articleCountsFiltered ?? null;
  const listings = injected.articles
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => articleToListingPreview(item));

  const pricedListings = listings.filter((item) => item.priceValue != null);
  pricedListings.sort((a, b) => (a.priceValue ?? 0) - (b.priceValue ?? 0));

  const cheapest = pricedListings[0] ?? null;
  const nextSnapshot: ComplexCrawlSnapshot = {
    ...snapshot,
    listingCounts,
    listingCountsFiltered: filteredCounts,
    listingPreviews: pricedListings.slice(0, 10),
    layerFilter,
    priceSource: null,
    realTradesFetchStatus:
      snapshot.recentRealTrades && snapshot.recentRealTrades.length > 0
        ? snapshot.realTradesFetchStatus
        : injected.errors.length > 0
          ? "failed"
          : pricedListings.length > 0
            ? "ok"
            : listingCounts
              ? "empty"
              : snapshot.realTradesFetchStatus,
    injectApiErrors: injected.errors.length > 0 ? injected.errors : null,
  };

  const hasRealTrades = (nextSnapshot.recentRealTrades?.length ?? 0) > 0;
  const priceSource: "real_trade" | "listing_min" | null = hasRealTrades
    ? "real_trade"
    : cheapest
      ? "listing_min"
      : null;
  nextSnapshot.priceSource = priceSource;

  const currentPriceValue = hasRealTrades
    ? (nextSnapshot.recentRealTrades?.[0]?.priceValue ?? null)
    : (cheapest?.priceValue ?? null);
  const currentPriceText = hasRealTrades
    ? (nextSnapshot.recentRealTrades?.[0]?.priceText ?? formatPrice(currentPriceValue))
    : (cheapest?.priceText ?? formatPrice(currentPriceValue));

  return {
    snapshot: nextSnapshot,
    currentPriceValue,
    currentPriceText,
    priceSource: hasRealTrades ? "real_trade" : cheapest ? "listing_min" : null,
    areaSupplyM2: cheapest?.areaSupplyM2 ?? null,
    areaPrivateM2: cheapest?.areaPrivateM2 ?? null,
    pyeongArea: cheapest?.pyeongArea ?? null,
  };
}

export function formatUseApprovalDate(value: string | null | undefined, elapsedYear?: number | null): string | null {
  if (!value) {
    return null;
  }
  const raw = value.replace(/\D/g, "");
  if (raw.length === 8) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const elapsed = elapsedYear != null ? ` (${elapsedYear}년차)` : "";
    return `${y}. ${m}.${elapsed}`;
  }
  return value;
}

export function formatBuildingRatio(info: Record<string, unknown> | null | undefined): string | null {
  if (!info || typeof info !== "object") {
    return null;
  }
  const far = info.floorAreaRatio;
  const bcr = info.buildingCoverageRatio;
  const parts: string[] = [];
  if (typeof far === "number") {
    parts.push(`용적률 ${far}%`);
  }
  if (typeof bcr === "number") {
    parts.push(`건폐율 ${bcr}%`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export type { ComplexInjectedApiPayload };
