import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { createActivityPropertyLookup } from "../../features/activity/activity-property-lookup";
import { listFavorites } from "../../features/property/property-favorites.api";
import { listProperties } from "../../features/property/property.api";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function FavoritesPage() {
  const { actor } = useAuth();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", actor?.actorId],
    queryFn: () => listFavorites(actor!),
    enabled: Boolean(actor),
  });

  const propertiesQuery = useQuery({
    queryKey: ["properties", "activity-favorites", actor?.actorId],
    queryFn: () =>
      listProperties({
        actorId: actor?.actorId,
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const rows = useMemo(() => {
    if (!favoritesQuery.data) {
      return [];
    }

    const lookup = createActivityPropertyLookup(propertiesQuery.data ?? []);

    return favoritesQuery.data
      .map((favorite) => {
        const property = lookup.resolve(favorite.property_id);
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
  }, [favoritesQuery.data, propertiesQuery.data]);

  return (
    <ActivityPropertyListPage
      title="즐겨찾기"
      rows={rows}
      emptyTitle="즐겨찾기한 매물이 없어요."
      emptyDescription="매물 옆 하트 버튼으로 관심 매물을 저장할 수 있어요."
    />
  );
}
