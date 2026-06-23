/**
 * @file LoginPage.tsx
 * @description 1111/2222 ID로 저장자 로그인을 처리하는 화면. Apple HIG 레이아웃 적용.
 */
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { NavBar } from "../components/ui/NavBar";
import { authenticateByPhoneSuffix } from "../features/actor/actor.api";
import { useAuth } from "../lib/auth-context";

/** 허용되는 로그인 ID */
const ALLOWED_LOGIN_IDS = ["1111", "2222"] as const;

/**
 * 입력값이 허용 ID인지 검사한다.
 * @param value 사용자 입력
 */
function isAllowedLoginId(value: string): value is (typeof ALLOWED_LOGIN_IDS)[number] {
  return (ALLOWED_LOGIN_IDS as readonly string[]).includes(value);
}

export function LoginPage() {
  const navigate = useNavigate();
  const { actor, login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (actor) {
      navigate("/", { replace: true });
    }
  }, [actor, navigate]);

  /**
   * 로그인 폼 제출을 처리한다.
   * @param event 폼 submit 이벤트
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedId = loginId.trim();
    if (!isAllowedLoginId(trimmedId)) {
      setErrorMessage("1111 또는 2222만 입력할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const authenticatedActor = await authenticateByPhoneSuffix(trimmedId);
      login(authenticatedActor);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50/30">
      <NavBar title="저장자 로그인" />

      <main className="flex-1 px-4 py-6 space-y-4">
        <article className="toss-card border-slate-200">
          <p className="text-[16px] font-bold text-slate-900">전화번호 뒷자리 4자리를 입력하세요.</p>
          <p className="mt-1 text-[13px] text-slate-500">허용 ID: 1111, 2222</p>
        </article>

        <form className="toss-card space-y-4 border-slate-200" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <span className="text-[12px] font-semibold text-slate-500">로그인 ID</span>
            <input
              className="toss-input"
              inputMode="numeric"
              maxLength={4}
              placeholder="4자리 입력"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="off"
            />
          </div>

          {errorMessage ? <p className="text-[13px] text-rose-500 font-semibold">{errorMessage}</p> : null}

          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "인증 중..." : "인증 및 로그인"}
          </Button>
        </form>
      </main>
    </div>
  );
}
