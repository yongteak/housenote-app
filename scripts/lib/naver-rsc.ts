export const TRADE: Record<string, string> = { A1: "매매", B1: "전세", B2: "월세", B3: "단기임대" };
export const ESTATE: Record<string, string> = { A01: "아파트", A02: "오피스텔", A03: "빌라", A04: "아파트" };
export const DIRECTION: Record<string, string> = { ES: "남동", WS: "남서", EN: "북동", WN: "북서", S: "남", N: "북", E: "동", W: "서" };

export function extractRscCombined(html: string) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map((m) => m[1] ?? "");
  return {
    chunks,
    combined: chunks.join("").replace(/\\"/g, '"'),
  };
}

export function extractByQueryKey(combined: string, queryKey: string): Record<string, unknown> | null {
  const marker = `"queryKey":["${queryKey}"`;
  const idx = combined.indexOf(marker);
  if (idx < 0) {
    return null;
  }

  const blockStart = combined.lastIndexOf('{"dehydratedAt"', idx);
  const resultPos = combined.indexOf('"result":', blockStart);
  const start = combined.indexOf("{", resultPos);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < combined.length; i += 1) {
    const ch = combined[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(combined.slice(start, i + 1)) as Record<string, unknown>;
      }
    }
  }

  return null;
}

export function listRscQueryKeys(combined: string): string[] {
  return [...new Set([...combined.matchAll(/"queryKey":\["([^"]+)"/g)].map((match) => match[1] ?? ""))].filter(Boolean);
}

export function formatPrice(value: number | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const eok = Math.floor(value / 1e8);
  const man = Math.round((value % 1e8) / 1e4);
  if (eok && man) {
    return `${eok}억 ${man.toLocaleString()}`;
  }
  if (eok) {
    return `${eok}억`;
  }
  return `${man.toLocaleString()}만`;
}

export function getPageTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)/)?.[1]?.trim() ?? null;
}
