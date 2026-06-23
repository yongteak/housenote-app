/**
 * 네이버 부동산 map HTML(RSC)에서 PropertyCrawlPayload를 추출한다.
 */

const TRADE = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" };
const ESTATE = { A01: "아파트", A02: "오피스텔", A03: "빌라", A04: "아파트" };
const DIRECTION = { ES: "남동", WS: "남서", EN: "북동", WN: "북서", S: "남", N: "북", E: "동", W: "서" };

function extractRscCombined(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map((m) => m[1]);
  return {
    chunks,
    combined: chunks.join("").replace(/\\"/g, "\""),
  };
}

function extractByQueryKey(combined, queryKey) {
  const marker = `"queryKey":["${queryKey}"`;
  const idx = combined.indexOf(marker);
  if (idx < 0) {
    return null;
  }

  const blockStart = combined.lastIndexOf('{"dehydratedAt"', idx);
  const resultPos = combined.indexOf('"result":', blockStart);
  const start = combined.indexOf("{", resultPos);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < combined.length; i += 1) {
    const ch = combined[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(combined.slice(start, i + 1));
      }
    }
  }

  return null;
}

function formatPrice(value) {
  if (value == null) {
    return null;
  }
  const eok = Math.floor(value / 1e8);
  const man = Math.round((value % 1e8) / 1e4);
  if (eok && man) {
    return `${eok}억 ${man.toLocaleString()}`;
  }
  if (eok) {
    return `${eok}억`;
  }
  return `${man.toLocaleString()}만`;
}

function normalizeImageUrl(value) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) {
    return value;
  }
  return null;
}

function collectImageUrls(articleResult) {
  const detail = articleResult?.detailInfo ?? {};
  const articleDetail = detail.articleDetailInfo ?? {};
  const candidates = [
    articleDetail.articleImages,
    detail.articleImageList,
    detail.imageList,
    detail.images,
    articleResult?.articleImageList,
  ];

  const urls = [];
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
        const candidatesFromObject = [
          item.imageUrl,
          item.url,
          item.originImageUrl,
          item.thumbnail,
          item.thumbUrl,
          item.bigImageUrl,
        ];
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

export function extractNaverCrawlPayloadFromHtml(html, sourceUrl) {
  const { chunks, combined } = extractRscCombined(html);
  const articleKeyResult = extractByQueryKey(combined, "GET /article/key");
  const basicInfoResult = extractByQueryKey(combined, "GET /article/basicInfo");
  const complexResult = extractByQueryKey(combined, "GET /complex");

  if (!articleKeyResult) {
    throw new Error("크롤 실패: article key를 찾지 못했습니다.");
  }
  if (!basicInfoResult) {
    throw new Error("크롤 실패: article basicInfo를 찾지 못했습니다.");
  }
  if (!complexResult) {
    throw new Error("크롤 실패: complex 정보를 찾지 못했습니다.");
  }

  const detail = basicInfoResult?.detailInfo ?? {};
  const article = detail.articleDetailInfo ?? {};
  const space = detail.spaceInfo ?? {};
  const size = detail.sizeInfo ?? {};
  const floor = space.floorInfo ?? {};
  const priceInfo = basicInfoResult?.priceInfo ?? {};
  const communal = basicInfoResult?.communalComplexInfo ?? {};
  const complexAddr = complexResult?.address ?? {};
  const keyType = articleKeyResult?.type ?? {};
  const price = priceInfo.price ?? null;
  const imageUrls = collectImageUrls(basicInfoResult);

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

  return {
    source_url: sourceUrl,
    source_domain: url.hostname,
    source_listing_id: article.articleNumber ?? null,
    title:
      [
        ...titleParts,
        size.pyeongArea != null ? `${Math.round(size.pyeongArea)}평` : null,
      ]
        .filter(Boolean)
        .join(" · ") || article.articleName || complexResult?.name,
    property_type: ESTATE[keyType.realEstateType] ?? keyType.realEstateType ?? null,
    deal_type: TRADE[keyType.tradeType] ?? keyType.tradeType ?? null,
    address: address || null,
    road_address: complexAddr.roadName ?? null,
    latitude: article.coordinates?.yCoordinate ?? complexResult?.coordinates?.yCoordinate ?? null,
    longitude: article.coordinates?.xCoordinate ?? complexResult?.coordinates?.xCoordinate ?? null,
    current_price_text: formatPrice(price),
    current_price_value: price,
    area_supply_m2: size.supplySpace ?? null,
    area_private_m2: size.exclusiveSpace ?? null,
    floor_info: floor.targetFloor && floor.totalFloor ? `${floor.targetFloor}/${floor.totalFloor}층` : null,
    direction: DIRECTION[space.direction] ?? space.direction ?? null,
    thumbnail_url: imageUrls[0] ?? null,
    image_urls: imageUrls,
    metadata: {
      crawledAt: now,
      crawlSource: "lightpanda-rsc",
      rscChunksCount: chunks.length,
      articleKey: articleKeyResult,
      basicInfo: basicInfoResult,
      complex: complexResult,
      extras: {
        roomCount: space.roomCount ?? null,
        bathRoomCount: space.bathRoomCount ?? null,
        pyeongArea: size.pyeongArea ?? null,
        supplySpaceName: size.supplySpaceName ?? null,
        exclusiveSpaceName: size.exclusiveSpaceName ?? null,
        articleFeatureDescription: article.articleFeatureDescription ?? null,
        articleDescription: article.articleDescription ?? null,
        movingInInfo: detail.movingInInfo ?? null,
        verificationInfo: detail.verificationInfo ?? null,
        facilityInfo: detail.facilityInfo ?? null,
        zipCode: complexAddr.zipCode ?? null,
        legalDivisionNumber: complexAddr.legalDivisionNumber ?? null,
        totalHouseholdNumber: complexResult?.totalHouseholdNumber ?? null,
        dongCount: complexResult?.dongCount ?? null,
        constructionCompany: complexResult?.constructionCompany ?? null,
        buildingUse: complexResult?.buildingUse ?? null,
        useApprovalDate: complexResult?.useApprovalDate ?? null,
        approvalElapsedYear: complexResult?.approvalElapsedYear ?? null,
        parkingInfo: complexResult?.parkingInfo ?? null,
        heatingAndCoolingInfo: complexResult?.heatingAndCoolingInfo ?? null,
        managementOfficeContact: complexResult?.managementOfficeContact ?? null,
        buildingRatioInfo: complexResult?.buildingRatioInfo ?? null,
        isDirectTrade: article.isDirectTrade ?? null,
        isArticleImageExist: articleKeyResult?.isArticleImageExist ?? null,
        cpId: article.cpId ?? null,
        redevelopmentLabel: null,
        redevelopmentType: null,
        communalComplexInfo: communal,
      },
    },
  };
}
