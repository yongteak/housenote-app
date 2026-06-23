import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { PropertyRecentViewRecord, SelectedActor } from "../../types/property";

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수(VITE_SUPABASE_*)를 먼저 설정해주세요.");
  }
}

export async function listRecentViews(actor: SelectedActor): Promise<PropertyRecentViewRecord[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("hnote_list_recent_views", {
    p_actor_id: actor.actorId,
    p_limit: 50,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "최근 본 항목 조회에 실패했습니다.");
  }
  return data as PropertyRecentViewRecord[];
}

export async function touchRecentView(actor: SelectedActor, propertyId: string): Promise<void> {
  assertSupabaseConfigured();
  const { error } = await supabase.rpc("hnote_touch_recent_view", {
    p_actor_id: actor.actorId,
    p_property_id: propertyId,
    p_viewed_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}
