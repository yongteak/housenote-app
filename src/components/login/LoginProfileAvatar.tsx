import { ActorAvatar } from "../actor/ActorAvatar";
import { cn } from "../../lib/cn";
import type { ActorAvatarVariant } from "../../features/actor/actor-avatars";

type LoginProfileAvatarProps = {
  variant: ActorAvatarVariant;
  className?: string;
};

/** @deprecated ActorAvatar 사용 권장. 로그인 화면 호환용 래퍼 */
export function LoginProfileAvatar({ variant, className }: LoginProfileAvatarProps) {
  return <ActorAvatar variant={variant} size="lg" className={cn("h-full w-full", className)} label={variant === "mom" ? "엄마" : "아빠"} />;
}
