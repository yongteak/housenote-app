/**
 * HTML에서 OG/meta 태그를 추출해 PropertyPreview 형태로 반환한다.
 * Edge Function(extract-property-preview)과 동일한 파싱 규칙을 사용한다.
 */

/**
 * @param {string} html
 * @param {string} key
 * @returns {string | null}
 */
export function pickMetaContent(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${key}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]*name=["']${key}["'][^>]*content=["']([^"']+)["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }

  return null;
}

/**
 * @param {string} html
 * @returns {string | null}
 */
export function pickHtmlTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!match?.[1]) {
    return null;
  }
  return decodeHtmlEntities(match[1].trim());
}

/**
 * @param {string} text
 * @returns {string}
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * @param {string} description
 * @returns {{ address?: string; priceText?: string }}
 */
export function parseDescription(description) {
  const segments = description
    .split(/[\|·,]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const address = segments.find((segment) => /(구|동|읍|면|리|로|길)/.test(segment));
  const priceText = segments.find((segment) => /(억|만원|원|매매|전세|월세)/.test(segment));

  return { address, priceText };
}

/** 네이버 공통 OG 이미지인지 판별한다. */
export function isGenericNaverOgImage(imageUrl) {
  if (!imageUrl) {
    return true;
  }
  return /property\.pstatic\.net\/property-web\/og\//.test(imageUrl);
}

/** Edge Function fallback 제목인지 판별한다. */
export function isFallbackTitle(title, sourceUrl) {
  if (!title) {
    return true;
  }

  try {
    const hostname = new URL(sourceUrl).hostname;
    return title === `${hostname} 매물`;
  } catch {
    return title.endsWith(" 매물");
  }
}

/** 네이버 기본 OG 제목인지 판별한다. */
export function isGenericNaverOgTitle(title) {
  if (!title) {
    return true;
  }
  return title === "Npay 부동산";
}

/**
 * @param {string} html
 * @param {string} sourceUrl
 * @returns {{
 *   title?: string;
 *   address?: string;
 *   priceText?: string;
 *   dealType?: string;
 *   thumbnailUrl?: string;
 *   metadata: Record<string, string | null>;
 * }}
 */
export function extractPropertyPreview(html, sourceUrl) {
  const ogTitle = pickMetaContent(html, "og:title");
  const ogImage = pickMetaContent(html, "og:image");
  const ogDescription =
    pickMetaContent(html, "og:description") ?? pickMetaContent(html, "description");

  const parsedDescription = ogDescription ? parseDescription(ogDescription) : {};

  let hostname = "unknown";
  try {
    hostname = new URL(sourceUrl).hostname;
  } catch {
    // ignore invalid URL
  }

  const resolvedTitle = ogTitle ?? pickHtmlTitle(html) ?? `${hostname} 매물`;
  const resolvedThumbnail = isGenericNaverOgImage(ogImage) ? undefined : ogImage ?? undefined;

  return {
    title: isGenericNaverOgTitle(resolvedTitle) ? undefined : resolvedTitle,
    address: parsedDescription.address,
    priceText: parsedDescription.priceText,
    dealType: /전세/.test(ogDescription ?? "")
      ? "전세"
      : /월세/.test(ogDescription ?? "")
        ? "월세"
        : undefined,
    thumbnailUrl: resolvedThumbnail,
    metadata: {
      ogTitle,
      ogImage,
      ogDescription,
      ogUrl: pickMetaContent(html, "og:url"),
    },
  };
}
