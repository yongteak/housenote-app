/**
 * @file mock-crawl.api.ts
 * @description 목업: URL 입력 시 샘플 크롤 JSON을 반환한다. (추후 로컬 Lightpanda 연동 대체)
 */
import crawlSample from "../../fixtures/property-crawl-sample.json";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

const MOCK_DELAY_MS = 700;

/**
 * 네이버 부동산 URL 형식인지 간단히 검증한다.
 * @param url 사용자 입력 URL
 */
function assertNaverLandUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("올바른 URL을 입력해주세요.");
  }

  if (!parsed.hostname.includes("naver.com")) {
    throw new Error("네이버 부동산 링크만 검색할 수 있어요.");
  }
}

/**
 * URL로 매물 정보를 검색한다. (목업: fixture 데이터 반환)
 * @param sourceUrl 사용자가 입력한 매물/지도 URL
 */
export async function searchPropertyByUrl(sourceUrl: string): Promise<PropertyCrawlPayload> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("링크를 입력해주세요.");
  }

  assertNaverLandUrl(trimmed);

  await new Promise((resolve) => {
    setTimeout(resolve, MOCK_DELAY_MS);
  });

  return {
    ...(crawlSample as PropertyCrawlPayload),
    source_url: trimmed,
    metadata: {
      ...(crawlSample as PropertyCrawlPayload).metadata,
      crawledAt: new Date().toISOString(),
    },
  };
}
