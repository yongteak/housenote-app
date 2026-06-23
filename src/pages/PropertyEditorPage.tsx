/**
 * @file PropertyEditorPage.tsx
 * @description URL 검색 → 크롤 미리보기 → 평가 입력 → 저장. 토스·Apple HIG 미니멀 플랫 UX.
 * 상단 Sticky Navigation Bar에 취소 및 저장 액션을 제공하여 콘텐츠 공간을 극대화합니다.
 */
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { StarRatingInput } from "../components/StarRatingInput";
import { deleteProperty, getProperty, saveProperty } from "../features/property/property.api";
import { applyCrawlToForm } from "../features/property/property-crawl.mapper";
import { searchPropertyByUrl } from "../features/property/mock-crawl.api";
import { PropertyCrawlPreview } from "../features/property/PropertyCrawlPreview";
import { propertyFormSchema } from "../features/property/property.schema";
import { useAuth } from "../lib/auth-context";
import { formatWon } from "../lib/format";
import type { PropertyCrawlPayload } from "../types/property-crawl";
import type { DecisionStatus, PropertyFormValues, PropertyRecord } from "../types/property";

import Search from "lucide-react/dist/esm/icons/search";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Check from "lucide-react/dist/esm/icons/check";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import X from "lucide-react/dist/esm/icons/x";

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

function toNullableNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      rating_sunlight: record.rating_sunlight,
      rating_environment: record.rating_environment,
      pros: record.pros ?? "",
      cons: record.cons ?? "",
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

  const currentPriceValue = watch("current_price_value");
  const desiredPriceValue = watch("desired_price_value");
  const decisionStatus = watch("decision_status");
  const visited = watch("visited");
  const desiredGap = currentPriceValue != null && desiredPriceValue != null ? currentPriceValue - desiredPriceValue : null;

  const canSave = Boolean(crawlData) && Boolean(watch("title")) && Boolean(watch("address"));

  return (
    <div className="flex flex-col min-h-dvh bg-slate-50/30">
      <form
        className="flex flex-col flex-1"
        onSubmit={handleSubmit((values) => {
          void saveMutation.mutateAsync(values);
        })}
      >
        {/* Apple HIG 내비게이션 바 */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/50 bg-white/95 px-4 backdrop-blur-md">
          <button
            type="button"
            className="text-[15px] font-medium text-slate-500 hover:text-slate-800 transition active:opacity-60"
            onClick={() => navigate("/")}
          >
            취소
          </button>

          <span className="max-w-[50%] truncate text-center text-[15px] font-bold text-slate-950">
            {crawlData?.title ?? (isEditMode ? "매물 상세" : "새 매물")}
          </span>

          <button
            type="submit"
            className="text-[15px] font-bold text-emerald-600 hover:text-emerald-800 disabled:text-slate-300 transition active:opacity-60"
            disabled={!canSave || saveMutation.isPending}
          >
            {saveMutation.isPending ? "저장 중" : "저장"}
          </button>
        </header>

        {/* 메인 폼 바디 */}
        <main className="flex-1 px-4 py-4 space-y-4 pb-20">
          <input type="hidden" {...register("source_url")} />
          <input type="hidden" {...register("title")} />
          <input type="hidden" {...register("deal_type")} />
          <input type="hidden" {...register("address")} />

          {!isEditMode ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  className="toss-input pl-10 text-[14px]"
                  placeholder="네이버 부동산 매물 또는 지도 링크를 복사해 넣으세요"
                  value={searchUrl}
                  onChange={(event) => setSearchUrl(event.target.value)}
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
              <button
                type="button"
                className="toss-button-primary w-full gap-1.5 font-semibold text-[14px]"
                disabled={searchMutation.isPending || !searchUrl.trim()}
                onClick={() => searchMutation.mutate(searchUrl.trim())}
              >
                <span>{searchMutation.isPending ? "매물 정보 파싱 중..." : "매물 정보 불러오기"}</span>
              </button>
            </div>
          ) : null}
          {searchMutation.error ? <p className="text-[12px] text-rose-500">{(searchMutation.error as Error).message}</p> : null}

          {!crawlData && !isEditMode ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 px-4 text-center">
              <p className="text-[13px] font-medium text-slate-400">분석된 매물이 없습니다. 상단에 링크를 입력해 주세요.</p>
            </div>
          ) : null}
          {crawlData ? <PropertyCrawlPreview crawl={crawlData} /> : null}

          {crawlData ? (
            <>
              <article className="toss-card space-y-4 border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <p className="text-[15px] font-bold text-slate-950">빠른 현장 기록</p>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 select-none">
                    <span>현장 방문 완료</span>
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-emerald-500" {...register("visited")} />
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-slate-600">구매 판단 상태</p>
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

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-3.5">
                  <StarRatingInput
                    label="위치 평가 (교통, 학군, 상권)"
                    value={watch("rating_location")}
                    onChange={(value) => setValue("rating_location", value, { shouldDirty: true })}
                  />
                  <StarRatingInput
                    label="가격 경쟁력 (시세 대비 메리트)"
                    value={watch("rating_price")}
                    onChange={(value) => setValue("rating_price", value, { shouldDirty: true })}
                  />
                </div>

                {visited ? (
                  <div className="border-t border-slate-100 pt-3.5">
                    <p className="mb-2 text-[13px] font-medium text-slate-600">실제 임장 방문일</p>
                    <input className="toss-input" type="date" {...register("visited_at")} />
                  </div>
                ) : null}
              </article>

              <button
                type="button"
                className="toss-button-surface w-full text-[13px] gap-1.5 font-semibold border-slate-200"
                onClick={() => setShowAdvanced((prev) => !prev)}
              >
                <span>{showAdvanced ? "평가 · 메모 접기" : "평가 · 메모 더보기"}</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              {showAdvanced ? (
                <article className="toss-card space-y-4 border-slate-200">
                  <div className="border-b border-slate-100 pb-2.5">
                    <p className="text-[15px] font-bold text-slate-950">추가 정성 평가</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <StarRatingInput
                      label="단지 및 내부 인테리어 상태"
                      value={watch("rating_condition")}
                      onChange={(value) => setValue("rating_condition", value, { shouldDirty: true })}
                    />
                    <StarRatingInput
                      label="채광 및 동간 배치/일조량"
                      value={watch("rating_sunlight")}
                      onChange={(value) => setValue("rating_sunlight", value, { shouldDirty: true })}
                    />
                    <StarRatingInput
                      label="인근 자연 및 쾌적성/주변 환경"
                      value={watch("rating_environment")}
                      onChange={(value) => setValue("rating_environment", value, { shouldDirty: true })}
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-3.5">
                    <p className="mb-2 text-[13px] font-medium text-slate-600">나의 희망 구매 가격</p>
                    <input
                      className="toss-input"
                      inputMode="numeric"
                      placeholder="희망 매수 단가를 입력하세요 (예: 750000000)"
                      value={desiredPriceValue ?? ""}
                      onChange={(event) => setValue("desired_price_value", toNullableNumber(event.target.value), { shouldDirty: true })}
                    />
                    {desiredGap != null ? (
                      <p className="mt-2 text-[12.5px] font-medium text-emerald-600 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>현재 등록가 대비 {formatWon(desiredGap)} 세이브 ({Math.round((desiredGap / (currentPriceValue || 1)) * 100)}% 하향 희망)</span>
                      </p>
                  ) : null}
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-3.5">
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-medium text-slate-600">실제 살아본 느낌 또는 특징 요약 (장점)</p>
                      <textarea className="toss-textarea font-medium" rows={3} placeholder="장점들을 기입하세요" {...register("pros")} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-medium text-slate-600">개선이 필요하거나 아쉬운 부분 (단점)</p>
                      <textarea className="toss-textarea font-medium" rows={3} placeholder="단점들을 기입하세요" {...register("cons")} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-medium text-slate-600 font-medium">자유 임장 메모 / 중개업소 특이사항</p>
                      <textarea className="toss-textarea font-medium" rows={4} placeholder="중개사 대화 내용 등 기타 자유 내용 기입" {...register("memo")} />
                    </div>
                  </div>
                </article>
              ) : null}
            </>
          ) : null}

          {formState.errors.root ? <p className="text-[12px] text-rose-500">{formState.errors.root.message}</p> : null}
          {saveMutation.error ? <p className="text-[12px] text-rose-500">{(saveMutation.error as Error).message}</p> : null}

          {isEditMode ? (
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                type="button"
                className="toss-button-surface w-full text-rose-500 font-semibold gap-1.5 border-slate-200"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleteMutation.isPending ? "삭제 중..." : "매물 기록 삭제"}</span>
              </button>
              <Link to="/" className="toss-button-surface w-full font-semibold gap-1.5 border-slate-200">
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
