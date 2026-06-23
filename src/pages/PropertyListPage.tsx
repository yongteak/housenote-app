import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Plus from "lucide-react/dist/esm/icons/plus";
import X from "lucide-react/dist/esm/icons/x";
import CircleUserRound from "lucide-react/dist/esm/icons/circle-user-round";
import { Link, useNavigate } from "react-router-dom";

import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SelectorField, SelectorList, type SelectorOption } from "../components/ui/Selector";
import { getMockProperties } from "../fixtures/mobile-mvp-ui-mock";
import { listProperties } from "../features/property/property.api";
import { cn } from "../lib/cn";
import { useAuth } from "../lib/auth-context";
import { formatWon } from "../lib/format";
import type { DecisionStatus, PropertyFilters, PropertyRecord } from "../types/property";

const PropertyMapWithSheet = lazy(() =>
  import("../features/map/PropertyMapWithSheet").then((module) => ({ default: module.PropertyMapWithSheet })),
);

type ListViewMode = "list" | "map";
type VisitedFilterValue = NonNullable<PropertyFilters["visited"]>;
type StatusFilterValue = NonNullable<PropertyFilters["decisionStatus"]>;
type FilterSheet = "visited" | "status" | null;

const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

const visitedOptions: SelectorOption<VisitedFilterValue>[] = [
  { value: "all", label: "방문 전체" },
  { value: "yes", label: "방문함" },
  { value: "no", label: "미방문" },
];

const statusOptions: SelectorOption<StatusFilterValue>[] = [
  { value: "all", label: "상태 전체" },
  { value: "review", label: "다시보기" },
  { value: "hold", label: "보류" },
  { value: "exclude", label: "제외" },
  { value: "revisit", label: "재방문" },
];

function statusLabel(status: DecisionStatus): string {
  return statusLabelMap[status] ?? "검토";
}

function findLabel<T extends string>(options: SelectorOption<T>[], value: T) {
  return options.find((option) => option.value === value)?.label ?? "-";
}

function applyFilters(
  properties: PropertyRecord[],
  visitedFilter: VisitedFilterValue,
  statusFilter: StatusFilterValue,
) {
  return properties.filter((property) => {
    if (visitedFilter === "yes" && !property.visited) return false;
    if (visitedFilter === "no" && property.visited) return false;
    if (statusFilter !== "all" && property.decision_status !== statusFilter) return false;
    return true;
  });
}

