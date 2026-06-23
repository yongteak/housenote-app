import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listProperties } from "../../features/property/property.api";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function HistoryPage() {
  const { actor } = useAuth();

  const propertiesQuery = useQuery({
    queryKey: ["properties", "activity-history", actor?.actorId],
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
      .filter((property) => property.visited && property.visited_at)
      .sort((a, b) => {
        const left = a.visited_at ? new Date(a.visited_at).getTime() : 0;
        const right = b.visited_at ? new Date(b.visited_at).getTime() : 0;
        return right - left;
      })
      .map((property) => ({
        id: property.id,
        property,
        meta: buildMeta("방문일", property.visited_at!),
      }));
  }, [propertiesQuery.data]);

  return (
    <ActivityPropertyListPage
      title="과거 작성 히스토리"
      rows={rows}
      emptyTitle="아직 기록된 방문 히스토리가 없어요."
      emptyDescription="첫 매물 작성 후 방문 기록이 자동으로 표시됩니다."
    />
  );
}
