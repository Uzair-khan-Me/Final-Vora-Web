import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

import { serverConfig } from "./config";
import { resolveCookiesPath } from "./cookies";
import { AppError, classifyYtDlpError } from "./errors";

/**
 * Comma-separated list of YouTube player clients yt-dlp will try, in order,
 * if the default client hits a "Sign in to confirm you're not a bot"
 * challenge. These clients reach YouTube through endpoints that are not
 * challenged as aggressively from datacenter IP ranges.
 */
const BOT_FALLBACK_CLIENTS = ["web_safari", "tv"];

/**
 * Build the common yt-dlp argument list for analyze/download invocations.
 * Honors operator-configured proxy and cookies, and optionally forces a
 * specific YouTube player client via `--extractor-args`.
 *
 * `proxyOverride` lets the bot-fallback path route the request through a
 * different proxy than the primary one (e.g. a residential fallback) without
 * mutating the global config.
 */
function baseArgs(extra?: { playerClient?: string; proxyOverride?: string }) {
  const args = ["--no-config", "--js-runtimes", "node"];
  const proxy = extra?.proxyOverride || serverConfig.ytDlpProxy;
  if (proxy) {
    args.push("--proxy", proxy);
  }
  const cookiesPath = resolveCookiesPath(
    serverConfig.ytDlpCookies,
    serverConfig.ytDlpCookiesData,
  );
  if (cookiesPath) {
    args.push("--cookies", cookiesPath);
  }
  if (extra?.playerClient) {
    args.push("--extractor-args", `youtube:player_client=${extra.playerClient}`);
  }
  return args;
}

export type RawFormat = {
  format_id?: string;
  ext?: string;
  format_note?: string;
  resolution?: string;
  height?: number;
  width?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  protocol?: string;
  tbr?: number;
  abr?: number;
};

export type YtDlpChild = ChildProcessByStdio<null, Readable, Readable>;

export type RawMediaInfo = {
  _type?: string;
  id?: string;
  title?: string;
  description?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  webpage_url?: string;
  original_url?: string;
  extractor?: string;
  extractor_key?: string;
  is_live?: boolean;
  formats?: RawFormat[];
  entries?: unknown[];
};

export function runtimeArgs() {
  return baseArgs();
}

export function spawnYtDlp(
  args: string[],
  opts?: { playerClient?: string; proxyOverride?: string },
): YtDlpChild {
  return spawn(
    serverConfig.ytDlpPath,
    [...baseArgs(opts), ...args],
    {
      detached: process.platform !== "win32",
      env: { ...process.env, NO_COLOR: "1", PYTHONUNBUFFERED: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}

export function terminateChild(
  child: YtDlpChild,
  signal: NodeJS.Signals = "SIGTERM",
) {
  if (child.exitCode !== null || child.killed) return;
  try {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, signal);
    } else {
      child.kill(signal);
    }
  } catch {
    child.kill(signal);
  }
}

export function runYtDlpJson(
  url: string,
  signal?: AbortSignal,
): Promise<RawMediaInfo> {
  return runWithBotFallback((playerClient, proxyOverride) => {
    const opts: { playerClient?: string; proxyOverride?: string } = {};
    if (playerClient) opts.playerClient = playerClient;
    if (proxyOverride) opts.proxyOverride = proxyOverride;
    return runOne(url, signal, opts);
  });
}

function runOne(
  url: string,
  signal: AbortSignal | undefined,
  opts?: { playerClient?: string; proxyOverride?: string },
): Promise<RawMediaInfo> {
  return new Promise((resolve, reject) => {
    const child = spawnYtDlp(
      [
        "--dump-single-json",
        "--no-playlist",
        "--playlist-items",
        "1",
        "--skip-download",
        "--no-warnings",
        "--socket-timeout",
        "15",
        "--retries",
        "2",
        "--extractor-retries",
        "2",
        "--",
        url,
      ],
      opts,
    );

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => {
      terminateChild(child, "SIGKILL");
      finish(() =>
        reject(new AppError("CANCELLED", "The analysis was cancelled.", 499)),
      );
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      terminateChild(child, "SIGKILL");
    }, serverConfig.extractionTimeoutMs);

    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > 8 * 1024 * 1024) {
        stderr += "\nMetadata output exceeded the safe limit";
        terminateChild(child, "SIGKILL");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-64 * 1024);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") {
          reject(
            new AppError(
              "ENGINE_MISSING",
              "The media engine is unavailable on this server.",
              503,
            ),
          );
        } else {
          reject(classifyYtDlpError(error.message));
        }
      });
    });
    child.on("close", (code) => {
      finish(() => {
        if (code !== 0) {
          reject(classifyYtDlpError(stderr, timedOut));
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as RawMediaInfo;
          if (!parsed || typeof parsed !== "object") throw new Error("invalid");
          resolve(parsed);
        } catch {
          reject(
            new AppError(
              "UNAVAILABLE_MEDIA",
              "The source returned unreadable media information.",
              502,
            ),
          );
        }
      });
    });
  });
}

