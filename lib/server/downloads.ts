import { mkdir, mkdtemp, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { capacity } from "./capacity";
import { serverConfig } from "./config";
import { AppError, classifyYtDlpError } from "./errors";
import type { DownloadJob } from "./jobs";
import { removeDownloadJob } from "./jobs";
import { spawnYtDlp, terminateChild, type YtDlpChild } from "./yt-dlp";

const activeChildren = new Map<string, YtDlpChild>();

export function startMergedDownload(job: DownloadJob) {
  const release = capacity.acquire();
  void prepareMergedDownload(job).finally(release);
}

async function prepareMergedDownload(job: DownloadJob) {
  let child: YtDlpChild | undefined;
  try {
    await mkdir(serverConfig.tempRoot, { recursive: true, mode: 0o700 });
    const tempDir = await mkdtemp(path.join(serverConfig.tempRoot, "job-"));
    job.tempDir = tempDir;
    const selector = `${job.selection.formatId}+${job.selection.audioFormatId}`;
    const outputTemplate = path.join(tempDir, "media.%(ext)s");

    child = spawnYtDlp([
      "--no-playlist",
      "--no-warnings",
      "--socket-timeout",
      "20",
      "--retries",
      "2",
      "--fragment-retries",
      "3",
      "--max-filesize",
      String(serverConfig.maxFileBytes),
      "--match-filter",
      `!is_live & duration <= ${serverConfig.maxDuration}`,
      "--newline",
      "--progress-template",
      "download:%(progress._percent_str)s",
      "--format",
      selector,
      "--merge-output-format",
      job.selection.extension,
      "--output",
      outputTemplate,
      "--",
      job.url,
    ]);
    activeChildren.set(job.id, child);

    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const match of text.matchAll(/download:\s*([\d.]+)%/g)) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) job.progress = Math.max(5, Math.min(90, value * 0.9));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString("utf8")).slice(-64 * 1024);
    });

    const code = await new Promise<number | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        timedOut = true;
        terminateChild(child!, "SIGKILL");
      }, serverConfig.downloadTimeoutMs);
      child!.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child!.once("close", (exitCode) => {
        clearTimeout(timeout);
        resolve(exitCode);
      });
    });

    if (code !== 0) {
      if (timedOut) {
        throw new AppError(
          "DOWNLOAD_TIMEOUT",
          "Preparing this file exceeded the server time limit.",
          504,
        );
      }
      throw classifyYtDlpError(stderr);
    }

    job.progress = 95;
    const entries = await readdir(tempDir);
    const candidates = entries.filter(
      (entry) => entry.startsWith("media.") && !entry.endsWith(".part"),
    );
    if (!candidates.length) {
      throw new AppError(
        "UNAVAILABLE_MEDIA",
        "The media engine finished without producing a file.",
        502,
      );
    }
    const outputPath = path.join(tempDir, candidates[0]!);
    const outputStat = await stat(outputPath);
    if (!outputStat.isFile() || outputStat.size > serverConfig.maxFileBytes) {
      throw new AppError(
        "STORAGE_EXHAUSTED",
        "The prepared file exceeds this server's temporary-file limit.",
        413,
      );
    }

    job.outputPath = outputPath;
    job.status = "ready";
    job.progress = 100;
    job.expiresAt = Date.now() + serverConfig.jobTtlSeconds * 1_000;
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : classifyYtDlpError(error instanceof Error ? error.message : "");
    job.status = "failed";
    job.error = { code: appError.code, message: appError.message };
    job.expiresAt = Date.now() + 60_000;
    if (job.tempDir) {
      const directory = job.tempDir;
      job.tempDir = undefined;
      await import("node:fs/promises").then(({ rm }) =>
        rm(directory, { recursive: true, force: true }),
      );
    }
  } finally {
    if (child) activeChildren.delete(job.id);
  }
}

export async function cancelDownload(job: DownloadJob) {
  const child = activeChildren.get(job.id);
  if (child) terminateChild(child, "SIGKILL");
  job.error = { code: "CANCELLED", message: "The download was cancelled." };
  job.status = "failed";
  await removeDownloadJob(job);
}
