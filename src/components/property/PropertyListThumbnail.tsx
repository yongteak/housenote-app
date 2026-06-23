import { getPropertyDisplayTitle } from "../../features/property/property-crawl-status";
import { cn } from "../../lib/cn";
import type { PropertyRecord } from "../../types/property";

type PropertyListThumbnailProps = {
  property: Pick<PropertyRecord, "title" | "thumbnail_url" | "source_url">;
  className?: string;
};

function getPropertyInitial(property: PropertyListThumbnailProps["property"]): string {
  const title = getPropertyDisplayTitle(property as PropertyRecord).trim();
  return [...title][0] ?? "매";
}

export function PropertyListThumbnail({ property, className }: PropertyListThumbnailProps) {
  const alt = property.title ?? "매물";

  if (property.thumbnail_url) {
    return (
      <div
        className={cn(
          "h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50",
          className,
        )}
      >
        <img src={property.thumbnail_url} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-100 text-[22px] font-bold text-slate-400",
        className,
      )}
      aria-label={alt}
    >
      {getPropertyInitial(property)}
    </div>
  );
}
