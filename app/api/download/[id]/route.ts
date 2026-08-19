import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import { errorResponse } from "@/lib/server/api";
import { capacity } from "@/lib/server/capacity";
import { serverConfig } from "@/lib/server/config";
import { AppError, classifyYtDlpError } from "@/lib/server/errors";
import {
  claimDownloadJob,
  getDownloadJob,
  removeDownloadJob,
  type DownloadJob,
} from "@/lib/server/jobs";
import { spawnYtDlp, terminateChild } from "@/lib/server/yt-dlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

type Context = { params: Promise<{ id: string }> };
const TOKEN = /^[A-Za-z0-9_-]{16,80}$/;

function contentType(extension: string) {
  const types: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    opus: "audio/ogg",
    ogg: "audio/ogg",
    aac: "audio/aac",
  };
  return types[extension] || "application/octet-stream";
}

function contentDisposition(filename: string) {
  const fallback = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 180);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function downloadHeaders(job: DownloadJob, length?: number) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": contentDisposition(job.selection.filename),
    "Content-Type": contentType(job.selection.extension),
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  });
  if (length !== undefined) headers.set("Content-Length", String(length));
  return headers;
}

async function mergedResponse(job: DownloadJob, request: Request) {
  if (!job.outputPath) {
    throw new AppError("UNAVAILABLE_MEDIA", "The prepared file is missing.", 410);
  }
  const details = await stat(job.outputPath);
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    void removeDownloadJob(job);
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const source = createReadStream(job.outputPath!);
      source.on("data", (chunk: Buffer | string) => {
        controller.enqueue(
          typeof chunk === "string" ? Buffer.from(chunk) : new Uint8Array(chunk),
        );
      });
      source.once("end", () => {
        controller.close();
        cleanup();
      });
      source.once("error", (error) => {
        controller.error(error);
        cleanup();
      });
      request.signal.addEventListener(
        "abort",
        () => {
          source.destroy();
          cleanup();
        },
        { once: true },
      );
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: downloadHeaders(job, details.size),
  });
}

async function directResponse(job: DownloadJob, request: Request) {
  const release = capacity.acquire();
  const child = spawnYtDlp([
    "--no-playlist",
    "--quiet",
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
    "--format",
    job.selection.formatId,
    "--output",
    "-",
    "--",
    job.url,
  ]);

  try {
    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", (error: NodeJS.ErrnoException) => {
        reject(
          error.code === "ENOENT"
            ? new AppError(
                "ENGINE_MISSING",
                "The media engine is unavailable on this server.",
                503,
              )
            : error,
        );
      });
    });
  } catch (error) {
    release();
    await removeDownloadJob(job);
    throw error;
  }

  let settled = false;
  let transferred = 0;
  let stderr = "";
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    release();
    void removeDownloadJob(job);
  };
  const timeout = setTimeout(() => {
    terminateChild(child, "SIGKILL");
  }, serverConfig.downloadTimeoutMs);
  child.stderr.on("data", (chunk: Buffer) => {
    // Always drain stderr; retain only a bounded diagnostic tail server-side.
    stderr = (stderr + chunk.toString("utf8")).slice(-64 * 1024);
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      child.stdout.on("data", (chunk: Buffer) => {
        transferred += chunk.length;
        if (transferred > serverConfig.maxFileBytes) {
          terminateChild(child, "SIGKILL");
          controller.error(new Error("download size limit exceeded"));
          finish();
          return;
        }
        controller.enqueue(new Uint8Array(chunk));
      });
      child.once("close", (code) => {
        if (settled) return;
        if (code === 0) {
          controller.close();
        } else {
          console.warn("yt-dlp stream ended unsuccessfully", {
            exitCode: code,
            errorCode: classifyYtDlpError(stderr).code,
          });
          controller.error(new Error("The source stream ended before completion"));
        }
        finish();
      });
      request.signal.addEventListener(
        "abort",
        () => {
          terminateChild(child, "SIGKILL");
          finish();
        },
        { once: true },
      );
    },
    cancel() {
      terminateChild(child, "SIGKILL");
      finish();
    },
  });

  return new Response(stream, { headers: downloadHeaders(job) });
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!TOKEN.test(id)) {
      throw new AppError("EXPIRED_JOB", "This download link is unknown.", 404);
    }
    // Check status before consuming this one-time ticket.
    getDownloadJob(id);
    const job = claimDownloadJob(id);
    return job.outputPath
      ? await mergedResponse(job, request)
      : await directResponse(job, request);
  } catch (error) {
    return errorResponse(error);
  }
}
