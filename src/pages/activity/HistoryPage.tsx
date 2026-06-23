import { useMemo } from "react";

import { getMockProperties, getMockVisitHistory } from "../../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function HistoryPage() {
  const { actor } = useAuth();

  const rows = useMemo(() => {
    const properties = getMockProperties(actor);
    const byId = new Map(properties.map((property) => [property.id, property]));
    return getMockVisitHistory(actor)
      .map((history) => {
        const property = byId.get(history.property_id);
        if (!property) return null;
        return {
          id: history.id,
          property,
          meta: buildMeta("방문일", history.visited_at),
          badge: history.note ?? undefined,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [actor]);

  return (
    <ActivityPropertyListPage
      title="과거 작성 히스토리"
      rows={rows}
      emptyTitle="아직 기록된 방문 히스토리가 없어요."
      emptyDescription="첫 매물 작성 후 방문 기록이 자동으로 표시됩니다."
    />
  );
}
