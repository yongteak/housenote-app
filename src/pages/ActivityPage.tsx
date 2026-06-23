import { useMemo, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list";
import Heart from "lucide-react/dist/esm/icons/heart";
import Eye from "lucide-react/dist/esm/icons/eye";
import Star from "lucide-react/dist/esm/icons/star";

import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import {
  getMockFavorites,
  getMockProperties,
  getMockRatedItems,
  getMockRecentViews,
  getMockVisitHistory,
} from "../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../lib/auth-context";

type ActivityEntry = {
  to: string;
  title: string;
  count: number;
  icon: ComponentType<{ className?: string }>;
};

export function ActivityPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();

  const entries = useMemo<ActivityEntry[]>(() => {
    const properties = getMockProperties(actor);
    return [
      {
        to: "/activity/history",
        title: "과거 작성 히스토리",
        count: Math.max(getMockVisitHistory(actor).length, properties.filter((property) => property.visited).length),
        icon: ClipboardList,
      },
      {
        to: "/activity/favorites",
        title: "즐겨찾기",
        count: getMockFavorites(actor).length,
        icon: Heart,
      },
      {
        to: "/activity/recent",
        title: "최근 본 항목",
        count: getMockRecentViews(actor).length,
        icon: Eye,
      },
      {
        to: "/activity/ratings",
        title: "평가한 항목",
        count: getMockRatedItems(actor).length,
        icon: Star,
      },
    ];
  }, [actor]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
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
      <main className="flex-1 space-y-3 px-4 py-4 pb-6">
        {entries.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="toss-card flex items-center justify-between border-slate-200 px-3.5 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <entry.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-slate-900">{entry.title}</p>
                <p className="text-[12px] text-slate-500">{entry.count}건</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </main>
    </div>
  );
}
