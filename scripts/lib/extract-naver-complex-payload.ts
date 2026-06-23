import type { ComplexCrawlSnapshot, ComplexLayerFilter, PropertyCrawlPayload } from "../../src/types/property-crawl";
import type { NaverMapLayerAnalysis } from "./decode-naver-map-layer";
import { applyInjectedComplexApi } from "./apply-complex-injected-api";
import { enrichComplexRealTrades } from "./fetch-complex-real-trades";
import type { ComplexInjectedApiPayload } from "./lightpanda-inject-complex-api";
import {
  ESTATE,
  TRADE,
  extractByQueryKey,
  extractRscCombined,
  formatPrice,
  getPageTitle,
} from "./naver-rsc";

function buildLayerFilter(analysis: NaverMapLayerAnalysis): ComplexLayerFilter {
  const { searchParams } = analysis;
  const pyeongNum = searchParams.transactionPyeongTypeNumber ?? null;
  const tradeCode = searchParams.transactionTradeType ?? searchParams.articleTradeTypes?.split("-")[0] ?? null;

  return {
    transactionPyeongTypeNumber: pyeongNum,
    transactionTradeType: searchParams.transactionTradeType ?? null,
    articleTradeTypes: searchParams.articleTradeTypes ?? null,
    pyeongLabel: pyeongNum ? `${pyeongNum}평형` : null,
    dealTypeLabel: tradeCode ? (TRADE[tradeCode] ?? tradeCode) : null,
  };
}

function findPyeongTypeArea(
  complexResult: Record<string, unknown>,
  pyeongTypeNumber: string | null | undefined,
): { supplyM2: number | null; privateM2: number | null; pyeongArea: number | null } {
  if (!pyeongTypeNumber) {
    return { supplyM2: null, privateM2: null, pyeongArea: null };
  }

  const lists = [
    complexResult.pyeongTypeList,
    complexResult.pyeongTypes,
    complexResult.complexPyeongTypeList,
  ].filter(Array.isArray) as unknown[][];

  for (const list of lists) {
    for (const item of list) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as Record<string, unknown>;
      const num = String(row.pyeongTypeNumber ?? row.number ?? "");
      if (num !== pyeongTypeNumber) {
        continue;
      }
      return {
        supplyM2: typeof row.supplySpace === "number" ? row.supplySpace : null,
        privateM2: typeof row.exclusiveSpace === "number" ? row.exclusiveSpace : null,
        pyeongArea: typeof row.pyeongArea === "number" ? row.pyeongArea : Number(pyeongTypeNumber) || null,
      };
    }
  }

  const numeric = Number(pyeongTypeNumber);
  return {
    supplyM2: null,
    privateM2: null,
    pyeongArea: Number.isFinite(numeric) ? numeric : null,
  };
}

function buildComplexSnapshot(
  complexResult: Record<string, unknown>,
  complexId: string,
  layerFilter: ComplexLayerFilter,
): ComplexCrawlSnapshot {
  const complexAddr = (complexResult.address ?? {}) as Record<string, unknown>;
  const coordinates = (complexResult.coordinates ?? {}) as Record<string, number>;
  const typeInfo = (complexResult.type ?? complexResult.realEstateType ?? {}) as Record<string, string>;
  const typeCode = typeInfo.realEstateTypeCode ?? typeInfo.code ?? null;

  return {
    complexId,
    complexNumber:
      typeof complexResult.complexNumber === "number"
        ? complexResult.complexNumber
        : Number(complexId) || null,
    name: (complexResult.name as string | null | undefined) ?? null,
    typeName: ESTATE[typeCode ?? ""] ?? (complexResult.realEstateTypeName as string | undefined) ?? null,
    typeCode: typeCode ?? null,
    address: {
      city: (complexAddr.city as string | null | undefined) ?? null,
      division: (complexAddr.division as string | null | undefined) ?? null,
      sector: (complexAddr.sector as string | null | undefined) ?? null,
      jibun: (complexAddr.jibun as string | null | undefined) ?? null,
      roadName: (complexAddr.roadName as string | null | undefined) ?? null,
      zipCode: (complexAddr.zipCode as string | null | undefined) ?? null,
      legalDivisionNumber: (complexAddr.legalDivisionNumber as string | null | undefined) ?? null,
    },
    coordinates: {
      latitude: coordinates.yCoordinate ?? null,
      longitude: coordinates.xCoordinate ?? null,
    },
    totalHouseholdNumber: (complexResult.totalHouseholdNumber as number | null | undefined) ?? null,
    dongCount: (complexResult.dongCount as number | null | undefined) ?? null,
    constructionCompany: (complexResult.constructionCompany as string | null | undefined) ?? null,
    buildingUse: (complexResult.buildingUse as string | null | undefined) ?? null,
    useApprovalDate: (complexResult.useApprovalDate as string | null | undefined) ?? null,
    approvalElapsedYear: (complexResult.approvalElapsedYear as number | null | undefined) ?? null,
    parkingInfo: (complexResult.parkingInfo as Record<string, unknown> | null | undefined) ?? null,
    heatingAndCoolingInfo: (complexResult.heatingAndCoolingInfo as Record<string, unknown> | null | undefined) ?? null,
    managementOfficeContact: (complexResult.managementOfficeContact as string | null | undefined) ?? null,
    buildingRatioInfo: (complexResult.buildingRatioInfo as Record<string, unknown> | null | undefined) ?? null,
    layerFilter,
    recentRealTrades: [],
    raw: complexResult,
  };
}

