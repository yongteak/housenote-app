/**
 * @file PropertyDetailPage.tsx
 * @description 매물 상세 + 현장 평가 입력. 크롤 상태(pending/processing/failed/completed)에 따라 UI가 달라진다.
 *
 * ## 크롤 상태별 화면
 * - pending/processing: 링크·상태 배너만 표시, 평가 비활성
 * - failed: 실패 사유 + 「다시 시도」→ pending 재등록
 * - completed: 매물 정보 + 평가·삭제 (기존 상세 UX)
 *
 * @see property-crawl.api.ts — PC 크롤러 연동
 * @see CrawlStatusBanner — 상단 상태 배너
 */
import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import { ActorAvatar } from "../components/actor/ActorAvatar";
import { CrawlStatusBanner } from "../components/property/CrawlStatusBanner";
import { CrawlStatusBadge } from "../components/property/CrawlStatusBadge";
import { FavoriteButton } from "../components/property/FavoriteButton";
import { PropertyRatingSummary } from "../components/PropertyRatingSummary";
import { StarRatingInput } from "../components/StarRatingInput";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { NavBar } from "../components/ui/NavBar";
import { PriceDisplay } from "../components/PriceDisplay";
import { touchRecentView } from "../features/activity/property-recent-views.api";
import { getProperty, saveProperty } from "../features/property/property.api";
import {
  deleteQueuedProperty,
  retryPropertyCrawl,
} from "../features/property/property-crawl.api";
import {
  getPropertyCrawlStatus,
  getPropertyDisplayTitle,
  isCrawlCompleted,
} from "../features/property/property-crawl-status";
import { recordToCrawlPayload } from "../features/property/property-crawl.mapper";
import { ComplexPropertyInfo } from "../features/property/ComplexPropertyInfo";
import { getPropertyCrawlKind } from "../types/property-crawl-kind";
import { propertyFormSchema } from "../features/property/property.schema";
import {
  PROPERTY_RATING_ITEMS,
  getPropertyAverageRating,
  hasAnyPropertyRating,
} from "../features/property/property-ratings";
import { useAuth } from "../lib/auth-context";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import type { DecisionStatus, PropertyFormValues, PropertyRecord } from "../types/property";

const PropertyLocationMap = lazy(() =>
  import("../features/property/PropertyLocationMap").then((module) => ({ default: module.PropertyLocationMap })),
);

const statusLabelMap: Record<DecisionStatus, string> = {
  review: "다시보기",
  hold: "보류",
  exclude: "제외",
  revisit: "재방문",
};

const decisionOptions: { value: DecisionStatus; label: string }[] = [
  { value: "review", label: "다시보기" },
  { value: "hold", label: "보류" },
  { value: "exclude", label: "제외" },
  { value: "revisit", label: "재방문" },
];

function toDateInputValue(isoValue: string | null): string {
  if (!isoValue) {
    return "";
  }
  return isoValue.slice(0, 10);
}

function recordToFormValues(record: PropertyRecord): PropertyFormValues {
  return {
    source_url: record.source_url,
    title: record.title ?? "",
    deal_type: record.deal_type ?? "",
    address: record.address ?? "",
    current_price_value: record.current_price_value,
    desired_price_value: record.desired_price_value,
    visited: record.visited,
    visited_at: toDateInputValue(record.visited_at),
    rating_location: record.rating_location,
    rating_price: record.rating_price,
    rating_condition: record.rating_condition,
    rating_sunlight: null,
    rating_environment: null,
    pros: record.pros ?? "",
    cons: record.cons ?? "",
    memo: record.memo ?? "",
    decision_status: record.decision_status,
    thumbnail_url: record.thumbnail_url ?? "",
  };
}

function formatArea(property: PropertyRecord): string {
  if (property.area_supply_m2 == null || property.area_private_m2 == null) {
    return "-";
  }
  return `${property.area_supply_m2.toFixed(1)}㎡ / ${property.area_private_m2.toFixed(1)}㎡`;
}

type SectionProps = {
  label: string;
  children: ReactNode;
};

function Section({ label, children }: SectionProps) {
  return (
    <section>
      <p className="mb-2 px-1 text-[12px] font-semibold text-slate-500">{label}</p>
      {children}
    </section>
  );
}

