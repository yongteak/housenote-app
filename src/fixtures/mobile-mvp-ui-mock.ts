import type {
  PropertyFavoriteRecord,
  PropertyRatedItemRecord,
  PropertyRecentViewRecord,
  PropertyRecord,
  PropertyVisitHistoryRecord,
  SelectedActor,
} from "../types/property";

const FALLBACK_ACTOR_ID = "00000000-0000-0000-0000-000000000111";

type BasePropertySeed = {
  id: string;
  title: string;
  address: string;
  currentPrice: number;
  desiredPrice: number;
  decisionStatus: PropertyRecord["decision_status"];
  visited: boolean;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  sourceUrl: string;
};

const propertySeeds: BasePropertySeed[] = [
  {
    id: "f97f0b8f-c7df-4fe3-b4c1-b67bd75f6f91",
    title: "잠실 리센츠 84A",
    address: "서울 송파구 잠실동 22",
    currentPrice: 2230000000,
    desiredPrice: 2150000000,
    decisionStatus: "review",
    visited: true,
    latitude: 37.513316,
    longitude: 127.10266,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/1234567890",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
    title: "잠실 리센츠 59B",
    address: "서울 송파구 잠실동 22",
    currentPrice: 1980000000,
    desiredPrice: 1900000000,
    decisionStatus: "review",
    visited: false,
    latitude: 37.51348,
    longitude: 127.10281,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/1234567891",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567892",
    title: "잠실 리센츠 74",
    address: "서울 송파구 잠실동 22",
    currentPrice: 2050000000,
    desiredPrice: 1980000000,
    decisionStatus: "hold",
    visited: true,
    latitude: 37.51322,
    longitude: 127.10252,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/1234567892",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567893",
    title: "잠실 리센츠 111",
    address: "서울 송파구 잠실동 22",
    currentPrice: 2890000000,
    desiredPrice: 2750000000,
    decisionStatus: "revisit",
    visited: false,
    latitude: 37.51339,
    longitude: 127.10274,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/1234567893",
  },
  {
    id: "d7729546-6f99-4c7d-9c6a-e72b7f970dc2",
    title: "마포 래미안푸르지오 59",
    address: "서울 마포구 아현동 729",
    currentPrice: 1490000000,
    desiredPrice: 1420000000,
    decisionStatus: "hold",
    visited: true,
    latitude: 37.55334,
    longitude: 126.95671,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/2234567890",
  },
  {
    id: "16da9f0b-0f34-4d33-8377-6ed934f0e9e0",
    title: "광장 힐스테이트 74",
    address: "서울 광진구 광장동 580",
    currentPrice: 1680000000,
    desiredPrice: 1600000000,
    decisionStatus: "revisit",
    visited: false,
    latitude: 37.545213,
    longitude: 127.10392,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/3234567890",
  },
  {
    id: "6ac69f12-a040-4f18-939b-1e595f468af9",
    title: "상도 더샵 84",
    address: "서울 동작구 상도동 899",
    currentPrice: 1340000000,
    desiredPrice: 1250000000,
    decisionStatus: "exclude",
    visited: false,
    latitude: 37.500745,
    longitude: 126.94174,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=640&q=80",
    sourceUrl: "https://fin.land.naver.com/articles/4234567890",
  },
];

function resolveActor(actor: SelectedActor | null) {
  return {
    actorId: actor?.actorId ?? FALLBACK_ACTOR_ID,
    actorName: actor?.actorName ?? "게스트",
    phoneSuffix: actor?.phoneSuffix ?? "0000",
  };
}

export function getMockProperties(actor: SelectedActor | null): PropertyRecord[] {
  const profile = resolveActor(actor);

  return propertySeeds.map((seed, index) => ({
    id: seed.id,
    actor_id: profile.actorId,
    phone_suffix: profile.phoneSuffix,
    actor_name: profile.actorName,
    source_url: seed.sourceUrl,
    source_domain: "fin.land.naver.com",
    source_listing_id: seed.sourceUrl.split("/").at(-1) ?? seed.id,
    title: seed.title,
    property_type: "아파트",
    deal_type: "매매",
    address: seed.address,
    road_address: seed.address,
    latitude: seed.latitude,
    longitude: seed.longitude,
    current_price_text: null,
    current_price_value: seed.currentPrice,
    desired_price_value: seed.desiredPrice,
    area_supply_m2: 112.4 - index * 6.7,
    area_private_m2: 84.9 - index * 4.2,
    floor_info: `${8 + index}/${24 + index}층`,
    direction: index % 2 === 0 ? "남동" : "남서",
    thumbnail_url: seed.thumbnailUrl,
    image_urls: [seed.thumbnailUrl],
    metadata: { source: "mobile-mvp-mock" },
    visited: seed.visited,
    visited_at: seed.visited ? new Date(Date.now() - index * 86400000 * 3).toISOString() : null,
    rating_location: 4,
    rating_price: 3,
    rating_condition: 4,
    rating_sunlight: 4,
    rating_environment: 3,
    pros: "동선이 좋아 실거주에 편함.",
    cons: "주차 대기 가능성 확인 필요.",
    memo: "주말 재방문 후보.",
    decision_status: seed.decisionStatus,
    created_at: new Date(Date.now() - index * 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - index * 86400000).toISOString(),
  }));
}

export function getMockFavorites(actor: SelectedActor | null): PropertyFavoriteRecord[] {
  const profile = resolveActor(actor);
  const properties = getMockProperties(actor);
  return properties.slice(0, 2).map((property, index) => ({
    id: `fav-${index + 1}`,
    actor_id: profile.actorId,
    property_id: property.id,
    created_at: new Date(Date.now() - index * 86400000 * 2).toISOString(),
  }));
}

export function getMockRecentViews(actor: SelectedActor | null): PropertyRecentViewRecord[] {
  const profile = resolveActor(actor);
  const properties = getMockProperties(actor);
  return properties.map((property, index) => ({
    id: `recent-${index + 1}`,
    actor_id: profile.actorId,
    property_id: property.id,
    viewed_at: new Date(Date.now() - index * 3600000 * 7).toISOString(),
  }));
}

export function getMockRatedItems(actor: SelectedActor | null): PropertyRatedItemRecord[] {
  const profile = resolveActor(actor);
  const properties = getMockProperties(actor);
  return properties.slice(0, 3).map((property, index) => ({
    id: `rated-${index + 1}`,
    actor_id: profile.actorId,
    property_id: property.id,
    rating_avg: 3.6 + index * 0.4,
    rated_at: new Date(Date.now() - index * 86400000).toISOString(),
  }));
}

export function getMockVisitHistory(actor: SelectedActor | null): PropertyVisitHistoryRecord[] {
  const profile = resolveActor(actor);
  const properties = getMockProperties(actor);
  return properties
    .filter((property) => property.visited)
    .map((property, index) => ({
      id: `visit-${index + 1}`,
      actor_id: profile.actorId,
      property_id: property.id,
      visited_at: new Date(Date.now() - index * 86400000 * 5).toISOString(),
      note: index === 0 ? "주차장/동선 체크 완료" : "오후 채광 확인",
    }));
}
