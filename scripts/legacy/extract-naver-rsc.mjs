#!/usr/bin/env node
/**
 * Lightpanda HTML → property-crawl-sample.json 추출 스크립트.
 * 사용: node scripts/extract-naver-rsc.mjs [html-path] [source-url]
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { extractNaverCrawlPayloadFromHtml } from "./lib/extract-naver-crawl-payload.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const htmlPath = process.argv[2] ?? "/tmp/crawl-one/map.html";
const sourceUrl =
  process.argv[3] ??
  "https://fin.land.naver.com/map?zoom=15.535468389196721&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPpWxQQkzABowAHZBAWwGc5xk0tsBJGeAJgDYBmfgFYAjAHYBADjABfCvWzJ0ACwAKNBkzAAvAPa7acMCKEA6IcIAsvSf0kBOEfd5juI2TIC6QA&center=3zjowx-2AMlLx";

const html = readFileSync(htmlPath, "utf8");
const mapped = extractNaverCrawlPayloadFromHtml(html, sourceUrl);

const outPath = join(root, "src/fixtures/property-crawl-sample.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(mapped, null, 2));
console.log("written:", outPath);
console.log(mapped.title, mapped.current_price_text);
