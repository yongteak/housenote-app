/**
 * @file PropertyCrawlPreview.tsx
 * @description 크롤된 매물 정보 미리보기. Apple HIG 가이드라인을 따르는 미니멀하고 논리적인 정보 아키텍처.
 */
import { lazy, Suspense, useState } from "react";

import { CollapsibleSection } from "../../components/CollapsibleSection";
import { formatWon } from "../../lib/format";
import {
  type AreaUnit,
  formatAreaSpecLine,
  formatVerificationDate,
} from "../../lib/area-format";
import type { PropertyCrawlPayload } from "../../types/property-crawl";

import MapPin from "lucide-react/dist/esm/icons/map-pin";

const PropertyLocationMap = lazy(() =>
  import("./PropertyLocationMap").then((module) => ({ default: module.PropertyLocationMap })),
);
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Home from "lucide-react/dist/esm/icons/home";
import Compass from "lucide-react/dist/esm/icons/compass";
import Building from "lucide-react/dist/esm/icons/building";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Info from "lucide-react/dist/esm/icons/info";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";

type PropertyCrawlPreviewProps = {
  crawl: PropertyCrawlPayload;
};

type VerificationInfo = {
  verificationType?: string;
  articleConfirmDate?: string;
  exposureStartDate?: string;
};

/**
 * 값이 없으면 대시를 반환한다.
 */
function display(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "-";
  }
  return String(value);
}

/**
 * iOS 스타일의 세그먼티드 컨트롤 (평 / ㎡ 토글)
 */
