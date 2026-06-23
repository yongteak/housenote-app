import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import { getMockFavorites, getMockProperties, getMockRecentViews, getMockVisitHistory } from "../fixtures/mobile-mvp-ui-mock";
import { useAuth } from "../lib/auth-context";

export function ProfilePage() {
  const navigate = useNavigate();
  const { actor, logout } = useAuth();

  const summary = useMemo(() => {
    const properties = getMockProperties(actor);
    return {
      total: properties.length,
      visited: getMockVisitHistory(actor).length,
      favorites: getMockFavorites(actor).length,
      recent: getMockRecentViews(actor).length,
    };
  }, [actor]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
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
      />
      <main className="flex-1 space-y-3 px-4 py-4 pb-6">
        <article className="toss-card border-slate-200">
          <p className="text-[17px] font-bold text-slate-950">{actor?.actorName ?? "저장자"}</p>
          <p className="mt-1 text-[13px] text-slate-500">전화번호 뒷자리 {actor?.phoneSuffix ?? "0000"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">전체 매물</p>
              <p className="text-[16px] font-bold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">방문 기록</p>
              <p className="text-[16px] font-bold text-slate-900">{summary.visited}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">즐겨찾기</p>
              <p className="text-[16px] font-bold text-slate-900">{summary.favorites}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">최근 본 항목</p>
              <p className="text-[16px] font-bold text-slate-900">{summary.recent}</p>
            </div>
          </div>
        </article>

        <Link to="/activity" className="toss-card flex items-center justify-between border-slate-200 px-3.5 py-3">
          <div>
            <p className="text-[14px] font-semibold text-slate-900">내 활동 보기</p>
            <p className="text-[12px] text-slate-500">히스토리, 즐겨찾기, 최근 본 항목, 평가 목록</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Button
          variant="surface"
          className="w-full justify-center border-slate-200 text-slate-700"
          leadingIcon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </main>
    </div>
  );
}
