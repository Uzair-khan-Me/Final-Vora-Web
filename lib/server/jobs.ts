import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";

import type { InfoResponse, MediaDetails, MediaFormat } from "../media-types";
import { serverConfig } from "./config";
import { AppError } from "./errors";
import type { RawFormat, RawMediaInfo } from "./yt-dlp";

const FORMAT_ID = /^[A-Za-z0-9_.-]{1,100}$/;
const SAFE_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "mkv",
  "mov",
  "m4a",
  "mp3",
  "opus",
  "ogg",
  "aac",
]);

export type InternalSelection = {
  publicId: string;
  kind: "video" | "audio";
  formatId: string;
  audioFormatId?: string;
  extension: string;
  filename: string;
  requiresMerge: boolean;
};

type AnalysisJob = {
  id: string;
  url: string;
  selections: Map<string, InternalSelection>;
  expiresAt: number;
};

export type DownloadJob = {
  id: string;
  url: string;
  selection: InternalSelection;
  status: "preparing" | "ready" | "failed";
  progress: number;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
  tempDir?: string;
  outputPath?: string;
  error?: { code: string; message: string };
};

const globalJobs = globalThis as typeof globalThis & {
  __finalVoraAnalyses?: Map<string, AnalysisJob>;
  __finalVoraDownloads?: Map<string, DownloadJob>;
  __finalVoraCleanup?: NodeJS.Timeout;
};

const analyses = (globalJobs.__finalVoraAnalyses ??= new Map());
const downloads = (globalJobs.__finalVoraDownloads ??= new Map());

function token(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

function safeExtension(value?: string) {
  const extension = (value || "").toLowerCase();
  return SAFE_EXTENSIONS.has(extension) ? extension : "mp4";
}

export function safeFilename(title: string, extension: string) {
  const stem = title
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|[ .]+$/g, "")
    .slice(0, 150)
    .trim();
  return `${stem || "final-vora-download"}.${safeExtension(extension)}`;
}

function sizeOf(format: RawFormat) {
  const size = format.filesize || format.filesize_approx;
  return typeof size === "number" && Number.isFinite(size) && size > 0
    ? Math.round(size)
    : null;
}

function usableFormat(format: RawFormat) {
  return Boolean(format.format_id && FORMAT_ID.test(format.format_id));
}

function sourceName(info: RawMediaInfo) {
  const value = info.extractor_key || info.extractor || "Compatible source";
  return value
    .replace(/_/g, " ")
    .replace(/Youtube/gi, "YouTube")
    .replace(/Tiktok/gi, "TikTok")
    .replace(/Twitter/gi, "X / Twitter")
    .slice(0, 60);
}