function sortForListView(properties: PropertyRecord[]) {
  return [...properties].sort((a, b) => {
    if (a.visited !== b.visited) {
      return a.visited ? 1 : -1;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

type ViewModeToggleProps = {
  mode: ListViewMode;
  onChange: (mode: ListViewMode) => void;
};

function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="inline-flex w-full rounded-lg bg-slate-100 p-0.5">
      {(["list", "map"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={cn(
            "flex-1 rounded-md py-1.5 text-[13px] font-semibold transition",
            mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
          )}
          onClick={() => onChange(value)}
        >
          {value === "list" ? "리스트" : "지도"}
        </button>
      ))}
    </div>
  );
}

type FilterControlsProps = {
  visitedFilter: VisitedFilterValue;
  statusFilter: StatusFilterValue;
  onOpenSheet: (sheet: Exclude<FilterSheet, null>) => void;
  compact?: boolean;
};

function FilterControls({ visitedFilter, statusFilter, onOpenSheet, compact = false }: FilterControlsProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", compact ? "" : "w-full")}>
      <SelectorField
        label="방문"
        valueLabel={findLabel(visitedOptions, visitedFilter)}
        onClick={() => onOpenSheet("visited")}
        className={compact ? "py-2" : undefined}
      />
      <SelectorField
        label="상태"
        valueLabel={findLabel(statusOptions, statusFilter)}
        onClick={() => onOpenSheet("status")}
        className={compact ? "py-2" : undefined}
      />
    </div>
  );
}

type FilterSheetsProps = {
  openSheet: FilterSheet;
  visitedFilter: VisitedFilterValue;
  statusFilter: StatusFilterValue;
  onClose: () => void;
  onVisitedChange: (value: VisitedFilterValue) => void;
  onStatusChange: (value: StatusFilterValue) => void;
};

function FilterSheets({
  openSheet,
  visitedFilter,
  statusFilter,
  onClose,
  onVisitedChange,
  onStatusChange,
}: FilterSheetsProps) {
  return (
    <>
      <BottomSheet open={openSheet === "visited"} onClose={onClose} title="방문 필터">
        <SelectorList
          title="방문 상태"
          selectedValue={visitedFilter}
          options={visitedOptions}
          onSelect={(value) => {
            onVisitedChange(value);
            onClose();
          }}
        />
      </BottomSheet>
      <BottomSheet open={openSheet === "status"} onClose={onClose} title="상태 필터">
        <SelectorList
          title="판단 상태"
          selectedValue={statusFilter}
          options={statusOptions}
          onSelect={(value) => {
            onStatusChange(value);
            onClose();
          }}
        />
      </BottomSheet>
    </>
  );
}

export function PropertyListPage() {
  const navigate = useNavigate();
  const { actor } = useAuth();
  const [viewMode, setViewMode] = useState<ListViewMode>("list");
  const [visitedFilter, setVisitedFilter] = useState<VisitedFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);

  const query = useQuery({
    queryKey: ["properties", "home", actor?.actorId],
    queryFn: () =>
      listProperties({
        actorId: actor?.actorId,
        visited: "all",
        decisionStatus: "all",
      }),
    enabled: Boolean(actor),
  });

  const sourceProperties = useMemo<PropertyRecord[]>(
    () => (query.data && query.data.length > 0 ? query.data : getMockProperties(actor)),
    [actor, query.data],
  );

  const filteredProperties = useMemo(
    () => applyFilters(sourceProperties, visitedFilter, statusFilter),
    [sourceProperties, statusFilter, visitedFilter],
  );

  const listPropertiesSorted = useMemo(() => sortForListView(filteredProperties), [filteredProperties]);

  const filterSheets = (
    <FilterSheets
      openSheet={openSheet}
      visitedFilter={visitedFilter}
      statusFilter={statusFilter}
      onClose={() => setOpenSheet(null)}
      onVisitedChange={setVisitedFilter}
      onStatusChange={setStatusFilter}
    />
  );

  if (viewMode === "map") {
    return (
      <div className="fixed inset-0 z-40 mx-auto w-full max-w-xl bg-slate-100">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full animate-pulse bg-slate-200" />}>
            <PropertyMapWithSheet properties={filteredProperties} fullScreen />
          </Suspense>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 px-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="property-map-top-bar pointer-events-auto flex items-center gap-2">
            <Button
              variant="surface"
              size="sm"
              className="shrink-0 border-transparent bg-white/78 px-3 shadow-none"
              leadingIcon={<X className="h-4 w-4" />}
              onClick={() => setViewMode("list")}
            >
              닫기
            </Button>
            <div className="min-w-0 flex-1">
              <FilterControls
                compact
                visitedFilter={visitedFilter}
                statusFilter={statusFilter}
                onOpenSheet={setOpenSheet}
              />
            </div>
          </div>
        </div>

        {filterSheets}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 backdrop-blur-md">
        <div className="flex h-12 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="프로필"
            leadingIcon={<CircleUserRound className="h-5 w-5" />}
            onClick={() => navigate("/profile")}
          />
          <h1 className="text-[15px] font-bold text-slate-950">발품</h1>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-[13px] font-semibold text-slate-600"
              leadingIcon={<Clock3 className="h-4 w-4" />}
              onClick={() => navigate("/activity")}
            >
              활동
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="새 매물 기록하기"
              leadingIcon={<Plus className="h-5 w-5 text-emerald-600" />}
              onClick={() => navigate("/properties/new")}
            />
          </div>
        </div>
        <div className="px-4 pb-3">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </header>

      <main className="flex-1 space-y-3 px-4 py-4 pb-6">
        <article className="toss-card border-slate-200 p-3">
          <FilterControls
            visitedFilter={visitedFilter}
            statusFilter={statusFilter}
            onOpenSheet={setOpenSheet}
          />
        </article>

        {query.isLoading ? <p className="px-1 text-[13px] text-slate-500">목록을 불러오는 중...</p> : null}
        {query.error ? <p className="px-1 text-[13px] text-rose-500">{(query.error as Error).message}</p> : null}

        {filteredProperties.length === 0 ? (
          <EmptyState
            title="매물이 없어요."
            description="우측 상단 + 버튼으로 첫 매물을 추가하세요."
            action={
              <Button variant="primary" className="w-full" onClick={() => navigate("/properties/new")}>
                추가하기
              </Button>
            }
          />
        ) : (
          <div className="space-y-0">
            {listPropertiesSorted.map((property, index) => (
              <div key={property.id} className="relative flex gap-3 pb-3">
                {index < listPropertiesSorted.length - 1 ? (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-200" aria-hidden />
                ) : null}
                <div className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[12px] font-bold text-slate-700">
                  {index + 1}
                </div>
                <Link to={`/properties/${property.id}`} className="toss-card block min-w-0 flex-1 border-slate-200">
                  <div className="flex gap-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      {property.thumbnail_url ? (
                        <img
                          src={property.thumbnail_url}
                          alt={property.title ?? "매물"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-slate-950">{property.title ?? "제목 없음"}</p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">{property.address ?? "주소 없음"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">{property.visited ? "방문" : "미방문"}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">{statusLabel(property.decision_status)}</span>
                      </div>
                      <p className="mt-2 text-[14px] font-bold text-emerald-700">
                        {formatWon(property.desired_price_value ?? property.current_price_value)}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {filterSheets}
    </div>
  );
}
