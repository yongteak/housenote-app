/**
 * @file ComplexPropertyInfo.tsx
 * @description 단지(complex) 크롤 결과 — 메타 정보·매물 수·실거래/매물가 표시.
 */
import { PriceDisplay } from "../../components/PriceDisplay";
import type { ComplexCrawlSnapshot, ComplexRecentRealTrade, PropertyCrawlPayload } from "../../types/property-crawl";
import { getComplexSnapshot, isComplexCrawl } from "../../types/property-crawl-kind";

type ComplexPropertyInfoProps = {
  crawl: PropertyCrawlPayload;
};

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "-";
  }
  return String(value);
}

function formatUseApprovalDate(value: string | null | undefined, elapsedYear?: number | null): string {
  if (!value) {
    return "-";
  }
  const raw = value.replace(/\D/g, "");
  if (raw.length === 8) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const elapsed = elapsedYear != null ? ` (${elapsedYear}년차)` : "";
    return `${y}. ${m}.${elapsed}`;
  }
  return value;
}

function formatParking(parkingInfo: Record<string, unknown> | null | undefined): string {
  if (!parkingInfo || typeof parkingInfo !== "object") {
    return "-";
  }
  const total = parkingInfo.totalParkingCount;
  const perHousehold = parkingInfo.parkingCountPerHousehold;
  if (total == null && perHousehold == null) {
    return "-";
  }
  return `총 ${display(total as number | null)}대 · 세대당 ${display(perHousehold as number | null)}`;
}

function formatBuildingRatio(info: Record<string, unknown> | null | undefined): string {
  if (!info || typeof info !== "object") {
    return "-";
  }
  const far = info.floorAreaRatio;
  const bcr = info.buildingCoverageRatio;
  const parts: string[] = [];
  if (typeof far === "number") {
    parts.push(`용적률 ${far}%`);
  }
  if (typeof bcr === "number") {
    parts.push(`건폐율 ${bcr}%`);
  }
  return parts.length > 0 ? parts.join(" · ") : "-";
}

function formatListingCounts(snapshot: ComplexCrawlSnapshot | null): string | null {
  const counts = snapshot?.listingCounts;
  if (!counts) {
    return null;
  }
  const parts = [
    counts.dealCount != null ? `매매 ${counts.dealCount}` : null,
    counts.leaseDepositCount != null ? `전세 ${counts.leaseDepositCount}` : null,
    counts.leaseMonthlyCount != null ? `월세 ${counts.leaseMonthlyCount}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function TradeOrListingRow({ trade }: { trade: ComplexRecentRealTrade }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">
          {trade.tradeDate ?? "등록 매물"}
          {trade.floor ? ` · ${trade.floor}` : null}
          {trade.pyeongArea != null ? ` · ${Math.round(trade.pyeongArea)}평` : null}
          {trade.areaSupplyM2 != null ? ` · ${trade.areaSupplyM2}㎡` : null}
        </p>
        {trade.dealType ? (
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{trade.dealType}</p>
        ) : null}
      </div>
      <div className="text-right">
        {trade.priceValue != null ? (
          <PriceDisplay value={trade.priceValue} size="sm" className="text-emerald-600" />
        ) : (
          <span className="text-[13px] font-semibold text-slate-800">{trade.priceText ?? "-"}</span>
        )}
      </div>
    </div>
  );
}

export function ComplexPropertyInfo({ crawl }: ComplexPropertyInfoProps) {
  if (!isComplexCrawl(crawl)) {
    return null;
  }

  const snapshot: ComplexCrawlSnapshot | null = getComplexSnapshot(crawl) ?? crawl.metadata?.complexSnapshot ?? null;
  const extras = crawl.metadata?.extras;
  const realTrades = snapshot?.recentRealTrades ?? [];
  const listingPreviews = snapshot?.listingPreviews ?? [];
  const fetchStatus = snapshot?.realTradesFetchStatus;
  const priceSource = snapshot?.priceSource;
  const listingSummary = formatListingCounts(snapshot);

  const tradeRows = realTrades.length > 0 ? realTrades : listingPreviews;
  const tradeSectionTitle = realTrades.length > 0 ? "최근 실거래" : "현재 매물 (최저가 순)";
  const tradeEmptyMessage =
    fetchStatus === "rate_limited"
      ? "실거래 API 요청 제한 — 매물·단지 메타만 표시됩니다."
      : "실거래·매물 내역을 불러오지 못했습니다.";

  return (
    <div className="space-y-3">
      {listingSummary ? (
        <article className="toss-card border-slate-200 p-4">
          <p className="text-[11px] font-medium text-slate-400">등록 매물 수</p>
          <p className="mt-0.5 text-[14px] font-semibold text-slate-900">{listingSummary}</p>
        </article>
      ) : null}

      <article className="toss-card divide-y divide-slate-100 overflow-hidden border-slate-200 p-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400">단지명</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{display(snapshot?.name ?? crawl.title)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">단지번호</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{display(crawl.source_listing_id)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">총 세대</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {display(snapshot?.totalHouseholdNumber ?? extras?.totalHouseholdNumber)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">동 수</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {display(snapshot?.dongCount ?? extras?.dongCount)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">준공</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {formatUseApprovalDate(
                snapshot?.useApprovalDate ?? extras?.useApprovalDate ?? null,
                snapshot?.approvalElapsedYear ?? extras?.approvalElapsedYear,
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">용적률·건폐율</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {formatBuildingRatio(snapshot?.buildingRatioInfo ?? extras?.buildingRatioInfo ?? null)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">주차</p>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {formatParking(snapshot?.parkingInfo ?? extras?.parkingInfo ?? null)}
            </p>
          </div>
          {snapshot?.layerFilter?.pyeongLabel ? (
            <div>
              <p className="text-[11px] font-medium text-slate-400">공유 필터</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">
                {[snapshot.layerFilter.pyeongLabel, snapshot.layerFilter.dealTypeLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}
          {snapshot?.constructionCompany ? (
            <div>
              <p className="text-[11px] font-medium text-slate-400">시공사</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{display(snapshot.constructionCompany)}</p>
            </div>
          ) : null}
        </div>
      </article>

      <article className="toss-card overflow-hidden border-slate-200 p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[13px] font-semibold text-slate-900">{tradeSectionTitle}</p>
          {priceSource === "listing_min" && realTrades.length === 0 ? (
            <p className="mt-0.5 text-[11px] text-slate-500">
              실거래 API 미제공 — 공유 필터(평형)에 맞는 등록 매물 최저가입니다.
            </p>
          ) : null}
          {fetchStatus === "rate_limited" && realTrades.length === 0 && listingPreviews.length === 0 ? (
            <p className="mt-0.5 text-[11px] text-amber-600">{tradeEmptyMessage}</p>
          ) : null}
        </div>
        {tradeRows.length > 0 ? (
          <div className="px-4 pb-1">
            {tradeRows.map((trade, index) => (
              <TradeOrListingRow key={`${trade.tradeDate ?? "l"}-${trade.priceValue ?? index}`} trade={trade} />
            ))}
          </div>
        ) : (
          <p className="px-4 py-4 text-[13px] text-slate-400">{tradeEmptyMessage}</p>
        )}
      </article>
    </div>
  );
}

export function isComplexPropertyCrawl(crawl: PropertyCrawlPayload | null): boolean {
  return crawl != null && isComplexCrawl(crawl);
}
