/**
 * @file property-metadata.api.ts
 * @description 네이버 부동산 링크 메타정보를 Edge Function으로 가져오는 API.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PropertyPreview } from "../../types/property";

/**
 * 링크 입력값에서 도메인 기반 기본 제목을 만든다.
 * @param urlString 사용자가 입력한 URL
 */
function buildFallbackTitle(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    return `${parsed.hostname} 매물`;
  } catch {
    return "새 매물";
  }
}

/**
 * Supabase Edge Function으로 링크 메타정보를 조회한다.
 * 실패 시 최소한의 fallback 데이터로 폼 입력을 이어갈 수 있게 한다.
 * @param sourceUrl 사용자가 입력한 매물 URL
 */
export async function fetchPropertyPreview(sourceUrl: string): Promise<PropertyPreview> {
  if (!isSupabaseConfigured()) {
    return { title: buildFallbackTitle(sourceUrl) };
  }

  const { data, error } = await supabase.functions.invoke("extract-property-preview", {
    body: { url: sourceUrl },
  });

  if (error || !data || typeof data !== "object") {
    return { title: buildFallbackTitle(sourceUrl) };
  }

  return {
    title: (data as { title?: string }).title,
    address: (data as { address?: string }).address,
    priceText: (data as { priceText?: string }).priceText,
    dealType: (data as { dealType?: string }).dealType,
    thumbnailUrl: (data as { thumbnailUrl?: string }).thumbnailUrl,
  };
}
