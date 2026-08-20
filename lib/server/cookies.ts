import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const FILE_NAME = "cookies.txt";

let directory: string | undefined;
let file: string | undefined;
let cleanupRegistered = false;

function cleanup() {
  if (directory) {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Best effort: the host's ephemeral /tmp is cleared on container
      // restart either way.
    }
  }
  directory = undefined;
  file = undefined;
}

function registerCleanup() {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  process.once("exit", cleanup);
  process.once("SIGTERM", cleanup);
}

function materialize(inlineData: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "final-vora-cookies-"));
  const target = path.join(dir, FILE_NAME);
  const content = inlineData.endsWith("\n")
    ? inlineData
    : `${inlineData}\n`;
  writeFileSync(target, content, { encoding: "utf8", mode: 0o600 });
  if (process.platform !== "win32") {
    chmodSync(target, 0o600);
    chmodSync(dir, 0o700);
  }
  directory = dir;
  file = target;
  return target;
}

/**
 * Resolve the operator cookie source to a path for `yt-dlp --cookies`.
 *
 * An explicitly configured file (YT_DLP_COOKIES) always wins. On hosts
 * without secret file mounts (e.g. Railway), inline cookie data
 * (YT_DLP_COOKIES_DATA) is written exactly once to a private file — 0600
 * inside a 0700 temp directory — removed at shutdown, and never logged.
 */
export function resolveCookiesPath(
  configuredPath: string,
  inlineData?: string,
): string {
  if (configuredPath) return configuredPath;
  if (!inlineData || !inlineData.trim()) return "";
  if (!file) {
    file = materialize(inlineData);
    registerCleanup();
  }
  return file;
}

/**
 * Remove the materialized cookie file and reset module state. Called on
 * process shutdown and by tests.
 */
export function disposeCookies() {
  cleanup();
}
