import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <article className="toss-card border-slate-200 py-8 text-center">
      <p className="text-[15px] font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-[13px] text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}
