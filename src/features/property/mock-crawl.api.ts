/**
 * @file mock-crawl.api.ts
 * @description 크롤 실행 구현체 (현재: fixture 목업). PC Lightpanda 연동 시 이 파일을 교체·확장한다.
 *
 * ## 실제 PC 크롤러에서 할 일
 * 1. `listPropertiesPendingCrawl()` 로 pending 매물 URL 목록을 가져온다.
 * 2. 각 URL에 Lightpanda/Playwright 로 네이버 부동산 RSC HTML을 받는다.
 * 3. `scripts/extract-naver-rsc.mjs` 와 동일한 파서로 PropertyCrawlPayload JSON을 만든다.
 * 4. `completePropertyCrawl(propertyId, payload)` 로 DB에 반영한다.
 * 5. 오류 시 `failPropertyCrawl(propertyId, message)` — message는 사용자에게 보여준다.
 *
 * ## 이 목업의 역할
 * - 개발 중 Supabase/PC 없이 `property-crawl.api.ts` 의 mock worker 가 호출한다.
 * - `property-crawl-sample.json` 을 source_url만 바꿔 반환한다.
 * - URL에 `#fail` 을 넣으면 실패 UI 테스트용으로 throw 한다.
 */
import crawlSample from "../../fixtures/property-crawl-sample.json";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

const MOCK_DELAY_MS = 700;

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
 * 단일 URL 크롤 (PC worker 내부에서 1건당 호출).
 * @param sourceUrl properties.source_url
 */
export async function searchPropertyByUrl(sourceUrl: string): Promise<PropertyCrawlPayload> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("링크를 입력해주세요.");
  }

  assertNaverLandUrl(trimmed);

  if (trimmed.includes("#fail")) {
    throw new Error("페이지를 열 수 없어요. 링크가 만료됐을 수 있어요.");
  }

  await new Promise((resolve) => {
    setTimeout(resolve, MOCK_DELAY_MS);
  });

  return {
    ...(crawlSample as PropertyCrawlPayload),
    source_url: trimmed,
    metadata: {
      ...(crawlSample as PropertyCrawlPayload).metadata,
      crawledAt: new Date().toISOString(),
      crawlSource: "mock-fixture",
    },
  };
}
