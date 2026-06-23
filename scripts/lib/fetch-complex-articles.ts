type ComplexArticleListPayload = {
  complexNumber: string;
  tradeTypes: string[];
  pyeongTypes: number[];
  dongNumbers: string[];
  userChannelType: "PC";
  articleSortType: "PRICE_ASC";
  size: number;
  lastInfo: unknown[];
  seed: string;
};

type RepresentativeArticleInfo = {
  articleNumber?: string;
  complexName?: string;
  priceInfo?: { dealPrice?: number; depositPrice?: number };
  spaceInfo?: { pyeongTypeNumber?: number };
};

type ComplexArticleListItem = {
  representativeArticleInfo?: RepresentativeArticleInfo;
};

type ComplexArticleListResponse = {
  isSuccess?: boolean;
  result?: {
    list?: ComplexArticleListItem[];
    totalCount?: number;
  };
};

const API_URL = "https://fin.land.naver.com/front-api/v1/complex/article/list";

function buildCookieHeader(): string {
  const ts = Date.now();
  return `PROP_TEST_KEY=${ts}.session; PROP_TEST_ID=land_session`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseTradeTypes(searchParams: Record<string, string> | undefined): string[] {
  const primary = searchParams?.transactionTradeType;
  if (primary) {
    return [primary];
  }
  const multi = searchParams?.articleTradeTypes;
  if (multi) {
    return multi.split("-").filter(Boolean);
  }
  return ["A1"];
}

export type ComplexArticleCandidate = {
  articleId: string;
  complexName: string | null;
  price: number | null;
  pyeongTypeNumber: number | null;
};

export async function fetchComplexArticleCandidates(
  complexId: string,
  searchParams: Record<string, string> | undefined,
): Promise<ComplexArticleCandidate[]> {
  const pyeongRaw = searchParams?.transactionPyeongTypeNumber;
  const pyeongTypes = pyeongRaw ? [Number(pyeongRaw)].filter((n) => Number.isFinite(n)) : [];
  const tradeTypes = parseTradeTypes(searchParams);

  const payload: ComplexArticleListPayload = {
    complexNumber: complexId,
    tradeTypes,
    pyeongTypes,
    dongNumbers: [],
    userChannelType: "PC",
    articleSortType: "PRICE_ASC",
    size: 20,
    lastInfo: [],
    seed: crypto.randomUUID(),
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: "https://fin.land.naver.com/",
        Origin: "https://fin.land.naver.com",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Cookie: buildCookieHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      await sleep(8000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      throw new Error(`매물 목록 API 오류(${response.status})`);
    }

    const data = (await response.json()) as ComplexArticleListResponse;
    if (!data.isSuccess) {
      throw new Error("매물 목록 API 응답 실패");
    }

    const list = data.result?.list ?? [];
    return list
      .map((item) => item.representativeArticleInfo)
      .filter((rep): rep is RepresentativeArticleInfo => Boolean(rep?.articleNumber))
      .map((rep) => ({
        articleId: rep.articleNumber ?? "",
        complexName: rep.complexName ?? null,
        price: rep.priceInfo?.dealPrice ?? rep.priceInfo?.depositPrice ?? null,
        pyeongTypeNumber: rep.spaceInfo?.pyeongTypeNumber ?? null,
      }))
      .filter((item) => item.articleId);
  }

  throw new Error(
    "네이버 매물 목록 API 요청 제한(429)입니다. 1~2분 후 다시 시도하거나, 매물 카드에서 「공유」한 article_detail 링크를 사용해 주세요.",
  );
}

export function pickSingleArticleCandidate(
  candidates: ComplexArticleCandidate[],
  searchParams: Record<string, string> | undefined,
  options: { pickFirst?: boolean } = {},
): ComplexArticleCandidate {
  if (candidates.length === 0) {
    const pyeong = searchParams?.transactionPyeongTypeNumber;
    const trade = searchParams?.transactionTradeType ?? searchParams?.articleTradeTypes;
    throw new Error(
      `조건에 맞는 매물이 없습니다${pyeong ? ` (${pyeong}평` : ""}${trade ? ` · ${trade})` : pyeong ? ")" : ""}.`,
    );
  }

  if (candidates.length === 1 || options.pickFirst) {
    return candidates[0]!;
  }

  const preview = candidates
    .slice(0, 3)
    .map((item) => item.articleId)
    .join(", ");
  const pyeong = searchParams?.transactionPyeongTypeNumber;
  const trade = searchParams?.transactionTradeType ?? "A1";
  throw new Error(
    `네이버 공유 링크가 단지+필터(${pyeong ? `${pyeong}평 · ` : ""}${trade}) 형식이라 매물이 ${candidates.length}건입니다. ` +
      `특정 매물 카드에서 「공유」하거나 --pick-first 로 최저가 1건을 선택하세요. (예: ${preview}${candidates.length > 3 ? "…" : ""})`,
  );
}
