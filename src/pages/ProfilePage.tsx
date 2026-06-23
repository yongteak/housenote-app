import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

import { ActorAvatar } from "../components/actor/ActorAvatar";
import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import { listFavorites } from "../features/property/property-favorites.api";
import { getMockProperties, getMockRecentViews, getMockVisitHistory } from "../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../lib/auth-context";

type StatItem = {
  label: string;
  value: number;
  to: string;
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { actor, logout } = useAuth();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", actor?.actorId],
    queryFn: () => listFavorites(actor!),
    enabled: Boolean(actor),
  });

  const summary = useMemo(() => {
    const properties = getMockProperties(actor);
    return {
      total: properties.length,
      visited: getMockVisitHistory(actor).length,
      favorites: favoritesQuery.data?.length ?? 0,
      recent: getMockRecentViews(actor).length,
    };
  }, [actor, favoritesQuery.data]);

  const stats = useMemo<StatItem[]>(
    () => [
      { label: "전체 매물", value: summary.total, to: "/" },
      { label: "방문 기록", value: summary.visited, to: "/activity/history" },
      { label: "즐겨찾기", value: summary.favorites, to: "/activity/favorites" },
      { label: "최근 본 항목", value: summary.recent, to: "/activity/recent" },
    ],
    [summary],
  );

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const avatarVariant = actor?.phoneSuffix === "2222" ? "mom" : "dad";

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <NavBar
        title="프로필"
        leftSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="목록으로"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate("/")}
          />
        }
        rightSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="로그아웃"
            leadingIcon={<LogOut className="h-4 w-4 text-slate-500" />}
            onClick={handleLogout}
          />
        }
      />
      <main className="flex flex-1 flex-col px-4 pb-6 pt-2">
        <div className="flex items-center gap-3.5 py-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-100">
            <ActorAvatar phoneSuffix={actor?.phoneSuffix} variant={avatarVariant} size="lg" className="h-14 w-14" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-slate-950">{actor?.actorName ?? "저장자"}</p>
            <p className="mt-0.5 text-[13px] text-slate-500">전화번호 뒷자리 {actor?.phoneSuffix ?? "0000"}</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {stats.map((stat) => (
            <Link
              key={stat.to}
              to={stat.to}
              className="flex items-center justify-between gap-3 py-4 transition active:bg-slate-50/50"
            >
              <p className="text-[14px] font-semibold text-slate-900">{stat.label}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[14px] font-bold tabular-nums text-slate-950">{stat.value}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          ))}
          <Link
            to="/activity"
            className="flex items-center justify-between gap-3 py-4 transition active:bg-slate-50/50"
          >
            <div>
              <p className="text-[14px] font-semibold text-slate-900">내 활동 보기</p>
              <p className="mt-0.5 text-[12px] text-slate-500">히스토리, 즐겨찾기, 최근 본 항목, 평가 목록</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        </div>
      </main>
    </div>
  );
}