function AreaUnitToggle({ unit, onChange }: { unit: AreaUnit; onChange: (unit: AreaUnit) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-0.5 border border-slate-200/40">
      <button
        type="button"
        className={`min-w-[2.25rem] rounded-md px-2. py-0.5 text-[11px] font-semibold transition-all duration-150 ${
          unit === "pyeong" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
        onClick={() => onChange("pyeong")}
      >
        평
      </button>
      <button
        type="button"
        className={`min-w-[2.25rem] rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all duration-150 ${
          unit === "m2" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
        }`}
        onClick={() => onChange("m2")}
      >
        ㎡
      </button>
    </div>
  );
}

/**
 * 키-값 행 (Apple HIG Table Row 스타일)
 */
function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-1.5 last:pb-1.5">
      <span className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
        {label}
      </span>
      <span className="text-right text-[13px] font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function PropertyCrawlPreview({ crawl }: PropertyCrawlPreviewProps) {
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("pyeong");

  const extras = crawl.metadata?.extras;
  const complex = crawl.metadata?.complex as Record<string, unknown> | undefined;
  const feature = extras?.articleFeatureDescription;
  const description = extras?.articleDescription?.replace(/\\n/g, "\n");
  const verification = extras?.verificationInfo as VerificationInfo | undefined;
  const confirmDate = verification?.articleConfirmDate ?? verification?.exposureStartDate;

  const specLine = formatAreaSpecLine({
    unit: areaUnit,
    supplyM2: crawl.area_supply_m2,
    exclusiveM2: crawl.area_private_m2,
    pyeongArea: extras?.pyeongArea,
    floorInfo: crawl.floor_info,
    direction: crawl.direction,
  });

  const exclusiveRatio =
    crawl.area_supply_m2 && crawl.area_private_m2
      ? Math.round((crawl.area_private_m2 / crawl.area_supply_m2) * 100)
      : null;

  const areaDisplay =
    areaUnit === "pyeong"
      ? crawl.area_supply_m2 != null && crawl.area_private_m2 != null
        ? `${(crawl.area_supply_m2 / 3.3058).toFixed(0)}평 / ${(crawl.area_private_m2 / 3.3058).toFixed(0)}평`
        : "-"
      : crawl.area_supply_m2 != null && crawl.area_private_m2 != null
        ? `${crawl.area_supply_m2}㎡ / ${crawl.area_private_m2}㎡`
        : "-";

  return (
    <div className="space-y-4">
      {/* 단일 핵심 정보 카드 - HIG 관점의 논리적 레이아웃 통합 */}
      <article className="toss-card border-slate-200/80 p-5 space-y-4.5 bg-white">
        {/* 상단 메타 칩스 - 동일한 스타일 언어로 통일하여 시각적 복잡도 최소화 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/40 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {crawl.property_type ?? "아파트"}
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/40 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {crawl.deal_type ?? "매매"}
          </span>
          {extras?.redevelopmentLabel ? (
            <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/40 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {extras.redevelopmentLabel}
            </span>
          ) : null}
          {extras?.isDirectTrade ? (
            <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/40 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              직거래
            </span>
          ) : null}
        </div>

        {/* 타이틀 및 주소 정보 */}
        <div className="space-y-1">
          <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
            {crawl.title}
          </h2>
          <div className="flex items-center gap-1 text-[13px] text-slate-400 font-medium">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{crawl.address}</span>
          </div>
        </div>

        {/* 거래가격 정보 */}
        <div className="pt-1.5 border-t border-slate-100 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">등록 가격</span>
          <div className="text-right">
            <p className="text-[26px] font-extrabold tracking-tight text-slate-950 leading-none">
              {crawl.current_price_text ?? formatWon(crawl.current_price_value)}
            </p>
            {crawl.current_price_text && crawl.current_price_value != null ? (
              <p className="text-[11px] text-slate-400 mt-1">({formatWon(crawl.current_price_value)})</p>
            ) : null}
          </div>
        </div>

        {/* 스펙 섹션 및 세그먼트 컨트롤 */}
        <div className="pt-3.5 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">매물 정보</span>
            <AreaUnitToggle unit={areaUnit} onChange={setAreaUnit} />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">공급 / 전용면적</span>
              <span className="text-[13.5px] font-bold text-slate-800">{areaDisplay}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">전용률</span>
              <span className="text-[13.5px] font-bold text-slate-800">
                {exclusiveRatio != null ? `${exclusiveRatio}%` : "-"}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">층수 / 방향</span>
              <span className="text-[13.5px] font-bold text-slate-800">
                {crawl.floor_info ?? "-"} · {crawl.direction ?? "-"}향
              </span>
            </div>
            {confirmDate ? (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">네이버 검증일</span>
                <span className="text-[13.5px] font-bold text-rose-600 flex items-center gap-1">
                  {formatVerificationDate(confirmDate)}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 한줄 특징 요약 */}
        {feature ? (
          <div className="pt-3.5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">특징</span>
            <p className="text-[13px] leading-relaxed text-slate-700 font-medium bg-slate-50 rounded-xl p-3 border border-slate-100">
              {feature}
            </p>
          </div>
        ) : null}
      </article>

      {/* 위치 지도 — 기본 정보 아래 */}
      <Suspense
        fallback={
          <div className="h-44 animate-pulse rounded-xl border border-slate-200/80 bg-slate-100" />
        }
      >
        <PropertyLocationMap crawl={crawl} />
      </Suspense>

      {/* 매물 상세 정보 아코디언 */}
      <CollapsibleSection title="매물 상세" summary={crawl.floor_info ?? "층·면적·입주"}>
        <div className="divide-y divide-slate-100">
          <InfoRow label="매물번호" value={display(crawl.source_listing_id)} icon={Info} />
          <InfoRow label="층" value={display(crawl.floor_info)} icon={Building} />
          <InfoRow label="방/욕실" value={`${display(extras?.roomCount)} / ${display(extras?.bathRoomCount)}`} icon={Home} />
          <InfoRow
            label="입주"
            value={
              extras?.movingInInfo && typeof extras.movingInInfo === "object" && "movingInNegotiation" in extras.movingInInfo
                ? extras.movingInInfo.movingInNegotiation
                  ? "협의 가능"
                  : "즉시"
                : "-"
            }
            icon={Calendar}
          />
        </div>
      </CollapsibleSection>

      {/* 단지 정보 아코디언 */}
      <CollapsibleSection
        title="단지 정보"
        summary={typeof complex?.name === "string" ? complex.name : crawl.property_type ?? undefined}
      >
        <div className="divide-y divide-slate-100">
          <InfoRow label="단지명" value={display(complex?.name as string)} icon={Building} />
          <InfoRow label="총 세대" value={display(extras?.totalHouseholdNumber)} icon={Building} />
          <InfoRow label="준공" value={display(extras?.useApprovalDate)} icon={Calendar} />
          <InfoRow
            label="주차"
            value={
              extras?.parkingInfo && typeof extras.parkingInfo === "object"
                ? `총 ${(extras.parkingInfo as { totalParkingCount?: number }).totalParkingCount ?? "-"}대 · 세대당 ${(extras.parkingInfo as { parkingCountPerHousehold?: number }).parkingCountPerHousehold ?? "-"}`
                : "-"
            }
            icon={Compass}
          />
        </div>
      </CollapsibleSection>

      {/* 중개사 상세 설명 아코디언 */}
      {description ? (
        <CollapsibleSection title="중개사 설명" summary="상세 광고문">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">{description}</p>
        </CollapsibleSection>
      ) : null}

      {/* 원본 페이지 아웃링크 */}
      <a
        href={crawl.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3.5 text-[13px] font-semibold text-slate-700 transition active:bg-slate-100"
      >
        <ExternalLink className="h-4 w-4" />
        <span>네이버 부동산에서 원본 링크 열기</span>
      </a>
    </div>
  );
}
