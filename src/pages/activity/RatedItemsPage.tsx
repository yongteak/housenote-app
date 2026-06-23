import { useMemo } from "react";

import { getMockProperties, getMockRatedItems } from "../../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function RatedItemsPage() {
  const { actor } = useAuth();

  const rows = useMemo(() => {
    const properties = getMockProperties(actor);
    const byId = new Map(properties.map((property) => [property.id, property]));
    return getMockRatedItems(actor)
      .map((rated) => {
        const property = byId.get(rated.property_id);
        if (!property) return null;
        return {
          id: rated.id,
          property,
          meta: buildMeta("평가일", rated.rated_at),
          badge: `평균 ${rated.rating_avg.toFixed(1)}점`,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [actor]);

  return (
    <ActivityPropertyListPage
      title="평가한 항목"
      rows={rows}
      emptyTitle="아직 평가한 항목이 없어요."
      emptyDescription="평점 입력 후 저장하면 평가한 항목으로 분류됩니다."
    />
  );
}
