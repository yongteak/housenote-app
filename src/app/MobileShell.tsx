/**
 * @file MobileShell.tsx
 * @description 모바일 우선 화면 폭을 제한하고 Outlet을 렌더링하는 컨테이너 셸.
 */
import { Outlet } from "react-router-dom";

export function MobileShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-slate-50/50">
      <main className="flex flex-1 flex-col bg-white">
        <Outlet />
      </main>
    </div>
  );
}
