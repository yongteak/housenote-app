#!/usr/bin/env node
/**
 * Lightpanda HTML → property-crawl-sample.json 추출 스크립트.
 * 사용: node scripts/extract-naver-rsc.mjs [html-path] [source-url]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const htmlPath = process.argv[2] ?? "/tmp/crawl-one/map.html";
const sourceUrl =
  process.argv[3] ??
  "https://fin.land.naver.com/map?zoom=15.535468389196721&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPpWxQQkzABowAHZBAWwGc5xk0tsBJGeAJgDYBmfgFYAjAHYBADjABfCvWzJ0ACwAKNBkzAAvAPa7acMCKEA6IcIAsvSf0kBOEfd5juI2TIC6QA&center=3zjowx-2AMlLx";

const html = readFileSync(htmlPath, "utf8");
const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map((m) => m[1]);
const combined = chunks.join("").replace(/\\"/g, '"');

function extractByQueryKey(queryKey) {
  const marker = `"queryKey":["${queryKey}"`;
  const idx = combined.indexOf(marker);
  if (idx < 0) return null;
  const blockStart = combined.lastIndexOf('{"dehydratedAt"', idx);
  const resultPos = combined.indexOf('"result":', blockStart);
  const start = combined.indexOf("{", resultPos);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < combined.length; i++) {
    const ch = combined[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return JSON.parse(combined.slice(start, i + 1));
    }
  }
  return null;
}

const TRADE = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" };
const ESTATE = { A01: "아파트", A02: "오피스텔", A03: "빌라", A04: "아파트" };
const DIRECTION = { ES: "남동", WS: "남서", EN: "북동", WN: "북서", S: "남", N: "북", E: "동", W: "서" };

const articleKeyResult = extractByQueryKey("GET /article/key");
const basicInfoResult = extractByQueryKey("GET /article/basicInfo");
const complexResult = extractByQueryKey("GET /complex");

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

function formatPrice(v) {
  if (v == null) return null;
  const eok = Math.floor(v / 1e8);
  const man = Math.round((v % 1e8) / 1e4);
  if (eok && man) return `${eok}억 ${man.toLocaleString()}`;
  if (eok) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}

const jibunAddr = [complexAddr.city, complexAddr.division, complexAddr.sector, complexAddr.jibun].filter(Boolean).join(" ");
const titleParts = [
  communal.complexName ?? article.articleName,
  communal.dongName ? `${communal.dongName}동` : null,
  floor.targetFloor ? `${floor.targetFloor}층` : null,
].filter(Boolean);

const mapped = {
  source_url: sourceUrl,
  source_domain: "fin.land.naver.com",
  source_listing_id: article.articleNumber ?? null,
  title: [
    ...titleParts,
    size.pyeongArea != null ? `${Math.round(size.pyeongArea)}평` : null,
  ]
    .filter(Boolean)
    .join(" · ") || article.articleName || complexResult?.name,
  property_type: ESTATE[keyType.realEstateType] ?? keyType.realEstateType ?? null,
  deal_type: TRADE[keyType.tradeType] ?? keyType.tradeType ?? null,
  address: jibunAddr || null,
  road_address: complexAddr.roadName ?? null,
  latitude: article.coordinates?.yCoordinate ?? complexResult?.coordinates?.yCoordinate ?? null,
  longitude: article.coordinates?.xCoordinate ?? complexResult?.coordinates?.xCoordinate ?? null,
  current_price_text: formatPrice(price),
  current_price_value: price,
  area_supply_m2: size.supplySpace ?? null,
  area_private_m2: size.exclusiveSpace ?? null,
  floor_info: floor.targetFloor && floor.totalFloor ? `${floor.targetFloor}/${floor.totalFloor}층` : null,
  direction: DIRECTION[space.direction] ?? space.direction ?? null,
  thumbnail_url: null,
  image_urls: [],
  metadata: {
    crawledAt: new Date().toISOString(),
    crawlSource: "lightpanda-rsc",
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

const outPath = join(root, "src/fixtures/property-crawl-sample.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(mapped, null, 2));
console.log("written:", outPath);
console.log(mapped.title, mapped.current_price_text);
