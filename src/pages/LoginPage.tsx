/**
 * @file LoginPage.tsx
 * @description 아빠/엄마 프로필 선택 후 로그인하는 화면.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ActorAvatar } from "../components/actor/ActorAvatar";
import { getActorAvatarUrlByVariant } from "../features/actor/actor-avatars";
import { Button } from "../components/ui/Button";
import { authenticateByPhoneSuffix } from "../features/actor/actor.api";
import { useAuth } from "../lib/auth-context";
import { cn } from "../lib/cn";

/** 로그인 프로필 옵션 */
const LOGIN_PROFILES = [
  { phoneSuffix: "1111", label: "아빠", variant: "dad" as const, avatarUrl: getActorAvatarUrlByVariant("dad") },
  { phoneSuffix: "2222", label: "엄마", variant: "mom" as const, avatarUrl: getActorAvatarUrlByVariant("mom") },
];

/**
 * 로그인 실패 메시지를 사용자 친화 문구로 정리한다.
 * @param error catch된 오류
 */
function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }

  const message = error.message.trim();
  if (!message) {
    return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }

  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "네트워크 연결을 확인한 뒤 다시 시도해주세요.";
  }

  return message;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { actor, login } = useAuth();
  const [selectedPhoneSuffix, setSelectedPhoneSuffix] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (actor) {
      navigate("/", { replace: true });
    }
  }, [actor, navigate]);

  /**
   * 선택한 프로필로 로그인을 수행한다.
   */
  async function handleLogin() {
    if (!selectedPhoneSuffix || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const authenticatedActor = await authenticateByPhoneSuffix(selectedPhoneSuffix);
      login(authenticatedActor);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="grid w-full max-w-sm grid-cols-2 gap-5">
          {LOGIN_PROFILES.map((profile) => {
            const isSelected = selectedPhoneSuffix === profile.phoneSuffix;

            return (
              <button
                key={profile.phoneSuffix}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-3xl border bg-white p-5 transition",
                  isSelected
                    ? "border-emerald-400 bg-emerald-50/60 shadow-[0_8px_24px_rgb(16_185_129/0.18)]"
                    : "border-slate-200 hover:border-slate-300 active:scale-[0.98]",
                )}
                onClick={() => {
                  setSelectedPhoneSuffix(profile.phoneSuffix);
                  setErrorMessage(null);
                }}
              >
                <div
                  className={cn(
                    "h-24 w-24 overflow-hidden rounded-full ring-4 transition",
                    isSelected ? "ring-emerald-300" : "ring-transparent",
                  )}
                >
                  <ActorAvatar variant={profile.variant} size="lg" className="h-24 w-24" label={profile.label} />
                </div>
                <span className="text-[18px] font-bold text-slate-900">{profile.label}</span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/95 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-md">
        {errorMessage ? (
          <p className="mb-3 text-center text-[13px] font-semibold text-rose-500">{errorMessage}</p>
        ) : null}

        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={!selectedPhoneSuffix || isSubmitting}
          onClick={handleLogin}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </Button>
      </footer>
    </div>
  );
}
