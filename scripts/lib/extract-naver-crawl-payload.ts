import type { PropertyCrawlPayload } from "../../src/types/property-crawl";
import {
  DIRECTION,
  ESTATE,
  TRADE,
  extractByQueryKey,
  extractRscCombined,
  formatPrice,
  getPageTitle,
  listRscQueryKeys,
} from "./naver-rsc";

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return value;
  }
  return null;
}

function collectImageUrls(articleResult: Record<string, unknown> | null): string[] {
  const detail = (articleResult?.detailInfo ?? {}) as Record<string, unknown>;
  const articleDetail = (detail.articleDetailInfo ?? {}) as Record<string, unknown>;
  const candidates = [
    articleDetail.articleImages,
    detail.articleImageList,
    detail.imageList,
    detail.images,
    articleResult?.articleImageList,
  ];

  const urls: string[] = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    for (const item of candidate) {
      if (typeof item === "string") {
        const url = normalizeImageUrl(item);
        if (url) {
          urls.push(url);
        }
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const candidatesFromObject = [obj.imageUrl, obj.url, obj.originImageUrl, obj.thumbnail, obj.thumbUrl, obj.bigImageUrl];
        for (const maybeUrl of candidatesFromObject) {
          const url = normalizeImageUrl(maybeUrl);
          if (url) {
            urls.push(url);
            break;
          }
        }
      }
    }
  }

  return [...new Set(urls)];
}

function buildMissingArticleError(html: string, combined: string): string {
  const keys = listRscQueryKeys(combined);
  const complexResult = extractByQueryKey(combined, "GET /complex");
  const complexName = (complexResult?.name as string | undefined) ?? getPageTitle(html);

  if (keys.length === 1 && keys[0] === "GET /complex") {
    return (
      `단지 지도 링크입니다 (${complexName ?? "단지"}). ` +
      "단지 공유 URL은 complex 크롤 경로로 처리해야 합니다."
    );
  }

  return `크롤 실패: article key를 찾지 못했습니다. (RSC: ${keys.join(", ") || "없음"})`;
}

export function extractNaverCrawlPayloadFromHtml(html: string, sourceUrl: string): PropertyCrawlPayload {
  const { combined } = extractRscCombined(html);
  const articleKeyResult = extractByQueryKey(combined, "GET /article/key");
  const basicInfoResult = extractByQueryKey(combined, "GET /article/basicInfo");
  const complexResult = extractByQueryKey(combined, "GET /complex");

  if (!articleKeyResult) {
    throw new Error(buildMissingArticleError(html, combined));
  }
  if (!basicInfoResult) {
    throw new Error("크롤 실패: article basicInfo를 찾지 못했습니다.");
  }
  if (!complexResult) {
    throw new Error("크롤 실패: complex 정보를 찾지 못했습니다.");
  }

  const detail = (basicInfoResult.detailInfo ?? {}) as Record<string, unknown>;
  const article = (detail.articleDetailInfo ?? {}) as Record<string, unknown>;
  const space = (detail.spaceInfo ?? {}) as Record<string, unknown>;
  const size = (detail.sizeInfo ?? {}) as Record<string, unknown>;
  const floor = (space.floorInfo ?? {}) as Record<string, unknown>;
  const priceInfo = (basicInfoResult.priceInfo ?? {}) as Record<string, unknown>;
  const communal = (basicInfoResult.communalComplexInfo ?? {}) as Record<string, unknown>;
  const complexAddr = (complexResult.address ?? {}) as Record<string, unknown>;
  const keyType = (articleKeyResult.type ?? {}) as Record<string, string>;
  const price = (priceInfo.price as number | null | undefined) ?? null;
  const imageUrls = collectImageUrls(basicInfoResult);
  const coordinates = (article.coordinates ?? {}) as Record<string, number>;
  const complexCoordinates = (complexResult.coordinates ?? {}) as Record<string, number>;

  const address = [complexAddr.city, complexAddr.division, complexAddr.sector, complexAddr.jibun]
    .filter(Boolean)
    .join(" ");
  const titleParts = [
    communal.complexName ?? article.articleName,
    communal.dongName ? `${communal.dongName}동` : null,
    floor.targetFloor ? `${floor.targetFloor}층` : null,
  ].filter(Boolean);

  const url = new URL(sourceUrl);
  const now = new Date().toISOString();
  const pyeongArea = size.pyeongArea as number | null | undefined;

  return {
    source_url: sourceUrl,
    source_domain: url.hostname,
    source_listing_id: (article.articleNumber as string | null | undefined) ?? null,
    title:
      [...titleParts, pyeongArea != null ? `${Math.round(pyeongArea)}평` : null]
        .filter(Boolean)
        .join(" · ") ||
      (article.articleName as string | undefined) ||
      (complexResult.name as string | undefined) ||
      null,
    property_type: ESTATE[keyType.realEstateType ?? ""] ?? keyType.realEstateType ?? null,
    deal_type: TRADE[keyType.tradeType ?? ""] ?? keyType.tradeType ?? null,
    address: address || null,
    road_address: (complexAddr.roadName as string | null | undefined) ?? null,
    latitude: coordinates.yCoordinate ?? complexCoordinates.yCoordinate ?? null,
    longitude: coordinates.xCoordinate ?? complexCoordinates.xCoordinate ?? null,
    current_price_text: formatPrice(price),
    current_price_value: price,
    area_supply_m2: (size.supplySpace as number | null | undefined) ?? null,
    area_private_m2: (size.exclusiveSpace as number | null | undefined) ?? null,
    floor_info:
      floor.targetFloor && floor.totalFloor ? `${floor.targetFloor}/${floor.totalFloor}층` : null,
    direction: DIRECTION[(space.direction as string | undefined) ?? ""] ?? (space.direction as string | null) ?? null,
    thumbnail_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    metadata: {
      crawlKind: "article",
      crawledAt: now,
      crawlSource: "lightpanda-rsc",
      articleKey: articleKeyResult,
      basicInfo: basicInfoResult,
      complex: complexResult,
      extras: {
        roomCount: (space.roomCount as number | null | undefined) ?? null,
        bathRoomCount: (space.bathRoomCount as number | null | undefined) ?? null,
        pyeongArea: pyeongArea ?? null,
        supplySpaceName: (size.supplySpaceName as string | null | undefined) ?? null,
        exclusiveSpaceName: (size.exclusiveSpaceName as string | null | undefined) ?? null,
        articleFeatureDescription: (article.articleFeatureDescription as string | null | undefined) ?? null,
        articleDescription: (article.articleDescription as string | null | undefined) ?? null,
        movingInInfo: (detail.movingInInfo as Record<string, unknown> | null | undefined) ?? null,
        verificationInfo: (detail.verificationInfo as Record<string, unknown> | null | undefined) ?? null,
        facilityInfo: (detail.facilityInfo as Record<string, unknown> | null | undefined) ?? null,
        zipCode: (complexAddr.zipCode as string | null | undefined) ?? null,
        legalDivisionNumber: (complexAddr.legalDivisionNumber as string | null | undefined) ?? null,
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
        isDirectTrade: (article.isDirectTrade as boolean | null | undefined) ?? null,
        isArticleImageExist: (articleKeyResult.isArticleImageExist as boolean | null | undefined) ?? null,
        cpId: (article.cpId as string | null | undefined) ?? null,
        redevelopmentLabel: null,
        redevelopmentType: null,
        communalComplexInfo: communal,
      },
    },
  };
}
