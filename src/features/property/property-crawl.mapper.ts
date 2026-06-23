/**
 * @file property-crawl.mapper.ts
 * @description 크롤 페이로드를 폼 값·DB 저장 payload로 변환한다.
 */
import type { PropertyFormValues } from "../../types/property";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

/**
 * 크롤 결과를 폼 기본 필드에 반영한다.
 * @param crawl Lightpanda 크롤 결과
 * @param sourceUrl 사용자가 입력한 URL
 */
export function applyCrawlToForm(crawl: PropertyCrawlPayload, sourceUrl: string): Partial<PropertyFormValues> {
  return {
    source_url: sourceUrl,
    title: crawl.title ?? "",
    deal_type: crawl.deal_type ?? "",
    address: crawl.address ?? "",
    current_price_value: crawl.current_price_value ?? null,
    thumbnail_url: crawl.thumbnail_url ?? "",
  };
}

/**
 * 폼 + 크롤 데이터를 Supabase insert/update payload로 합친다.
 * @param values 사용자 입력 폼
 * @param crawl 크롤 결과 (없으면 metadata 제외)
 */
export function buildPropertySavePayload(values: PropertyFormValues, crawl: PropertyCrawlPayload | null) {
  return {
    source_url: values.source_url,
    source_domain: crawl?.source_domain ?? null,
    source_listing_id: crawl?.source_listing_id ?? null,
    title: values.title,
    property_type: crawl?.property_type ?? null,
    deal_type: values.deal_type,
    address: values.address,
    road_address: crawl?.road_address ?? null,
    latitude: crawl?.latitude ?? null,
    longitude: crawl?.longitude ?? null,
    current_price_text: crawl?.current_price_text ?? null,
    current_price_value: values.current_price_value,
    desired_price_value: values.desired_price_value,
    area_supply_m2: crawl?.area_supply_m2 ?? null,
    area_private_m2: crawl?.area_private_m2 ?? null,
    floor_info: crawl?.floor_info ?? null,
    direction: crawl?.direction ?? null,
    thumbnail_url: values.thumbnail_url || crawl?.thumbnail_url || null,
    image_urls: crawl?.image_urls ?? [],
    visited: values.visited,
    visited_at: values.visited_at ? new Date(values.visited_at).toISOString() : null,
    rating_location: values.rating_location,
    rating_price: values.rating_price,
    rating_condition: values.rating_condition,
    rating_sunlight: null,
    rating_environment: null,
    pros: null,
    cons: null,
    memo: values.memo,
    decision_status: values.decision_status,
    metadata: crawl?.metadata ?? {},
  };
}
