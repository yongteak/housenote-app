import { fetchHtmlWithLightpanda } from "./lib/fetch-html.mjs";
import { extractNaverCrawlPayloadFromHtml } from "./lib/extract-naver-crawl-payload.mjs";

const urls = [
  "https://fin.land.naver.com/map?zoom=15.535468389196721&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPpWxQQkzABowAHZBAWwGc5xk0tsBJGeAJgDYBmfgFYAjAHYBADjABfCvWzJ0ACwAKNBkzAAvAPa7acMCKEA6IcIAsvSf0kBOEfd5juI2TIC6QA&center=3zleGm-2APpG8",
  "https://fin.land.naver.com/map?zoom=15.690521680946892&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPpWxQQkzABowAHZBAWwGc5xk0tsBJGeAJgDYBmfgFYAHABYJYsAF8K9bMnQALAAo0GTMAC8A9jtpwwARiEA6XgE4ADEO5HeIqxbEOL3GdIC6QA&center=3zleGm-2APpG8",
];

for (const [index, sourceUrl] of urls.entries()) {
  try {
    const { html, httpStatus } = fetchHtmlWithLightpanda(sourceUrl, {
      waitMs: 40_000,
      waitUntil: "networkidle",
    });
    const payload = extractNaverCrawlPayloadFromHtml(html, sourceUrl);
    const imageUrls = payload.image_urls ?? [];

    const result = {
      index: index + 1,
      sourceUrl,
      httpStatus,
      hasCoreData: true,
      articleNumber: payload.source_listing_id ?? null,
      isArticleImageExist:
        payload.metadata && typeof payload.metadata === "object"
          ? ((payload.metadata.extras ?? {}).isArticleImageExist ?? null)
          : null,
      imageCount: imageUrls.length,
      firstImageUrl: imageUrls[0] ?? null,
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          index: index + 1,
          sourceUrl,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
  }
}
