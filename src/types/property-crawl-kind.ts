/**
 * @file property-crawl-kind.ts
 * @description 크롤 대상 종류(매물 article / 단지 complex) 판별.
 */

import type { PropertyRecord } from "./property";
import type { ComplexCrawlSnapshot, PropertyCrawlKind, PropertyCrawlMetadata, PropertyCrawlPayload } from "./property-crawl";

export type { PropertyCrawlKind };

export function readCrawlMetadata(source: PropertyRecord | PropertyCrawlPayload): PropertyCrawlMetadata {
  if ("metadata" in source && source.metadata) {
    return source.metadata;
  }
  const recordMeta = (source as PropertyRecord).metadata;
  return (recordMeta ?? {}) as PropertyCrawlMetadata;
}

/** metadata·스냅샷으로 크롤 종류를 추론한다. */
export function getPropertyCrawlKind(source: PropertyRecord | PropertyCrawlPayload): PropertyCrawlKind {
  const metadata = readCrawlMetadata(source);
  if (metadata.crawlKind === "complex" || metadata.crawlKind === "article") {
    return metadata.crawlKind;
  }
  if (metadata.complexSnapshot?.complexId) {
    return "complex";
  }
  if (metadata.articleKey) {
    return "article";
  }
  return "article";
}

export function isComplexCrawl(source: PropertyRecord | PropertyCrawlPayload): boolean {
  return getPropertyCrawlKind(source) === "complex";
}

export function getComplexSnapshot(source: PropertyRecord | PropertyCrawlPayload): ComplexCrawlSnapshot | null {
  const metadata = readCrawlMetadata(source);
  return metadata.complexSnapshot ?? null;
}
