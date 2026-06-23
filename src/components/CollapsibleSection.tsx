/**
 * @file CollapsibleSection.tsx
 * @description Apple HIG 스타일 접이식 섹션. 부가 정보를 기본 숨김 처리한다.
 */
import { useState, type ReactNode } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

type CollapsibleSectionProps = {
  /** 섹션 제목 */
  title: string;
  /** 접힌 상태 부제 (선택) */
  summary?: string;
  /** 기본 펼침 여부 */
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleSection({ title, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="toss-card overflow-hidden p-0">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:scale-[0.98] active:bg-slate-50"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <p className="text-ui-emphasis font-semibold text-slate-950">{title}</p>
          {!open && summary ? <p className="mt-0.5 truncate text-ui-caption text-slate-500">{summary}</p> : null}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-slate-100 bg-white px-4 py-3">{children}</div> : null}
    </section>
  );
}
