import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listFavorites } from "../../features/property/property-favorites.api";
import { resolveLocalProperty } from "../../features/property/property.api";
import { listCompletedQueuePropertiesForHome } from "../../features/property/property-crawl.api";
import { getMockProperties } from "../../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function FavoritesPage() {
  const { actor } = useAuth();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", actor?.actorId],
    queryFn: () => listFavorites(actor!),
    enabled: Boolean(actor),
  });

  const rows = useMemo(() => {
    if (!favoritesQuery.data) {
      return [];
    }

    const propertyById = new Map<string, ReturnType<typeof resolveLocalProperty>>();
    for (const property of [
      ...listCompletedQueuePropertiesForHome(actor),
      ...getMockProperties(actor),
    ]) {
      propertyById.set(property.id, property);
    }

    return favoritesQuery.data
      .map((favorite) => {
        const property =
          propertyById.get(favorite.property_id) ?? resolveLocalProperty(favorite.property_id, actor);
        if (!property) {
          return null;
        }
        return {
          id: favorite.id,
          property,
          meta: buildMeta("즐겨찾기", favorite.created_at),
          badge: "관심 매물",
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [actor, favoritesQuery.data]);

  return (
    <ActivityPropertyListPage
      title="즐겨찾기"
      rows={rows}
      emptyTitle="즐겨찾기한 매물이 없어요."
      emptyDescription="매물 옆 하트 버튼으로 관심 매물을 저장할 수 있어요."
    />
  );
}
