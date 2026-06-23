/**
 * @file PropertyEditorPage.tsx
 * @description URL 검색 → 크롤 미리보기 → 평가 입력 → 저장. 신규·상세(편집) 공통 UX.
 */
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { StarRatingInput } from "../components/StarRatingInput";
import { deleteProperty, getProperty, saveProperty } from "../features/property/property.api";
import { applyCrawlToForm } from "../features/property/property-crawl.mapper";
import { PROPERTY_RATING_ITEMS, getPropertyAverageRating } from "../features/property/property-ratings";
import { searchPropertyByUrl } from "../features/property/mock-crawl.api";
import { PropertyCrawlPreview } from "../features/property/PropertyCrawlPreview";
import { propertyFormSchema } from "../features/property/property.schema";
import { useAuth } from "../lib/auth-context";
import type { PropertyCrawlPayload } from "../types/property-crawl";
import type { DecisionStatus, PropertyFormValues, PropertyRecord } from "../types/property";

import Search from "lucide-react/dist/esm/icons/search";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";

type PropertyEditorPageProps = {
  mode: "create" | "edit";
};

const defaultFormValues: PropertyFormValues = {
  source_url: "",
  title: "",
  deal_type: "매매",
  address: "",
  current_price_value: null,
  desired_price_value: null,
  visited: false,
  visited_at: "",
  rating_location: null,
  rating_price: null,
  rating_condition: null,
  rating_sunlight: null,
  rating_environment: null,
  pros: "",
  cons: "",
  memo: "",
  decision_status: "review",
  thumbnail_url: "",
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

/**
 * DB 레코드에서 크롤 미리보기용 페이로드를 복원한다.
 * @param record 저장된 매물
 */
function recordToCrawlPayload(record: PropertyRecord): PropertyCrawlPayload {
  const metadata = (record.metadata ?? {}) as PropertyCrawlPayload["metadata"];

  return {
    source_url: record.source_url,
    source_domain: record.source_domain ?? undefined,
    source_listing_id: record.source_listing_id ?? undefined,
    title: record.title,
    property_type: record.property_type ?? undefined,
    deal_type: record.deal_type,
    address: record.address,
    road_address: record.road_address ?? undefined,
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
    current_price_text: record.current_price_text ?? undefined,
    current_price_value: record.current_price_value,
    area_supply_m2: record.area_supply_m2 ?? undefined,
    area_private_m2: record.area_private_m2 ?? undefined,
    floor_info: record.floor_info ?? undefined,
    direction: record.direction ?? undefined,
    thumbnail_url: record.thumbnail_url,
    image_urls: record.image_urls ?? [],
    metadata,
  };
}

export function PropertyEditorPage({ mode }: PropertyEditorPageProps) {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useAuth();

  const [searchUrl, setSearchUrl] = useState("");
  const [crawlData, setCrawlData] = useState<PropertyCrawlPayload | null>(null);

  const { register, handleSubmit, setValue, watch, formState, reset } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaultFormValues,
  });

  const isEditMode = mode === "edit";

  const propertyQuery = useQuery({
    queryKey: ["property", propertyId],
    queryFn: () => getProperty(propertyId ?? ""),
    enabled: isEditMode && Boolean(propertyId),
  });

  useEffect(() => {
    if (!propertyQuery.data) {
      return;
    }

    const record = propertyQuery.data;
    reset({
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
      pros: "",
      cons: "",
      memo: record.memo ?? "",
      decision_status: record.decision_status,
      thumbnail_url: record.thumbnail_url ?? "",
    });
    setSearchUrl(record.source_url);
    setCrawlData(recordToCrawlPayload(record));
  }, [propertyQuery.data, reset]);

  const searchMutation = useMutation({
    mutationFn: searchPropertyByUrl,
    onSuccess: (crawl) => {
      setCrawlData(crawl);
      const patch = applyCrawlToForm(crawl, searchUrl.trim());
      for (const [key, value] of Object.entries(patch)) {
        setValue(key as keyof PropertyFormValues, value as never, { shouldDirty: true });
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      if (!actor) {
        throw new Error("저장자를 먼저 선택해주세요.");
      }
      return saveProperty(values, actor, isEditMode ? propertyId : undefined, crawlData);
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      navigate(`/properties/${saved.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) {
        return;
      }
      await deleteProperty(propertyId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      navigate("/");
    },
  });

  const decisionStatus = watch("decision_status");
  const visited = watch("visited");
  const ratingLocation = watch("rating_location");
  const ratingPrice = watch("rating_price");
  const ratingCondition = watch("rating_condition");

  const canSave = Boolean(crawlData) && Boolean(watch("title")) && Boolean(watch("address"));

  const ratingPreviewRecord: PropertyRecord | null = crawlData
    ? {
        ...(propertyQuery.data ?? ({} as PropertyRecord)),
        rating_location: ratingLocation,
        rating_price: ratingPrice,
        rating_condition: ratingCondition,
      }
    : null;

  const ratingAverage = ratingPreviewRecord ? getPropertyAverageRating(ratingPreviewRecord) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50/30">
      <form
        className="flex flex-1 flex-col"
        onSubmit={handleSubmit((values) => {
          void saveMutation.mutateAsync(values);
        })}
      >
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/50 bg-white/95 px-4 backdrop-blur-md">
          <button
            type="button"
            className="text-[15px] font-medium text-slate-500 transition hover:text-slate-800 active:opacity-60"
            onClick={() => navigate("/")}
          >
            취소
          </button>

          <span className="max-w-[50%] truncate text-center text-[15px] font-bold text-slate-950">
            {crawlData?.title ?? (isEditMode ? "매물 상세" : "새 매물")}
          </span>

          <button
            type="submit"
            className="text-[15px] font-bold text-emerald-600 transition hover:text-emerald-800 disabled:text-slate-300 active:opacity-60"
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending ? "저장 중" : "저장"}
          </button>
        </header>

        <main className="flex-1 space-y-4 px-4 py-4 pb-20">
          <input type="hidden" {...register("source_url")} />
          <input type="hidden" {...register("title")} />
          <input type="hidden" {...register("deal_type")} />
          <input type="hidden" {...register("address")} />

          {!isEditMode ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  className="toss-input pl-10"
                  placeholder="네이버 부동산 매물 또는 지도 링크를 복사해 넣으세요"
                  value={searchUrl}
                  onChange={(event) => setSearchUrl(event.target.value)}
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <button
                type="button"
                className="toss-button-primary w-full gap-1.5 text-[14px] font-semibold"
                disabled={searchMutation.isPending || !searchUrl.trim()}
                onClick={() => searchMutation.mutate(searchUrl.trim())}
              >
                <span>{searchMutation.isPending ? "매물 정보 파싱 중..." : "매물 정보 불러오기"}</span>
              </button>
            </div>
          ) : null}
          {searchMutation.error ? <p className="text-[12px] text-rose-500">{(searchMutation.error as Error).message}</p> : null}

          {!crawlData && !isEditMode ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
              <p className="text-[13px] font-medium text-slate-400">분석된 매물이 없습니다. 상단에 링크를 입력해 주세요.</p>
            </div>
          ) : null}

          {propertyQuery.isLoading && isEditMode ? (
            <p className="text-[13px] text-slate-500">매물 정보를 불러오는 중...</p>
          ) : null}

          {crawlData ? <PropertyCrawlPreview crawl={crawlData} /> : null}

          {crawlData ? (
            <>
              <article className="toss-card space-y-4 border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <p className="text-[15px] font-bold text-slate-950">현장 평가</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">별 3개만 빠르게 남기세요</p>
                  </div>
                  {ratingAverage != null ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-bold text-amber-700">
                      평균 {ratingAverage.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4">
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

                <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
                  <p className="text-[13px] font-medium text-slate-600">메모</p>
                  <textarea
                    className="toss-textarea font-medium"
                    rows={4}
                    placeholder="임장 때 느낀 점, 중개사 말, 다음에 볼 것 등"
                    {...register("memo")}
                  />
                </div>
              </article>

              <article className="toss-card space-y-4 border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <p className="text-[15px] font-bold text-slate-950">방문 · 판단</p>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 select-none">
                    <span>방문함</span>
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-emerald-500" {...register("visited")} />
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-slate-600">구매 판단</p>
                  <div className="flex flex-wrap gap-1.5">
                    {decisionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                          decisionStatus === option.value
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        onClick={() => setValue("decision_status", option.value, { shouldDirty: true })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {visited ? (
                  <div className="border-t border-slate-100 pt-3.5">
                    <p className="mb-2 text-[13px] font-medium text-slate-600">방문일</p>
                    <input className="toss-input" type="date" {...register("visited_at")} />
                  </div>
                ) : null}
              </article>
            </>
          ) : null}

          {formState.errors.root ? <p className="text-[12px] text-rose-500">{formState.errors.root.message}</p> : null}
          {saveMutation.error ? <p className="text-[12px] text-rose-500">{(saveMutation.error as Error).message}</p> : null}

          {isEditMode ? (
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                type="button"
                className="toss-button-surface w-full gap-1.5 border-slate-200 font-semibold text-rose-500"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleteMutation.isPending ? "삭제 중..." : "매물 기록 삭제"}</span>
              </button>
              <Link to="/" className="toss-button-surface flex w-full items-center justify-center gap-1.5 border-slate-200 font-semibold">
                <ArrowLeft className="h-4 w-4 text-slate-500" />
                <span>목록으로 돌아가기</span>
              </Link>
            </div>
          ) : null}
        </main>
      </form>
    </div>
  );
}
