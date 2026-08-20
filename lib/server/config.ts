import os from "node:os";
import path from "node:path";

function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

export const serverConfig = {
  version: "1.0.0",
  ytDlpPath: process.env.YT_DLP_PATH || "yt-dlp",
  ytDlpProxy: process.env.YT_DLP_PROXY || "",
  ytDlpFallbackProxy: process.env.YT_DLP_FALLBACK_PROXY || "",
  ytDlpCookies: process.env.YT_DLP_COOKIES || "",
  ytDlpCookiesData: process.env.YT_DLP_COOKIES_DATA || "",
  maxDuration: integer("DOWNLOAD_MAX_DURATION", 7_200, 30, 86_400),
  maxConcurrent: integer("DOWNLOAD_MAX_CONCURRENT", 2, 1, 12),
  jobTtlSeconds: integer("DOWNLOAD_JOB_TTL", 600, 60, 3_600),
  maxJobs: integer("DOWNLOAD_MAX_JOBS", 300, 10, 2_000),
  maxFileBytes:
    integer("DOWNLOAD_MAX_FILE_MB", 250, 10, 2_048) * 1024 * 1024,
  extractionTimeoutMs:
    integer("EXTRACTION_TIMEOUT_SECONDS", 45, 10, 180) * 1_000,
  downloadTimeoutMs:
    integer("DOWNLOAD_TIMEOUT_SECONDS", 600, 30, 3_600) * 1_000,
  rateLimitMax: integer("RATE_LIMIT_MAX", 20, 1, 1_000),
  rateLimitWindowMs: integer("RATE_LIMIT_WINDOW", 60, 1, 3_600) * 1_000,
  tempRoot: process.env.DOWNLOAD_TEMP_DIR || path.join(os.tmpdir(), "final-vora"),
} as const;
