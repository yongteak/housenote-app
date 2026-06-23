/**
 * @file property-crawl.mapper.ts
 * @description 크롤 페이로드를 폼 값·DB 저장 payload로 변환한다.
 */
import type { PropertyFormValues, PropertyRecord } from "../../types/property";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

/**
 * DB 레코드에서 크롤 미리보기·지도용 페이로드를 복원한다.
 * @param record 저장된 매물
 */
export function recordToCrawlPayload(record: PropertyRecord): PropertyCrawlPayload {
  const metadata = (record.metadata ?? {}) as PropertyCrawlPayload["metadata"];

  return {
    source_url: record.source_url,
    source_domain: record.source_domain ?? undefined,
    source_listing_id: record.source_listing_id ?? undefined,
    title: record.title,
    property_type: record.property_type ?? undefined,
    deal_type: record.deal_type,
    address: record.address,
    road_address: record.road_address ?? undefined,
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
    current_price_text: record.current_price_text ?? undefined,
    current_price_value: record.current_price_value,
    area_supply_m2: record.area_supply_m2 ?? undefined,
    area_private_m2: record.area_private_m2 ?? undefined,
    floor_info: record.floor_info ?? undefined,
    direction: record.direction ?? undefined,
    thumbnail_url: record.thumbnail_url,
    image_urls: record.image_urls ?? [],
    metadata,
  };
}

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
