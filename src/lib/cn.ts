import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * tailwind className 충돌을 정리해 반환한다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
