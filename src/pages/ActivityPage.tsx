import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import { listRecentViews } from "../features/activity/property-recent-views.api";
import { listFavorites } from "../features/property/property-favorites.api";
import { listProperties } from "../features/property/property.api";
import { hasAnyPropertyRating } from "../features/property/property-ratings";
import { useAuth } from "../lib/auth-context";

type ActivityEntry = {
  to: string;
  title: string;
  description: string;
  count: number;
};

export function ActivityPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", actor?.actorId],
    queryFn: () => listFavorites(actor!),
    enabled: Boolean(actor),
  });

  const propertiesQuery = useQuery({
    queryKey: ["properties", "activity", actor?.actorId],
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

  const entries = useMemo<ActivityEntry[]>(() => {
    const properties = propertiesQuery.data ?? [];
    return [
      {
        to: "/activity/history",
        title: "과거 작성 히스토리",
        description: "방문일과 메모가 기록된 매물",
        count: properties.filter((property) => property.visited).length,
      },
      {
        to: "/activity/favorites",
        title: "즐겨찾기",
        description: "관심 매물을 모아둔 목록",
        count: favoritesQuery.data?.length ?? 0,
      },
      {
        to: "/activity/recent",
        title: "최근 본 항목",
        description: "최근에 열어본 매물",
        count: recentViewsQuery.data?.length ?? 0,
      },
      {
        to: "/activity/ratings",
        title: "평가한 항목",
        description: "별점을 남긴 매물",
        count: properties.filter((property) => hasAnyPropertyRating(property)).length,
      },
    ];
  }, [favoritesQuery.data, propertiesQuery.data, recentViewsQuery.data]);

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <NavBar
        title="활동"
        leftSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="목록으로"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate("/")}
          />
        }
      />
      <main className="flex flex-1 flex-col px-4 pb-6 pt-2">
        <div className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="flex items-center justify-between gap-3 py-4 transition active:bg-slate-50/50"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900">{entry.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">{entry.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[13px] font-semibold tabular-nums text-slate-500">{entry.count}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
