import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { createActivityPropertyLookup } from "../../features/activity/activity-property-lookup";
import { listRecentViews } from "../../features/activity/property-recent-views.api";
import { listProperties } from "../../features/property/property.api";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function RecentViewsPage() {
  const { actor } = useAuth();

  const propertiesQuery = useQuery({
    queryKey: ["properties", "activity-recent", actor?.actorId],
    queryFn: () =>
      listProperties({
        actorId: actor?.actorId,
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const recentViewsQuery = useQuery({
    queryKey: ["recent-views", actor?.actorId],
    queryFn: () => listRecentViews(actor!),
    enabled: Boolean(actor),
  });

  const rows = useMemo(() => {
    const lookup = createActivityPropertyLookup(propertiesQuery.data ?? []);
    return (recentViewsQuery.data ?? [])
      .map((recent) => {
        const property = lookup.resolve(recent.property_id);
        if (!property) return null;
        return {
          id: recent.id,
          property,
          meta: buildMeta("최근 본", recent.viewed_at),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }, [propertiesQuery.data, recentViewsQuery.data]);

  return (
    <ActivityPropertyListPage
      title="최근 본 항목"
      rows={rows}
      emptyTitle="최근 본 항목이 없어요."
      emptyDescription="목록에서 매물을 열면 최근 본 항목에 누적됩니다."
    />
  );
}
