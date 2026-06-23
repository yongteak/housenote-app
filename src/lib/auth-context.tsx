/**
 * @file auth-context.tsx
 * @description 저장자 로그인 상태를 React Context로 공유한다.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { clearSelectedActor, getSelectedActor, setSelectedActor } from "./actor-storage";
import type { SelectedActor } from "../types/property";

/**
 * localStorage에 저장된 actorId가 UUID 형식인지 확인한다.
 * @param actorId 저장자 PK
 */
function isValidActorId(actorId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId);
}

/**
 * localStorage에서 유효한 로그인 정보를 읽는다.
 */
function readStoredActor(): SelectedActor | null {
  const storedActor = getSelectedActor();
  if (!storedActor) {
    return null;
  }

  if (!isValidActorId(storedActor.actorId)) {
    clearSelectedActor();
    return null;
  }

  return storedActor;
}

type AuthContextValue = {
  /** 현재 로그인한 저장자 */
  actor: SelectedActor | null;
  /** 저장자 로그인 처리 */
  login: (actor: SelectedActor) => void;
  /** 저장자 로그아웃 처리 */
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 앱 전역 로그인 상태 Provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActorState] = useState<SelectedActor | null>(() => readStoredActor());

  const login = useCallback((nextActor: SelectedActor) => {
    setSelectedActor(nextActor);
    setActorState(nextActor);
  }, []);

  const logout = useCallback(() => {
    clearSelectedActor();
    setActorState(null);
  }, []);

  const value = useMemo(
    () => ({
      actor,
      login,
      logout,
    }),
    [actor, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 로그인 상태 훅.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }

  return context;
}
