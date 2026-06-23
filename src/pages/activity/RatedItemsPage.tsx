import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getPropertyAverageRating, hasAnyPropertyRating } from "../../features/property/property-ratings";
import { listProperties } from "../../features/property/property.api";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function RatedItemsPage() {
  const { actor } = useAuth();

  const propertiesQuery = useQuery({
    queryKey: ["properties", "activity-rated", actor?.actorId],
    queryFn: () =>
      listProperties({
        actorId: actor?.actorId,
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const rows = useMemo(() => {
    return (propertiesQuery.data ?? [])
      .filter((property) => hasAnyPropertyRating(property))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((property) => {
        const ratingAvg = getPropertyAverageRating(property);
        return {
          id: property.id,
          property,
          meta: buildMeta("평가일", property.updated_at),
          badge: ratingAvg != null ? `평균 ${ratingAvg.toFixed(1)}점` : undefined,
        };
      })
      .filter((row) => Boolean(row.badge));
  }, [propertiesQuery.data]);

  return (
    <ActivityPropertyListPage
      title="평가한 항목"
      rows={rows}
      emptyTitle="아직 평가한 항목이 없어요."
      emptyDescription="평점 입력 후 저장하면 평가한 항목으로 분류됩니다."
    />
  );
}