type DetailRowProps = {
  label: string;
  value: ReactNode;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-3.5 py-3">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className="text-right text-[13px] font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
      <NavBar title="매물 상세" />
      <main className="flex-1 space-y-3 px-4 py-4">
        <div className="toss-card overflow-hidden border-slate-200 p-0">
          <div className="aspect-[16/10] animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-2/3 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </div>
        <div className="toss-card h-36 animate-pulse border-slate-200 bg-slate-50" />
        <div className="toss-card h-44 animate-pulse border-slate-200 bg-slate-50" />
      </main>
    </div>
  );
}

type PropertyStatusChipsProps = {
  property: PropertyRecord;
  visited: boolean;
  decisionStatus: DecisionStatus;
  ratingAverage: number | null;
};

function PropertyStatusChips({ property, visited, decisionStatus, ratingAverage }: PropertyStatusChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {property.property_type ? (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {property.property_type}
        </span>
      ) : null}
      {property.deal_type ? (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {property.deal_type}
        </span>
      ) : null}
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
          visited ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
        )}
      >
        {visited ? "방문함" : "미방문"}
      </span>
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
          decisionStatus === "revisit" && "bg-amber-50 text-amber-700",
          decisionStatus === "review" && "bg-blue-50 text-blue-700",
          decisionStatus === "hold" && "bg-slate-100 text-slate-600",
          decisionStatus === "exclude" && "bg-rose-50 text-rose-700",
        )}
      >
        {statusLabelMap[decisionStatus]}
      </span>
      {ratingAverage != null ? (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          ★ {ratingAverage.toFixed(1)}
        </span>
      ) : null}
    </div>
  );
}

