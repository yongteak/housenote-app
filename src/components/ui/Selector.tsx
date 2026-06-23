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
};

export function SelectorField({ label, valueLabel, onClick, className }: SelectorFieldProps) {
  return (
    <button type="button" className={cn("ui-selector-field", className)} onClick={onClick}>
      <span className="text-[12px] font-medium text-slate-500">{label}</span>
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
        {valueLabel}
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </span>
    </button>
  );
}

type SelectorListProps<T extends string> = {
  title: string;
  selectedValue: T;
  options: SelectorOption<T>[];
  onSelect: (value: T) => void;
  trailing?: ReactNode;
};

export function SelectorList<T extends string>({
  title,
  selectedValue,
  options,
  onSelect,
  trailing,
}: SelectorListProps<T>) {
  return (
    <div className="space-y-3 px-4 pb-6 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-900">{title}</p>
        {trailing}
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition",
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700",
              )}
              onClick={() => onSelect(option.value)}
            >
              <div>
                <p className="text-[13px] font-semibold">{option.label}</p>
                {option.hint ? <p className="mt-0.5 text-[11px] text-slate-500">{option.hint}</p> : null}
              </div>
              {isSelected ? <Check className="h-4 w-4" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
