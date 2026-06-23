import type { ReactNode } from "react";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import { cn } from "../../lib/cn";

export type SelectorOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

type SelectorFieldProps = {
  label: string;
  valueLabel: string;
  onClick: () => void;
  className?: string;
  compact?: boolean;
  scrollable?: boolean;
};

export function SelectorField({
  label,
  valueLabel,
  onClick,
  className,
  compact = false,
  scrollable = false,
}: SelectorFieldProps) {
  const showLabel = !compact || scrollable;

  return (
    <button
      type="button"
      className={cn(
        "ui-selector-field cursor-pointer",
        scrollable ? "w-auto shrink-0 gap-2 px-3 py-2" : "min-w-0",
        compact && !scrollable && "ui-selector-field--compact justify-center gap-1 px-2 py-1.5",
        className,
      )}
      onClick={onClick}
    >
      {showLabel ? (
        <span className="shrink-0 whitespace-nowrap text-ui-caption font-medium text-slate-500">{label}</span>
      ) : null}
      <span
        className={cn(
          "flex items-center gap-1 font-semibold text-slate-900",
          scrollable ? "shrink-0 gap-1.5 text-ui-body" : "min-w-0",
          compact && !scrollable ? "text-ui-caption" : !scrollable ? "gap-1.5 text-ui-body" : null,
        )}
      >
        <span className={cn(scrollable ? "whitespace-nowrap" : "truncate whitespace-nowrap")}>{valueLabel}</span>
        <ChevronDown className={cn("shrink-0 text-slate-400", compact && !scrollable ? "h-3.5 w-3.5" : "h-4 w-4")} />
      </span>
    </button>
  );
}

type SelectorListProps<T extends string> = {
  title?: string;
  selectedValue: T;
  options: SelectorOption<T>[];
  onSelect: (value: T) => void;
  trailing?: ReactNode;
  className?: string;
};

export function SelectorList<T extends string>({
  title,
  selectedValue,
  options,
  onSelect,
  trailing,
  className,
}: SelectorListProps<T>) {
  const showHeader = Boolean(title || trailing);

  return (
    <div className={cn("px-4 pb-6 pt-2", showHeader && "space-y-3", className)}>
      {showHeader ? (
        <div className="flex items-center justify-between">
          {title ? <p className="text-ui-emphasis font-bold text-slate-900">{title}</p> : <span aria-hidden />}
          {trailing}
        </div>
      ) : null}
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/60"
                  : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
              )}
              onClick={() => onSelect(option.value)}
            >
              <div>
                <p className="text-ui-body font-semibold">{option.label}</p>
                {option.hint ? <p className="mt-0.5 text-ui-caption text-slate-500">{option.hint}</p> : null}
              </div>
              {isSelected ? <Check className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
