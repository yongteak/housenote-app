import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type NavBarProps = {
  title: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  className?: string;
};

export function NavBar({ title, leftSlot, rightSlot, className }: NavBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-200/70 bg-white/95 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="min-w-[3.25rem]">{leftSlot}</div>
      <h1 className="truncate px-2 text-[15px] font-bold text-slate-950">{title}</h1>
      <div className="flex min-w-[3.25rem] justify-end">{rightSlot}</div>
    </header>
  );
}
