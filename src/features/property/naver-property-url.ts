/**
 * @file naver-property-url.ts
 * @description 네이버 부동산·단축 링크 URL 판별.
 */

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** 네이버 부동산 페이지 또는 naver.me 단축 링크인지 확인한다. */
export function isNaverPropertyUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  return host.includes("naver.com") || host === "naver.me" || host.endsWith(".naver.me");
}

export function assertNaverPropertyUrl(url: string, invalidMessage = "네이버 부동산 링크만 저장할 수 있어요."): void {
  if (!parseUrl(url)) {
    throw new Error("링크 형식이 올바르지 않아요.");
  }
  if (!isNaverPropertyUrl(url)) {
    throw new Error(invalidMessage);
  }
}