function validThumbnail(value?: string) {
  if (!value || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function score(format: RawFormat) {
  return (
    (format.ext === "mp4" || format.ext === "m4a" ? 10_000 : 0) +
    (format.filesize ? 1_000 : 0) +
    (format.tbr || format.abr || 0)
  );
}

function selectFormats(info: RawMediaInfo, title: string) {
  const formats = (info.formats || []).filter(usableFormat).slice(-500);
  const audio = formats
    .filter((format) => format.vcodec === "none" && format.acodec !== "none")
    .sort((a, b) => score(b) - score(a));
  const bestAudio = audio[0];

  const progressive = formats.filter(
    (format) => format.vcodec !== "none" && format.acodec !== "none" && format.height,
  );
  const videoOnly = formats.filter(
    (format) => format.vcodec !== "none" && format.acodec === "none" && format.height,
  );

  const selections = new Map<string, InternalSelection>();
  const result: MediaFormat[] = [];
  const usedVideoHeights = new Set<number>();

  const add = (
    format: RawFormat,
    kind: "video" | "audio",
    requiresMerge: boolean,
    audioFormat?: RawFormat,
  ) => {
    const kindCount = result.filter((item) => item.kind === kind).length;
    if (
      result.length >= 14 ||
      (kind === "video" && kindCount >= 10) ||
      (kind === "audio" && kindCount >= 2) ||
      !format.format_id
    ) return;
    const publicId = token(12);
    let extension = safeExtension(format.ext);
    if (requiresMerge && audioFormat) {
      extension =
        format.ext === "mp4" && audioFormat.ext === "m4a"
          ? "mp4"
          : format.ext === "webm" && ["webm", "opus"].includes(audioFormat.ext || "")
            ? "webm"
            : "mkv";
    }
    const estimated = sizeOf(format);
    const audioSize = audioFormat ? sizeOf(audioFormat) : null;
    const estimatedBytes =
      estimated === null ? null : estimated + (audioSize || 0);
    const height = format.height || null;
    const bitrate = Math.round(format.abr || format.tbr || 0);
    const quality =
      kind === "audio"
        ? bitrate
          ? `${bitrate} kbps`
          : "Best audio"
        : `${height || "Source"}p`;
    const filename = safeFilename(title, extension);

    selections.set(publicId, {
      publicId,
      kind,
      formatId: format.format_id,
      audioFormatId: audioFormat?.format_id,
      extension,
      filename,
      requiresMerge,
    });
    result.push({
      id: publicId,
      kind,
      label:
        kind === "audio"
          ? `Audio only · ${extension.toUpperCase()}`
          : `${quality} · ${extension.toUpperCase()}${requiresMerge ? " · merged" : ""}`,
      quality,
      extension,
      estimatedBytes,
      requiresMerge,
      fps: format.fps ? Math.round(format.fps) : null,
    });
  };

  progressive
    .sort((a, b) => (b.height || 0) - (a.height || 0) || score(b) - score(a))
    .forEach((format) => {
      const height = format.height!;
      if (!usedVideoHeights.has(height)) {
        usedVideoHeights.add(height);
        add(format, "video", false);
      }
    });

  if (bestAudio) {
    videoOnly
      .sort((a, b) => (b.height || 0) - (a.height || 0) || score(b) - score(a))
      .forEach((format) => {
        const height = format.height!;
        if (!usedVideoHeights.has(height)) {
          usedVideoHeights.add(height);
          add(format, "video", true, bestAudio);
        }
      });
  }

  const usedAudioExt = new Set<string>();
  audio.forEach((format) => {
    const extension = safeExtension(format.ext);
    if (!usedAudioExt.has(extension) && usedAudioExt.size < 2) {
      usedAudioExt.add(extension);
      add(format, "audio", false);
    }
  });

  return { result, selections };
}

export function createAnalysisJob(url: string, info: RawMediaInfo): InfoResponse {
  if (info._type === "playlist" || info.entries) {
    throw new AppError(
      "UNAVAILABLE_MEDIA",
      "Playlists and multi-video links are disabled. Paste a link to one public video.",
      422,
    );
  }
  if (info.is_live) {
    throw new AppError(
      "UNAVAILABLE_MEDIA",
      "Live streams are not supported while they are live.",
      422,
    );
  }
  if (info.duration && info.duration > serverConfig.maxDuration) {
    throw new AppError(
      "BAD_REQUEST",
      `This media exceeds the ${Math.round(serverConfig.maxDuration / 60)} minute server limit.`,
      413,
    );
  }

  const title = String(info.title || "Untitled media").slice(0, 300);
  const { result: formats, selections } = selectFormats(info, title);
  if (!formats.length) {
    throw new AppError(
      "UNSUPPORTED_FORMAT",
      "No safe downloadable video or audio format was found for this link.",
      422,
    );
  }

  pruneJobs();
  if (analyses.size >= serverConfig.maxJobs) {
    const oldest = analyses.keys().next().value as string | undefined;
    if (oldest) analyses.delete(oldest);
  }

  const id = token();
  const expiresAt = Date.now() + serverConfig.jobTtlSeconds * 1_000;
  analyses.set(id, { id, url, selections, expiresAt });

  const media: MediaDetails = {
    id: String(info.id || "unknown").slice(0, 150),
    title,
    creator: info.uploader || info.channel ? String(info.uploader || info.channel).slice(0, 200) : null,
    duration:
      typeof info.duration === "number" && Number.isFinite(info.duration)
        ? Math.round(info.duration)
        : null,
    thumbnail: validThumbnail(info.thumbnail),
    source: sourceName(info),
    formats,
  };

  return { jobId: id, expiresAt: new Date(expiresAt).toISOString(), media };
}

export function createDownloadJob(analysisId: string, selectionId: string) {
  pruneJobs();
  const analysis = analyses.get(analysisId);
  if (!analysis || analysis.expiresAt <= Date.now()) {
    if (analysis) analyses.delete(analysisId);
    throw new AppError(
      "EXPIRED_JOB",
      "This download session expired. Analyze the link again.",
      410,
    );
  }
  const selection = analysis.selections.get(selectionId);
  if (!selection) {
    throw new AppError(
      "UNSUPPORTED_FORMAT",
      "That format was not offered for this media.",
      400,
    );
  }
  if (downloads.size >= serverConfig.maxJobs) {
    throw new AppError(
      "CAPACITY_REACHED",
      "The download queue is full. Try again shortly.",
      429,
    );
  }

  const id = token();
  const now = Date.now();
  const job: DownloadJob = {
    id,
    url: analysis.url,
    selection,
    status: selection.requiresMerge ? "preparing" : "ready",
    progress: selection.requiresMerge ? 5 : 100,
    createdAt: now,
    expiresAt: now + serverConfig.jobTtlSeconds * 1_000,
    consumed: false,
  };
  downloads.set(id, job);
  return job;
}

export function getDownloadJob(id: string) {
  const job = downloads.get(id);
  if (!job || job.expiresAt <= Date.now()) {
    if (job) void removeDownloadJob(job);
    throw new AppError(
      "EXPIRED_JOB",
      "This download link expired. Analyze the media again.",
      410,
    );
  }
  return job;
}

export function claimDownloadJob(id: string) {
  const job = getDownloadJob(id);
  if (job.consumed) {
    throw new AppError(
      "EXPIRED_JOB",
      "This one-time download link has already been used.",
      410,
    );
  }
  if (job.status !== "ready") {
    throw new AppError(
      "BAD_REQUEST",
      job.status === "failed"
        ? job.error?.message || "The download could not be prepared."
        : "This file is still being prepared.",
      409,
    );
  }
  job.consumed = true;
  return job;
}

export async function removeDownloadJob(job: DownloadJob) {
  downloads.delete(job.id);
  if (job.tempDir) await rm(job.tempDir, { recursive: true, force: true });
}

export function pruneJobs() {
  const now = Date.now();
  for (const [id, job] of analyses) {
    if (job.expiresAt <= now) analyses.delete(id);
  }
  for (const job of downloads.values()) {
    if (job.expiresAt <= now) void removeDownloadJob(job);
  }
}

if (!globalJobs.__finalVoraCleanup) {
  globalJobs.__finalVoraCleanup = setInterval(pruneJobs, 60_000);
  globalJobs.__finalVoraCleanup.unref();
}

export function resetJobsForTests() {
  analyses.clear();
  for (const job of downloads.values()) void removeDownloadJob(job);
  downloads.clear();
}
