import { spawnSync } from "node:child_process";

const DEFAULT_LIGHTPANDA = `${process.env.HOME}/.local/bin/lightpanda`;

export type FetchHtmlOptions = {
  lightpandaPath?: string;
  waitMs?: number;
  waitUntil?: string;
  /** Lightpanda --inject-script-file (페이지 컨텍스트 API 호출 등) */
  injectScriptFile?: string;
  /** Lightpanda --wait-script (truthy 될 때까지 대기) */
  waitScript?: string;
  /** Lightpanda --terminate-ms */
  terminateMs?: number;
};

export type FetchHtmlResult = {
  html: string;
  httpStatus?: number;
  /** Lightpanda가 리다이렉트를 따라간 최종 URL */
  finalUrl: string;
};

type LightpandaFetchPayload = {
  content?: string;
  http_status?: number;
  url?: string;
};

export function fetchHtmlWithLightpanda(sourceUrl: string, options: FetchHtmlOptions = {}): FetchHtmlResult {
  const lightpandaPath = options.lightpandaPath ?? process.env.LIGHTPANDA_PATH ?? DEFAULT_LIGHTPANDA;
  const waitMs = options.waitMs ?? 20_000;
  const waitUntil = options.waitUntil ?? "networkidle";

  const args = [
    "fetch",
    sourceUrl,
    "--dump",
    "html",
    "--wait-until",
    waitUntil,
    "--wait-ms",
    String(waitMs),
    "--json",
  ];

  if (options.injectScriptFile) {
    args.push("--inject-script-file", options.injectScriptFile);
  }
  if (options.waitScript) {
    args.push("--wait-script", options.waitScript);
  }
  if (typeof options.terminateMs === "number") {
    args.push("--terminate-ms", String(options.terminateMs));
  }

  const result = spawnSync(lightpandaPath, args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`lightpanda 실행 실패: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr || `lightpanda exit code ${result.status}`);
  }

  const stdout = result.stdout ?? "";
  const jsonStart = stdout.indexOf("{");
  if (jsonStart === -1) {
    throw new Error("lightpanda JSON 출력을 찾지 못했습니다.");
  }

  const payload = JSON.parse(stdout.slice(jsonStart)) as LightpandaFetchPayload;
  const html = typeof payload.content === "string" ? payload.content : "";

  if (!html) {
    throw new Error("lightpanda가 HTML을 반환하지 않았습니다.");
  }

  return {
    html,
    httpStatus: payload.http_status,
    finalUrl: payload.url ?? sourceUrl,
  };
}
