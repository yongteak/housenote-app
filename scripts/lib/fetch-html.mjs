/**
 * Lightpanda CLI로 URL HTML을 가져온다.
 */
import { spawnSync } from "node:child_process";

const DEFAULT_LIGHTPANDA = `${process.env.HOME}/.local/bin/lightpanda`;

/**
 * @param {string} sourceUrl
 * @param {{
 *   lightpandaPath?: string;
 *   waitMs?: number;
 *   waitUntil?: string;
 * }} [options]
 * @returns {{ html: string; httpStatus?: number }}
 */
export function fetchHtmlWithLightpanda(sourceUrl, options = {}) {
  const lightpandaPath = options.lightpandaPath ?? process.env.LIGHTPANDA_PATH ?? DEFAULT_LIGHTPANDA;
  const waitMs = options.waitMs ?? 20_000;
  const waitUntil = options.waitUntil ?? "networkidle";

  const result = spawnSync(
    lightpandaPath,
    ["fetch", sourceUrl, "--dump", "html", "--wait-until", waitUntil, "--wait-ms", String(waitMs), "--json"],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  );

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

  const payload = JSON.parse(stdout.slice(jsonStart));
  const html = typeof payload.content === "string" ? payload.content : "";

  if (!html) {
    throw new Error("lightpanda가 HTML을 반환하지 않았습니다.");
  }

  return {
    html,
    httpStatus: payload.http_status,
  };
}
