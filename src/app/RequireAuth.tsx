/**
 * @file RequireAuth.tsx
 * @description 로그인하지 않은 사용자를 로그인 화면으로 보낸다.
 */
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "../lib/auth-context";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { actor } = useAuth();
  const location = useLocation();

  if (!actor) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
