/**
 * @file index.ts
 * @description URL 메타 태그를 읽어 발품 앱 입력폼 프리뷰를 반환하는 Supabase Edge Function.
 */

/**
 * HTML 메타 태그(content) 추출.
 * @param html 원본 HTML
 * @param key meta key (property/name)
 */
function pickMetaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${key}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]*name=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * title 태그 텍스트를 추출한다.
 * @param html 원본 HTML
 */
function pickHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match?.[1]) {
    return null;
  }
  return match[1].trim();
}

/**
 * 설명 텍스트에서 주소/가격 후보를 단순 추출한다.
 * @param description meta description 텍스트
 */
function parseDescription(description: string): { address?: string; priceText?: string } {
  const segments = description
    .split(/[\|·,]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const address = segments.find((segment) => /(구|동|읍|면|리|로|길)/.test(segment));
  const priceText = segments.find((segment) => /(억|만원|원|매매|전세|월세)/.test(segment));

  return { address, priceText };
}

Deno.serve(async (request) => {
  try {
    const body = (await request.json()) as { url?: string };
    const sourceUrl = body.url?.trim();

    if (!sourceUrl) {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    const targetUrl = new URL(sourceUrl);

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; hnote-bot/1.0)",
      },
    });

    const html = await upstream.text();

    const ogTitle = pickMetaContent(html, "og:title");
    const ogImage = pickMetaContent(html, "og:image");
    const ogDescription = pickMetaContent(html, "og:description") ?? pickMetaContent(html, "description");

    const parsedDescription = ogDescription ? parseDescription(ogDescription) : {};

    return Response.json({
      title: ogTitle ?? pickHtmlTitle(html) ?? `${targetUrl.hostname} 매물`,
      address: parsedDescription.address,
      priceText: parsedDescription.priceText,
      dealType: /전세/.test(ogDescription ?? "")
        ? "전세"
        : /월세/.test(ogDescription ?? "")
          ? "월세"
          : "매매",
      thumbnailUrl: ogImage,
      metadata: {
        ogTitle,
        ogImage,
        ogDescription,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "metadata extraction failed",
      },
      { status: 500 },
    );
  }
});