export function PropertyDetailPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useAuth();
  const ratingSectionRef = useRef<HTMLElement>(null);

  const propertyQuery = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => getProperty(propertyId ?? ""),
    enabled: Boolean(propertyId),
    /** PC 크롤 완료 전까지 주기적으로 상태를 갱신한다. */
    refetchInterval: (query) => {
      const record = query.state.data as PropertyRecord | null | undefined;
      if (!record) {
        return false;
      }
      const status = getPropertyCrawlStatus(record);
      return status === "pending" || status === "processing" ? 2000 : false;
    },
  });

  const property = useMemo(() => {
    return propertyQuery.data ?? null;
  }, [propertyQuery.data]);

  const crawlStatus = property ? getPropertyCrawlStatus(property) : "completed";
  const crawlReady = property ? isCrawlCompleted(property) : false;

  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
  });

  useEffect(() => {
    if (!property) {
      return;
    }
    reset(recordToFormValues(property));
  }, [property, reset]);

  useEffect(() => {
    if (!actor || !property?.id) {
      return;
    }
    void touchRecentView(actor, property.id).catch(() => {
      // 최근 본 항목 기록 실패는 상세 진입을 막지 않는다.
    });
  }, [actor, property?.id]);

  const crawlPayload = property ? recordToCrawlPayload(property) : null;
  const hasMapLocation =
    crawlPayload?.latitude != null && crawlPayload.longitude != null && Boolean(crawlPayload.source_url?.trim());
  const isComplex = crawlPayload ? getPropertyCrawlKind(crawlPayload) === "complex" : false;
  const complexPriceLabel =
    crawlPayload?.metadata?.complexSnapshot?.priceSource === "listing_min" ? "최저 매물가" : "최근 실거래";

  const ratingLocation = watch("rating_location");
  const ratingPrice = watch("rating_price");
  const ratingCondition = watch("rating_condition");
  const visited = watch("visited");
  const decisionStatus = watch("decision_status");
  const visitedAt = watch("visited_at");

  const ratingPreviewRecord = property
    ? {
        ...property,
        rating_location: ratingLocation,
        rating_price: ratingPrice,
        rating_condition: ratingCondition,
        visited,
        decision_status: decisionStatus,
      }
    : null;

  const ratingAverage = ratingPreviewRecord ? getPropertyAverageRating(ratingPreviewRecord) : null;

  const saveMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      if (!actor || !propertyId) {
        throw new Error("저장자 정보를 확인할 수 없습니다.");
      }
      return saveProperty(values, actor, propertyId, crawlPayload);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      reset(recordToFormValues(saved));
    },
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) {
        throw new Error("매물 ID가 없습니다.");
      }
      return retryPropertyCrawl(propertyId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["crawl-queue"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) {
        return;
      }
      await deleteQueuedProperty(propertyId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      navigate("/", { replace: true });
    },
  });

  function scrollToRatingSection() {
    ratingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDelete() {
    if (!window.confirm("이 매물 기록을 삭제할까요?")) {
      return;
    }
    void deleteMutation.mutateAsync();
  }

  if (propertyQuery.isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!property) {
    return (
      <div className="flex min-h-dvh flex-col bg-slate-50/30">
        <NavBar
          title="매물 상세"
          leftSlot={
            <Button
              variant="ghost"
              size="icon"
              aria-label="뒤로 가기"
              leadingIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate("/")}
            />
          }
        />
        <div className="flex-1 px-4 py-6">
          <EmptyState title="매물을 찾을 수 없어요." description="목록에서 다시 선택해 주세요." />
        </div>
      </div>
    );
  }

  const hasRatings = ratingPreviewRecord ? hasAnyPropertyRating(ratingPreviewRecord) : false;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
      <NavBar
        title="매물 상세"
        leftSlot={
          <Button
            variant="ghost"
            size="icon"
            aria-label="뒤로 가기"
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(-1)}
          />
        }
        rightSlot={
          <div className="flex items-center gap-0.5">
            <FavoriteButton propertyId={property.id} size="sm" />
            {crawlReady ? (
              <button
                type="button"
                className="rounded-xl px-2 py-1.5 text-[13px] font-semibold text-emerald-600 transition hover:bg-emerald-50 active:bg-emerald-50/80"
                onClick={scrollToRatingSection}
              >
                평가
              </button>
            ) : null}
          </div>
        }
      />

      <CrawlStatusBanner
        property={property}
        isRetrying={retryMutation.isPending}
        onRetry={crawlStatus === "failed" ? () => void retryMutation.mutateAsync() : undefined}
      />

      <form
        className="flex flex-1 flex-col"
        onSubmit={handleSubmit((values) => {
          void saveMutation.mutateAsync(values);
        })}
      >
        <main className="flex-1 space-y-3 px-4 py-4 pb-8">
          <article className="toss-card overflow-hidden border-slate-200 p-0">
            <div className="bg-slate-100">
              {property.thumbnail_url ? (
                <img
                  src={property.thumbnail_url}
                  alt={property.title ?? "매물"}
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : crawlReady && hasMapLocation && crawlPayload ? (
                <Suspense fallback={<div className="aspect-[16/10] animate-pulse bg-slate-100" />}>
                  <PropertyLocationMap crawl={crawlPayload} />
                </Suspense>
              ) : (
                <div className="flex aspect-[16/10] flex-col items-center justify-center gap-1 px-6 text-center">
                  <p className="text-[13px] font-medium text-slate-500">
                    {crawlReady ? "이미지 없음" : "정보를 불러오는 중"}
                  </p>
                  {!crawlReady ? (
                    <p className="text-[11px] text-slate-400">PC에서 매물 정보를 가져오면 표시돼요</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 flex-1 text-[18px] font-bold leading-snug text-slate-950">
                  {getPropertyDisplayTitle(property)}
                </h2>
                {property.source_url ? (
                  <a
                    href={property.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 pt-0.5 text-[12px] font-medium text-slate-400 transition hover:text-slate-600 active:opacity-70"
                  >
                    <span>네이버 부동산</span>
                    <ExternalLink className="h-3 w-3" strokeWidth={2.25} />
                  </a>
                ) : null}
              </div>
              {property.address ? (
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{property.address}</p>
              ) : null}
              <div className="mt-2">
                <CrawlStatusBadge property={property} />
              </div>
              {crawlReady ? (
                <>
                  <div className="mt-3">
                    <PropertyStatusChips
                      property={property}
                      visited={visited}
                      decisionStatus={decisionStatus}
                      ratingAverage={ratingAverage}
                    />
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-medium text-slate-500">{isComplex ? complexPriceLabel : "등록가"}</p>
                    <PriceDisplay value={property.current_price_value} size="lg" className="mt-0.5 text-emerald-600" />
                  </div>
                </>
              ) : null}
            </div>
          </article>

          {crawlReady && isComplex && crawlPayload ? (
            <Section label="단지 정보">
              <ComplexPropertyInfo crawl={crawlPayload} />
            </Section>
          ) : null}

          {crawlReady && !isComplex ? (
            <Section label="기본 정보">
              <article className="toss-card divide-y divide-slate-100 overflow-hidden border-slate-200 p-0">
                <DetailRow label="면적" value={formatArea(property)} />
                <DetailRow
                  label="층·향"
                  value={`${property.floor_info ?? "-"} · ${property.direction ? `${property.direction}향` : "-"}`}
                />
                <DetailRow
                  label="방문"
                  value={visited ? `방문 · ${visitedAt ? formatDate(visitedAt) : "-"}` : "미방문"}
                />
                <DetailRow
                  label="기록자"
                  value={
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <ActorAvatar phoneSuffix={property.phone_suffix} size="xs" label={property.actor_name} />
                      <span>{property.actor_name}</span>
                    </span>
                  }
                />
                <DetailRow label="수정일" value={formatDate(property.updated_at)} />
              </article>
            </Section>
          ) : null}

          <Section label="현장 평가">
            <article
              id="property-rating-section"
              ref={ratingSectionRef}
              className="toss-card scroll-mt-14 space-y-4 border-slate-200"
            >
              {!crawlReady ? (
                <p className="text-[13px] text-slate-400">
                  매물 정보를 모두 불러온 뒤에 평가할 수 있어요.
                </p>
              ) : (
                <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900">출퇴근 · 학교 · 편의시설</p>
                </div>
                {ratingAverage != null ? (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-bold text-amber-700">
                    평균 {ratingAverage.toFixed(1)}
                  </span>
                ) : null}
              </div>

              {hasRatings ? (
                <PropertyRatingSummary property={ratingPreviewRecord!} />
              ) : (
                <p className="text-[13px] text-slate-400">아직 평가가 없습니다. 아래에서 별점을 남겨 보세요.</p>
              )}

              <div className="space-y-4 border-t border-slate-100 pt-4">
                {PROPERTY_RATING_ITEMS.map((item) => (
                  <StarRatingInput
                    key={item.key}
                    label={item.label}
                    hint={item.description}
                    value={watch(item.key)}
                    onChange={(value) => setValue(item.key, value, { shouldDirty: true })}
                  />
                ))}
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-4">
                <p className="text-[13px] font-medium text-slate-600">메모</p>
                <textarea
                  className="toss-textarea font-medium"
                  rows={4}
                  placeholder="임장 때 느낀 점, 중개사 말, 다음에 볼 것 등"
                  {...register("memo")}
                />
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-slate-900">방문 · 판단</p>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 select-none">
                    <span>방문함</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-500"
                      {...register("visited")}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-slate-600">구매 판단</p>
                  <div className="flex flex-wrap gap-1.5">
                    {decisionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition",
                          decisionStatus === option.value
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                        )}
                        onClick={() => setValue("decision_status", option.value, { shouldDirty: true })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {visited ? (
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-slate-600">방문일</p>
                    <input className="toss-input" type="date" {...register("visited_at")} />
                  </div>
                ) : null}
              </div>

              {formState.errors.visited_at ? (
                <p className="text-[12px] text-rose-500">{formState.errors.visited_at.message}</p>
              ) : null}
              {saveMutation.error ? (
                <p className="text-[12px] text-rose-500">{(saveMutation.error as Error).message}</p>
              ) : null}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!formState.isDirty || saveMutation.isPending}
              >
                {saveMutation.isPending ? "저장 중..." : "평가 저장"}
              </Button>
                </>
              )}
            </article>
          </Section>

          {crawlReady && hasMapLocation && property.thumbnail_url && crawlPayload ? (
            <Section label="위치">
              <Suspense fallback={<div className="h-44 animate-pulse rounded-2xl bg-slate-100" />}>
                <PropertyLocationMap crawl={crawlPayload} />
              </Suspense>
            </Section>
          ) : null}

          <Button
            type="button"
            variant="surface"
            className="w-full border-slate-200 text-rose-500"
            leadingIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleDelete}
            disabled={deleteMutation.isPending || crawlStatus === "processing"}
          >
            {deleteMutation.isPending ? "삭제 중..." : "매물 기록 삭제"}
          </Button>
        </main>
      </form>
    </div>
  );
}
