import { useMemo } from "react";

import { createActivityPropertyLookup } from "../../features/activity/activity-property-lookup";
import { getMockRecentViews } from "../../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../../lib/auth-context";
import { ActivityPropertyListPage, buildMeta } from "./ActivityPropertyListPage";

export function RecentViewsPage() {
  const { actor } = useAuth();

  const rows = useMemo(() => {
    const lookup = createActivityPropertyLookup(actor);
    return getMockRecentViews(actor)
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
  }, [actor]);

  return (
    <ActivityPropertyListPage
      title="최근 본 항목"
      rows={rows}
      emptyTitle="최근 본 항목이 없어요."
      emptyDescription="목록에서 매물을 열면 최근 본 항목에 누적됩니다."
    />
  );
}