/**
 * True when a failure looks like the source platform blocking this server's
 * network (rather than the media being gone). Both an explicit bot challenge
 * (BOT_VERIFICATION) and a hard network/TLS reset (NETWORK_ERROR) qualify:
 * TikTok, for example, drops datacenter IPs at the TLS layer instead of
 * serving a challenge page.
 */
function isBlockedBySource(error: unknown): error is AppError {
  return (
    error instanceof AppError &&
    (error.code === "BOT_VERIFICATION" || error.code === "NETWORK_ERROR")
  );
}

function isBotChallenge(error: unknown): error is AppError {
  return error instanceof AppError && error.code === "BOT_VERIFICATION";
}

/**
 * Run an analyze attempt and, if the source blocks this server (YouTube's
 * bot-verification challenge, or a network/TLS reset like TikTok's datacenter
 * block), retry automatically. For a bot challenge we first alternate
 * YouTube player clients — `web_safari` and `tv` reach YouTube through
 * endpoints that are not challenged as aggressively — and, if configured, we
 * finally retry through a fallback residential/mobile proxy. A network/TLS
 * block skips the player clients (they are YouTube-specific) and goes
 * straight to the fallback proxy. Most blocked requests succeed on the first
 * retry.
 */
async function runWithBotFallback(
  attempt: (
    playerClient?: string,
    proxyOverride?: string,
  ) => Promise<RawMediaInfo>,
): Promise<RawMediaInfo> {
  let lastBlock: AppError | undefined;
  try {
    return await attempt();
  } catch (error) {
    if (!isBlockedBySource(error)) throw error;
    lastBlock = error;
  }

  if (isBotChallenge(lastBlock)) {
    for (const client of BOT_FALLBACK_CLIENTS) {
      // Small backoff so we don't double-strike a rate-limited window.
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      try {
        return await attempt(client);
      } catch (error) {
        if (!isBlockedBySource(error)) throw error;
        lastBlock = error;
      }
    }
  }

  // Last resort: a residential/mobile proxy the operator only wants to use
  // for failed requests. We pass it as a per-call override so we never
  // mutate the (frozen) global config.
  if (serverConfig.ytDlpFallbackProxy && !serverConfig.ytDlpProxy) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    try {
      return await attempt(undefined, serverConfig.ytDlpFallbackProxy);
    } catch (error) {
      if (!isBlockedBySource(error)) throw error;
      lastBlock = error;
    }
  }

  if (isBotChallenge(lastBlock)) {
    // All attempts exhausted. Surface a stable, generic message — the proxy
    // URL (if any) is never included.
    throw new AppError(
      "BOT_VERIFICATION",
      "The source's platform challenged this server. We retried automatically with a fallback path. Try again in a few minutes, or ask the operator to configure approved cookies or a residential proxy.",
      502,
    );
  }

  // A network/TLS block with no usable fallback: keep the accurate message.
  throw lastBlock;
}
