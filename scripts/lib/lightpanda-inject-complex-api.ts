/** Lightpanda 페이지 컨텍스트에서 fin.land front-api 호출 → HTML에 JSON 삽입 */

export const COMPLEX_API_MARKER_ID = "hnote-crawl-api-data";

export type ComplexInjectedArticleCounts = {
  dealCount?: number | null;
  leaseDepositCount?: number | null;
  leaseMonthlyCount?: number | null;
  leaseShortTerm?: number | null;
};

export type ComplexInjectedApiPayload = {
  complexId: string;
  pyeongTypeNumber: string | null;
  tradeType: string;
  fetchedAt: string;
  articleCounts: ComplexInjectedArticleCounts | null;
  articleCountsFiltered: ComplexInjectedArticleCounts | null;
  articles: Record<string, unknown>[];
  errors: string[];
};

function escapeForJsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Lightpanda --inject-script-file 에 넣을 IIFE 본문 */
export function buildComplexApiInjectScript(options: {
  complexId: string;
  pyeongTypeNumber: string | null;
  tradeType: string;
  articleTradeTypes: string[];
}): string {
  const complexId = escapeForJsString(options.complexId);
  const pyeong = options.pyeongTypeNumber ? escapeForJsString(options.pyeongTypeNumber) : "";
  const trade = escapeForJsString(options.tradeType || "A1");
  const tradeTypesJson = JSON.stringify(options.articleTradeTypes.length ? options.articleTradeTypes : ["A1"]);

  return `
(function () {
  var MARKER_ID = "${COMPLEX_API_MARKER_ID}";
  var COMPLEX_ID = "${complexId}";
  var PYEONG_RAW = "${pyeong}";
  var TRADE = "${trade}";
  var TRADE_TYPES = ${tradeTypesJson};

  function writePayload(payload) {
    var el = document.getElementById(MARKER_ID);
    if (!el) {
      el = document.createElement("script");
      el.id = MARKER_ID;
      el.type = "application/json";
      document.documentElement.appendChild(el);
    }
    el.textContent = JSON.stringify(payload);
    window.__HNOTE_COMPLEX_API_DONE__ = true;
  }

  function parseJsonResponse(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  function apiGet(path) {
    return fetch(location.origin + path, {
      credentials: "include",
      headers: { Accept: "application/json" },
    }).then(function (res) {
      return res.text().then(function (text) {
        return { ok: res.ok, status: res.status, json: parseJsonResponse(text), text: text };
      });
    });
  }

  function apiPost(path, body) {
    return fetch(location.origin + path, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.text().then(function (text) {
        return { ok: res.ok, status: res.status, json: parseJsonResponse(text), text: text };
      });
    });
  }

  function pyeongNum() {
    var n = Number(PYEONG_RAW);
    return Number.isFinite(n) ? n : null;
  }

  function matchesPyeongFilter(spaceInfo) {
    if (!PYEONG_RAW || !spaceInfo) return true;
    var supply = spaceInfo.supplySpace;
    if (typeof supply !== "number") return false;
    var typeNum = Number(PYEONG_RAW);
    if (!Number.isFinite(typeNum)) return true;
    // transactionPyeongTypeNumber(예: 39)는 네이버 평형 코드 — 공급㎡ ≈ code × 2.05 전후
    var center = typeNum * 2.05;
    return supply >= center - 2.5 && supply <= center + 2.5;
  }

  function articleListBody(tradeTypes, pyeongTypes) {
    return {
      complexNumber: COMPLEX_ID,
      tradeTypes: tradeTypes,
      pyeongTypes: pyeongTypes,
      dongNumbers: [],
      userChannelType: "PC",
      articleSortType: "PRICE_ASC",
      size: 30,
      lastInfo: [],
      seed: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    };
  }

  function run() {
    var errors = [];
    var pyeongTypes = [];
    if (PYEONG_RAW) {
      var pn = Number(PYEONG_RAW);
      if (Number.isFinite(pn)) pyeongTypes.push(pn);
    }

    Promise.all([
      apiGet("/front-api/v1/complex/article/count?complexNumber=" + encodeURIComponent(COMPLEX_ID)),
      pyeongTypes.length
        ? apiGet(
            "/front-api/v1/complex/article/count?complexNumber=" +
              encodeURIComponent(COMPLEX_ID) +
              "&pyeongTypeNumber=" +
              encodeURIComponent(PYEONG_RAW) +
              "&tradeType=" +
              encodeURIComponent(TRADE),
          )
        : Promise.resolve(null),
      apiPost("/front-api/v1/complex/article/list", articleListBody(TRADE_TYPES, [])),
    ])
      .then(function (results) {
        var countRes = results[0];
        var countFilteredRes = results[1];
        var listRes = results[2];

        var articleCounts = null;
        if (countRes && countRes.json && countRes.json.isSuccess && countRes.json.result) {
          articleCounts = countRes.json.result;
        } else if (countRes) {
          errors.push("article/count:" + countRes.status);
        }

        var articleCountsFiltered = null;
        if (countFilteredRes && countFilteredRes.json && countFilteredRes.json.isSuccess && countFilteredRes.json.result) {
          articleCountsFiltered = countFilteredRes.json.result;
        }

        var articles = [];
        if (listRes && listRes.json && listRes.json.isSuccess && listRes.json.result && Array.isArray(listRes.json.result.list)) {
          var list = listRes.json.result.list;
          for (var i = 0; i < list.length; i += 1) {
            var rep = list[i] && list[i].representativeArticleInfo;
            if (!rep) continue;
            if (!matchesPyeongFilter(rep.spaceInfo)) continue;
            articles.push(rep);
          }
        } else if (listRes) {
          errors.push("article/list:" + listRes.status);
        }

        writePayload({
          complexId: COMPLEX_ID,
          pyeongTypeNumber: PYEONG_RAW || null,
          tradeType: TRADE,
          fetchedAt: new Date().toISOString(),
          articleCounts: articleCounts,
          articleCountsFiltered: articleCountsFiltered,
          articles: articles,
          errors: errors,
        });
      })
      .catch(function (err) {
        writePayload({
          complexId: COMPLEX_ID,
          pyeongTypeNumber: PYEONG_RAW || null,
          tradeType: TRADE,
          fetchedAt: new Date().toISOString(),
          articleCounts: null,
          articleCountsFiltered: null,
          articles: [],
          errors: [String(err)],
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
`.trim();
}

export function parseInjectedComplexApiPayload(html: string): ComplexInjectedApiPayload | null {
  const pattern = new RegExp(
    `id="${COMPLEX_API_MARKER_ID}"[^>]*>([\\s\\S]*?)<\\/script>`,
    "i",
  );
  const match = html.match(pattern);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]) as ComplexInjectedApiPayload;
  } catch {
    return null;
  }
}
