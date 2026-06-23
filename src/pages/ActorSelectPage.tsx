/**
 * @file ActorSelectPage.tsx
 * @description 1111/2222 고정 저장자를 선택하는 최초 진입 화면.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { fetchFixedActors } from "../features/actor/actor.api";
import { setSelectedActor } from "../lib/actor-storage";
import type { FixedActor } from "../types/property";

/**
 * 저장자 버튼을 눌렀을 때 localStorage와 목록 화면 이동을 처리한다.
 * @param actor 선택한 저장자
 * @param navigate 라우터 네비게이터
 */
function handleSelectActor(actor: FixedActor, navigate: ReturnType<typeof useNavigate>) {
  setSelectedActor({
    actorId: actor.id,
    phoneSuffix: actor.phone_suffix,
    actorName: actor.display_name,
  });
  navigate("/");
}

export function ActorSelectPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["fixed-actors"],
    queryFn: fetchFixedActors,
  });

  return (
    <section className="space-y-4 pt-2">
      <article className="toss-card">
        <p className="text-ui-caption text-slate-500">전화번호 뒷자리로 저장 주체를 고르세요.</p>
        <p className="mt-1 text-ui-title text-slate-900">현재 기록자 선택</p>
      </article>

      <div className="grid grid-cols-1 gap-3">
        {isLoading ? (
          <p className="text-ui-body text-slate-500">저장자 목록을 불러오는 중...</p>
        ) : (
          data?.map((actor) => (
            <button
              key={actor.id}
              type="button"
              className="toss-card min-h-11 text-left transition active:scale-[0.98] active:bg-slate-50"
              onClick={() => handleSelectActor(actor, navigate)}
            >
              <p className="text-ui-body text-slate-500">{actor.phone_suffix}</p>
              <p className="text-ui-title-lg text-slate-900">{actor.display_name}</p>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
