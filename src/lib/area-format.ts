/**
 * @file area-format.ts
 * @description 평/㎡ 변환 및 매물 제목·확인매물 날짜 포맷.
 */

const M2_PER_PYEONG = 3.3058;

/** 면적 표시 단위 */
export type AreaUnit = "pyeong" | "m2";

/**
 * ㎡를 평으로 변환한다.
 * @param m2 제곱미터
 */
export function m2ToPyeong(m2: number): number {
  return m2 / M2_PER_PYEONG;
}

/**
 * 평수를 반올림해 표시용 문자열로 만든다.
 * @param pyeong 평수
 */
export function formatPyeongRounded(pyeong: number): string {
  return String(Math.round(pyeong));
}

/**
 * ISO 날짜를 네이버 확인매물 형식으로 변환한다.
 * @param isoDate YYYY-MM-DD
 */
export function formatVerificationDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${year}. ${month}. ${day}.`;
}

/**
 * 매물 제목에 평수를 포함한다.
 * @param parts 제목 구성 요소 (단지명, 동, 층 등)
 * @param pyeongArea 공급 평수
 */
export function buildPropertyTitle(parts: (string | null | undefined)[], pyeongArea?: number | null): string {
  const base = parts.filter(Boolean).join(" · ");
  if (pyeongArea == null) {
    return base;
  }
  const pyeongLabel = `${formatPyeongRounded(pyeongArea)}평`;
  if (base.includes("평")) {
    return base;
  }
  return base ? `${base} · ${pyeongLabel}` : pyeongLabel;
}

/**
 * 면적·층·향 한 줄 요약을 단위에 맞게 반환한다.
 */
export function formatAreaSpecLine(options: {
  unit: AreaUnit;
  supplyM2?: number | null;
  exclusiveM2?: number | null;
  pyeongArea?: number | null;
  floorInfo?: string | null;
  direction?: string | null;
}): string {
  const { unit, supplyM2, exclusiveM2, pyeongArea, floorInfo, direction } = options;

  let areaPart = "-";
  if (unit === "pyeong") {
    const supply = pyeongArea != null ? formatPyeongRounded(pyeongArea) : supplyM2 != null ? formatPyeongRounded(m2ToPyeong(supplyM2)) : null;
    const exclusive = exclusiveM2 != null ? formatPyeongRounded(m2ToPyeong(exclusiveM2)) : null;
    if (supply != null) {
      areaPart = exclusive != null ? `${supply}평 (전용${exclusive})` : `${supply}평`;
    }
  } else if (supplyM2 != null) {
    areaPart =
      exclusiveM2 != null
        ? `${supplyM2}㎡ (전용${exclusiveM2})`
        : `${supplyM2}㎡`;
  }

  return [areaPart, floorInfo, direction].filter(Boolean).join(" | ");
}
