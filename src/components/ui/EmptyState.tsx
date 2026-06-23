import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <article className={cn("py-8 text-center", className)}>
      <p className="text-ui-emphasis font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-ui-body text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}
