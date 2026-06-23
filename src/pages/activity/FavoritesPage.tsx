import { useMemo } from "react";

import { getMockFavorites, getMockProperties } from "../../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function FavoritesPage() {
  const { actor } = useAuth();

  const rows = useMemo(() => {
    const properties = getMockProperties(actor);
    const byId = new Map(properties.map((property) => [property.id, property]));
    return getMockFavorites(actor)
      .map((favorite) => {
        const property = byId.get(favorite.property_id);
        if (!property) return null;
        return {
          id: favorite.id,
          property,
          meta: buildMeta("즐겨찾기", favorite.created_at),
          badge: "관심 매물",
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [actor]);

  return (
    <ActivityPropertyListPage
      title="즐겨찾기"
      rows={rows}
      emptyTitle="즐겨찾기한 매물이 없어요."
      emptyDescription="관심 매물을 저장하면 여기에서 빠르게 다시 볼 수 있어요."
    />
  );
}
