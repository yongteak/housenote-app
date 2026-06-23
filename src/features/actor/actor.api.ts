/**
 * @file actor.api.ts
 * @description 전화번호 뒷자리 기반 고정 저장자 목록 조회 API.
 */
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { FixedActor, SelectedActor } from "../../types/property";

/** Supabase schema 이름 */
const BALPOOM_SCHEMA = "balpoom";

/** 데모 모드 기본 저장자 */
const FALLBACK_ACTORS: FixedActor[] = [
  { id: "actor-1111", phone_suffix: "1111", display_name: "아빠", is_active: true },
  { id: "actor-2222", phone_suffix: "2222", display_name: "엄마", is_active: true },
];

/**
 * 활성 저장자 목록을 조회한다.
 */
export async function fetchFixedActors(): Promise<FixedActor[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_ACTORS;
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("fixed_actors")
    .select("id, phone_suffix, display_name, is_active")
    .eq("is_active", true)
    .order("phone_suffix", { ascending: true });

  if (error || !data || data.length === 0) {
    return FALLBACK_ACTORS;
  }

  return data as FixedActor[];
}

/**
 * 전화번호 뒷자리로 저장자를 조회해 로그인 세션 정보를 만든다.
 * @param phoneSuffix 허용 ID (1111 또는 2222)
 */
export async function authenticateByPhoneSuffix(phoneSuffix: string): Promise<SelectedActor> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }

  const { data, error } = await supabase
    .schema(BALPOOM_SCHEMA)
    .from("fixed_actors")
    .select("id, phone_suffix, display_name, is_active")
    .eq("phone_suffix", phoneSuffix)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "저장자 정보를 찾을 수 없습니다.");
  }

  return {
    actorId: data.id,
    phoneSuffix: data.phone_suffix,
    actorName: data.display_name,
  };
}
