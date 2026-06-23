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
        "sticky top-0 z-20 flex h-12 min-h-12 items-center justify-between border-b border-slate-200/70 bg-white/95 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex min-h-11 min-w-11 items-center">{leftSlot}</div>
      <h1 className="truncate px-2 text-ui-nav font-bold text-slate-950">{title}</h1>
      <div className="flex min-h-11 min-w-11 items-center justify-end">{rightSlot}</div>
    </header>
  );
}
