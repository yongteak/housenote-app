/**
 * @file PriceDisplay.tsx
 * @description 억·천·백만원 표기를 기본으로, 탭하면 원화 숫자로 전환한다.
 */
import { useState, type MouseEvent } from "react";

import { cn } from "../lib/cn";
import { formatPriceManwon, formatWon } from "../lib/format";

type PriceDisplaySize = "sm" | "md" | "lg";

const sizeClass: Record<PriceDisplaySize, string> = {
  sm: "text-[15px] font-semibold tracking-tight",
  md: "text-[22px] font-bold tracking-tight",
  lg: "text-[26px] font-extrabold tracking-tight leading-none",
};

type PriceDisplayProps = {
  value: number | null | undefined;
  fallback?: string;
  size?: PriceDisplaySize;
  className?: string;
  /** Link 등 상위 클릭 영역 안에서 사용할 때 */
  stopPropagation?: boolean;
};

export function PriceDisplay({
  value,
  fallback = "-",
  size = "md",
  className,
  stopPropagation = false,
}: PriceDisplayProps) {
  const [showNumeric, setShowNumeric] = useState(false);

  if (value == null || Number.isNaN(value)) {
    return <span className={cn(sizeClass[size], className)}>{fallback}</span>;
  }

  const label = showNumeric ? formatWon(value) : formatPriceManwon(value);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    setShowNumeric((current) => !current);
  }

  return (
    <button
      type="button"
      className={cn("cursor-pointer text-left transition active:opacity-60", sizeClass[size], className)}
      onClick={handleClick}
      aria-label={showNumeric ? "억·만원 단위로 보기" : "원화 숫자로 보기"}
    >
      {label}
    </button>
  );
}