function formatAddress(snapshot: ComplexCrawlSnapshot): string | null {
  const addr = snapshot.address;
  if (!addr) {
    return null;
  }
  const parts = [addr.city, addr.division, addr.sector, addr.jibun].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function buildTitle(snapshot: ComplexCrawlSnapshot): string {
  const parts = [snapshot.name, snapshot.layerFilter?.pyeongLabel, snapshot.layerFilter?.dealTypeLabel].filter(Boolean);
  return parts.join(" · ") || snapshot.name || "단지";
}

export async function extractNaverComplexPayloadFromHtml(
  html: string,
  sourceUrl: string,
  layerAnalysis: NaverMapLayerAnalysis,
  injected: ComplexInjectedApiPayload | null = null,
): Promise<PropertyCrawlPayload> {
  const complexId = layerAnalysis.complexId;
  if (!complexId) {
    throw new Error("크롤 실패: complexId를 찾지 못했습니다.");
  }

  const { combined } = extractRscCombined(html);
  const complexResult = extractByQueryKey(combined, "GET /complex");
  if (!complexResult) {
    const pageTitle = getPageTitle(html);
    throw new Error(`크롤 실패: 단지 정보(GET /complex)를 찾지 못했습니다.${pageTitle ? ` (${pageTitle})` : ""}`);
  }

  const layerFilter = buildLayerFilter(layerAnalysis);
  let snapshot = buildComplexSnapshot(complexResult, complexId, layerFilter);
  const pyeongArea = findPyeongTypeArea(complexResult, layerFilter.transactionPyeongTypeNumber);

  const tradeEnrichment = await enrichComplexRealTrades(combined, extractByQueryKey, complexId, layerAnalysis.searchParams);
  snapshot.recentRealTrades = tradeEnrichment.trades.slice(0, 20);
  snapshot.realTradesFetchStatus = tradeEnrichment.fetchStatus;

  const applied = applyInjectedComplexApi(snapshot, injected, layerFilter);
  snapshot = applied.snapshot;

  const latestTrade = snapshot.recentRealTrades?.[0];
  const url = new URL(sourceUrl);
  const now = new Date().toISOString();
  const dealType = layerFilter.dealTypeLabel ?? latestTrade?.dealType ?? null;

  const pyeongFromInject = applied.pyeongArea != null
    ? { supplyM2: applied.areaSupplyM2, privateM2: applied.areaPrivateM2, pyeongArea: applied.pyeongArea }
    : pyeongArea;

  return {
    source_url: sourceUrl,
    source_domain: url.hostname,
    source_listing_id: complexId,
    title: buildTitle(snapshot),
    property_type: snapshot.typeName ?? "아파트",
    deal_type: dealType,
    address: formatAddress(snapshot),
    road_address: snapshot.address?.roadName ?? null,
    latitude: snapshot.coordinates?.latitude ?? null,
    longitude: snapshot.coordinates?.longitude ?? null,
    current_price_text: applied.currentPriceText ?? latestTrade?.priceText ?? formatPrice(latestTrade?.priceValue),
    current_price_value: applied.currentPriceValue ?? latestTrade?.priceValue ?? null,
    area_supply_m2: pyeongFromInject.supplyM2,
    area_private_m2: pyeongFromInject.privateM2,
    floor_info: null,
    direction: null,
    thumbnail_url: null,
    image_urls: [],
    metadata: {
      crawlKind: "complex",
      crawledAt: now,
      crawlSource: injected ? "lightpanda-rsc-complex+inject" : "lightpanda-rsc-complex",
      complex: complexResult,
      complexSnapshot: snapshot,
      extras: {
        pyeongArea: pyeongFromInject.pyeongArea,
        totalHouseholdNumber: snapshot.totalHouseholdNumber,
        dongCount: snapshot.dongCount,
        constructionCompany: snapshot.constructionCompany,
        buildingUse: snapshot.buildingUse,
        useApprovalDate: snapshot.useApprovalDate,
        approvalElapsedYear: snapshot.approvalElapsedYear,
        parkingInfo: snapshot.parkingInfo,
        heatingAndCoolingInfo: snapshot.heatingAndCoolingInfo,
        managementOfficeContact: snapshot.managementOfficeContact,
        buildingRatioInfo: snapshot.buildingRatioInfo,
        zipCode: snapshot.address?.zipCode ?? null,
        legalDivisionNumber: snapshot.address?.legalDivisionNumber ?? null,
      },
    },
  };
}
