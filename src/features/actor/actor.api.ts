/**
 * @file actor.api.ts
 * @description 전화번호 뒷자리 기반 고정 저장자 목록 조회 API.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { FixedActor, SelectedActor } from "../../types/property";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }
}

/**
 * 활성 저장자 목록을 조회한다.
 */
export async function fetchFixedActors(): Promise<FixedActor[]> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc("hnote_list_fixed_actors");
  if (error || !data) {
    throw new Error(error?.message ?? "저장자 목록을 불러오지 못했습니다.");
  }

  return data as FixedActor[];
}

/**
 * 전화번호 뒷자리로 저장자를 조회해 로그인 세션 정보를 만든다.
 * @param phoneSuffix 허용 ID (1111 또는 2222)
 */
export async function authenticateByPhoneSuffix(phoneSuffix: string): Promise<SelectedActor> {
  assertSupabaseConfigured();

  const { data, error } = await supabase.rpc("hnote_get_actor_by_phone_suffix", {
    p_phone_suffix: phoneSuffix,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "저장자 정보를 찾을 수 없습니다.");
  }

  return {
    actorId: data.id,
    phoneSuffix: data.phone_suffix,
    actorName: data.display_name,
  };
}
