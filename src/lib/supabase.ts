/**
 * @file supabase.ts
 * @description Supabase URL/키 환경변수를 읽어 클라이언트 인스턴스를 제공한다.
 */
import { createClient } from "@supabase/supabase-js";

/** 앱에서 사용할 Supabase 프로젝트 URL */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
/** 브라우저에서 사용할 publishable(또는 anon) 키 */
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * 환경변수 구성 여부를 반환한다.
 * URL/키가 비어 있으면 앱은 데모 모드로 동작한다.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export const supabase = createClient(supabaseUrl || "https://example.invalid", supabasePublishableKey || "demo-key", {
  auth: {
    persistSession: false,
  },
});
