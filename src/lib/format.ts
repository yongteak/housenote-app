/**
 * @file format.ts
 * @description 숫자 가격/날짜를 모바일 카드에서 읽기 쉬운 형태로 포맷한다.
 */

/**
 * 숫자형 가격을 한국 원화 표기로 변환한다.
 * @param value 숫자 가격
 */
export function formatWon(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * ISO 날짜 문자열을 yyyy-mm-dd로 축약한다.
 * @param value ISO datetime 문자열
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value.slice(0, 10);
}

/**
 * 가격을 억 단위 축약 문자열로 변환한다. (예: 6.9억)
 * @param value 원화 가격
 */
export function formatPriceEok(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  const eok = value / 100_000_000;
  const formatted = Number.isInteger(eok) ? String(eok) : eok.toFixed(1).replace(/\.0$/, "");
  return `${formatted}억`;
}

/**
 * ㎡ 면적을 평형 문자열로 변환한다.
 * @param areaM2 공급면적(㎡)
 */
export function formatPyeong(areaM2: number | null | undefined): string {
  if (areaM2 == null || Number.isNaN(areaM2)) {
    return "-";
  }

  return `${Math.round(areaM2 / 3.3058)}평`;
}
