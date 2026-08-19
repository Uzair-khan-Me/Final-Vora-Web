import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";

import { serverConfig } from "./config";
import { AppError, classifyYtDlpError } from "./errors";

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
  const args = ["--no-config", "--js-runtimes", "node"];
  if (serverConfig.ytDlpProxy) {
    args.push("--proxy", serverConfig.ytDlpProxy);
  }
  if (serverConfig.ytDlpCookies) {
    args.push("--cookies", serverConfig.ytDlpCookies);
  }
  return args;
}

export function spawnYtDlp(args: string[]): YtDlpChild {
  return spawn(serverConfig.ytDlpPath, [...runtimeArgs(), ...args], {
    detached: process.platform !== "win32",
    env: { ...process.env, NO_COLOR: "1", PYTHONUNBUFFERED: "1" },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
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
  return new Promise((resolve, reject) => {
    const child = spawnYtDlp([
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
    ]);

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
