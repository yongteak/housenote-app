import {
  getActorAvatarUrl,
  getActorAvatarUrlByVariant,
  type ActorAvatarVariant,
} from "../../features/actor/actor-avatars";
import { cn } from "../../lib/cn";

type ActorAvatarProps = {
  /** phone_suffix (1111/2222). variant 보다 우선 */
  phoneSuffix?: string;
  variant?: ActorAvatarVariant;
  label?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

const sizeClass: Record<NonNullable<ActorAvatarProps["size"]>, string> = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function ActorAvatar({ phoneSuffix, variant = "dad", label, className, size = "md" }: ActorAvatarProps) {
  const src = phoneSuffix ? getActorAvatarUrl(phoneSuffix) : getActorAvatarUrlByVariant(variant);
  const alt = label ?? (variant === "mom" ? "엄마" : "아빠");

  return (
    <img
      src={src}
      alt={alt}
      className={cn("shrink-0 rounded-full object-cover bg-slate-100", sizeClass[size], className)}
    />
  );
}
