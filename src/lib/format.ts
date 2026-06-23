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
 * 가격을 억·천·백만원 단위 한글 문자열로 변환한다. 백만원 미만은 버린다.
 * @example formatPriceManwon(1_980_000_000) // "19억 8천만원"
 * @example formatPriceManwon(325_000_000) // "3억 2천 5백만원"
 */
export function formatPriceManwon(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  const manwonUnits = Math.floor(value / 1_000_000);
  if (manwonUnits <= 0) {
    return "-";
  }

  const eok = Math.floor(manwonUnits / 100);
  const remainder = manwonUnits % 100;
  const cheon = Math.floor(remainder / 10);
  const baek = remainder % 10;

  const segments: string[] = [];
  if (eok > 0) {
    segments.push(`${eok}억`);
  }
  if (cheon > 0) {
    segments.push(`${cheon}천`);
  }
  if (baek > 0) {
    segments.push(`${baek}백`);
  }

  if (eok > 0 && cheon === 0 && baek === 0) {
    return `${eok}억`;
  }

  return `${segments.join(" ")}만원`;
}

/**
 * 희망가와 등록가 차이를 자연어 문장으로 만든다.
 * @example formatDesiredPriceNote(1_680_000_000, 1_600_000_000)
 * // "16억에 사고 싶어요. 등록가는 8천만원 더 비싸요."
 */
export function formatDesiredPriceNote(
  currentPrice: number | null | undefined,
  desiredPrice: number | null | undefined,
): string | null {
  if (desiredPrice == null || Number.isNaN(desiredPrice)) {
    return null;
  }

  const desired = formatPriceManwon(desiredPrice);
  if (currentPrice == null || Number.isNaN(currentPrice)) {
    return `${desired}에 사고 싶어요.`;
  }

  const gap = currentPrice - desiredPrice;
  if (gap === 0) {
    return `${desired}에 사고 싶어요. 등록가와 같아요.`;
  }
  if (gap > 0) {
    return `${desired}에 사고 싶어요. 등록가는 ${formatPriceManwon(gap)} 더 비싸요.`;
  }

  return `${desired}에 사고 싶어요. 등록가는 ${formatPriceManwon(-gap)} 더 싸요.`;
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
