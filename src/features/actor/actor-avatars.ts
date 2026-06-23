/**
 * @file actor-avatars.ts
 * @description 저장자(아빠/엄마) 고정 아바타 URL.
 * 로그인·홈·프로필·기록자 표시 등 전역에서 동일 이미지를 쓴다.
 */

export type ActorAvatarVariant = "dad" | "mom";

/** phone_suffix → 아바타 variant */
export function getActorVariant(phoneSuffix: string | undefined): ActorAvatarVariant {
  return phoneSuffix === "2222" ? "mom" : "dad";
}

/**
 * Dicebear 고정 seed — 남/여 구분 아이콘형 아바타.
 * CDN URL 이므로 앱 재배포 없이 동일 이미지가 유지된다.
 */
const AVATAR_URL_BY_VARIANT: Record<ActorAvatarVariant, string> = {
  dad: "https://api.dicebear.com/9.x/avataaars/svg?seed=housenote-dad&backgroundColor=b6e3f4&clothing=blazerAndShirt",
  mom: "https://api.dicebear.com/9.x/avataaars/svg?seed=housenote-mom&backgroundColor=ffd5e5&clothing=blazerAndShirt",
};

export function getActorAvatarUrl(phoneSuffix: string | undefined): string {
  return AVATAR_URL_BY_VARIANT[getActorVariant(phoneSuffix)];
}

export function getActorAvatarUrlByVariant(variant: ActorAvatarVariant): string {
  return AVATAR_URL_BY_VARIANT[variant];
}
