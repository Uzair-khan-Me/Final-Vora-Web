"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";

import type {
  DownloadStartResponse,
  InfoResponse,
  JobStatusResponse,
  MediaFormat,
} from "@/lib/media-types";

type ApiFailure = { code: string; message: string };

function formatDuration(seconds: number | null) {
  if (!seconds) return "Duration unavailable";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "Size estimated at download time";
  if (bytes >= 1024 ** 3) return `~${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `~${(bytes / 1024 ** 2).toFixed(bytes > 100 * 1024 ** 2 ? 0 : 1)} MB`;
}

async function apiFailure(response: Response): Promise<ApiFailure> {
  try {
    const body = (await response.json()) as { error?: ApiFailure };
    if (body.error) return body.error;
  } catch {
    // Fall through to a stable generic error.
  }
  return {
    code: "NETWORK_ERROR",
    message: "The server returned an unexpected response. Please try again.",
  };
}

function errorAdvice(code: string) {
  const advice: Record<string, string> = {
    BOT_VERIFICATION:
      "The server retried automatically with a fallback path. The platform is still blocking this network. Wait a few minutes, try a different public source, or contact the operator about residential-proxy or cookie configuration.",
    NETWORK_ERROR:
      "Check whether the source opens normally, then retry. A hosting network or TLS outage can also cause this.",
    PRIVATE_MEDIA:
      "Use a link that is publicly viewable without signing in.",
    COOKIES_REQUIRED:
      "For safety, visitors cannot upload cookies. The server operator must configure them.",
    RATE_LIMITED: "Wait for the stated period before trying again.",
    CAPACITY_REACHED: "Wait for another media job to finish, then retry.",
    EXPIRED_JOB: "Analyze the original link again to create a new secure session.",
    UNSUPPORTED_FORMAT: "Analyze the link again; available formats can change.",
  };
  return advice[code] || "Confirm that the link is public and supported, then try again.";
}

function triggerBrowserDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function Downloader({ heading = "Download public media" }: { heading?: string }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<InfoResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "analyzing" | "ready" | "preparing" | "started" | "error"
  >("idle");
  const [error, setError] = useState<ApiFailure | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const activeController = useRef<AbortController | null>(null);
  const activeDownloadJob = useRef<string | null>(null);

  useEffect(
    () => () => {
      activeController.current?.abort();
    },
    [],
  );

  const analyze = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) {
      setError({ code: "INVALID_URL", message: "Paste a public media link first." });
      setPhase("error");
      return;
    }

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setResult(null);
    setSelected("");
    setError(null);
    setProgress(0);
    setStatusText("Securely checking the link and available formats…");
    setPhase("analyzing");

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      if (!response.ok) throw await apiFailure(response);
      const body = (await response.json()) as InfoResponse;
      setResult(body);
      setSelected(body.media.formats[0]?.id || "");
      setStatusText(
        `${body.media.formats.length} safe format${body.media.formats.length === 1 ? "" : "s"} found.`,
      );
      setPhase("ready");
    } catch (caught) {
      if (controller.signal.aborted) return;
      const failure = caught as Partial<ApiFailure>;
      setError({
        code: failure.code || "NETWORK_ERROR",
        message: failure.message || "The server could not analyze that link.",
      });
      setStatusText("Analysis failed.");
      setPhase("error");
    }
  };

  const pollJob = async (statusUrl: string, controller: AbortController) => {
    const deadline = Date.now() + 10 * 60 * 1_000;
    while (!controller.signal.aborted && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      const response = await fetch(statusUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw await apiFailure(response);
      const status = (await response.json()) as JobStatusResponse;
      setProgress(status.progress);
      setStatusText(status.message);
      if (status.status === "failed") {
        throw status.error || {
          code: "UNAVAILABLE_MEDIA",
          message: status.message,
        };
      }
      if (status.status === "ready" && status.downloadUrl) {
        triggerBrowserDownload(status.downloadUrl);
        setPhase("started");
        setStatusText("Your browser download has started. This link can be used once.");
        return;
      }
    }
    throw {
      code: "DOWNLOAD_TIMEOUT",
      message: "Preparing this file took too long. Try a smaller or direct format.",
    } satisfies ApiFailure;
  };

  const startDownload = async () => {
    if (!result || !selected || phase === "preparing") return;
    const controller = new AbortController();
    activeController.current = controller;
    setError(null);
    setProgress(3);
    setStatusText("Creating a short-lived download ticket…");
    setPhase("preparing");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: result.jobId, formatId: selected }),
        signal: controller.signal,
      });
      if (!response.ok) throw await apiFailure(response);
      const body = (await response.json()) as DownloadStartResponse;
      activeDownloadJob.current = body.jobId;
      setProgress(body.progress);
      if (body.status === "ready" && body.downloadUrl) {
        triggerBrowserDownload(body.downloadUrl);
        setPhase("started");
        setStatusText("Your browser download has started. This link can be used once.");
        return;
      }
      if (!body.statusUrl) throw new Error("Missing job status URL");
      await pollJob(body.statusUrl, controller);
    } catch (caught) {
      if (controller.signal.aborted) return;
      const failure = caught as Partial<ApiFailure>;
      setError({
        code: failure.code || "NETWORK_ERROR",
        message: failure.message || "The download could not be started.",
      });
      setPhase("error");
      setStatusText("Download failed.");
    }
  };

  const cancel = async () => {
    activeController.current?.abort();
    const job = activeDownloadJob.current;
    if (job) {
      void fetch(`/api/jobs/${job}`, { method: "DELETE" });
    }
    activeDownloadJob.current = null;
    setProgress(0);
    setPhase(result ? "ready" : "idle");
    setStatusText("Processing cancelled.");
  };

  const paste = async () => {
    try {
      setUrl(await navigator.clipboard.readText());
      setError(null);
    } catch {
      setError({
        code: "BAD_REQUEST",
        message: "Clipboard access was blocked. Paste the link into the field manually.",
      });
      setPhase("error");
    }
  };

  const selectedFormat = result?.media.formats.find((item) => item.id === selected);
  const busy = phase === "analyzing" || phase === "preparing";

  return (
    <div className="downloader-card">
      <div className="downloader-heading">
        <div>
          <span className="eyebrow">Secure server-side processing</span>
          <h2>{heading}</h2>
        </div>
        <span className="status-pill">
          <span aria-hidden="true" /> Best-effort support
        </span>
      </div>

      <form onSubmit={analyze} className="url-form" noValidate>
        <label htmlFor="media-url">Public media URL</label>
        <div className="url-input-wrap">
          <span className="link-icon" aria-hidden="true">
            ↗
          </span>
          <input
            id="media-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            maxLength={2048}
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-describedby="url-help downloader-status"
            disabled={busy}
          />
          <button className="paste-button" type="button" onClick={paste} disabled={busy}>
            Paste
          </button>
        </div>
        <p id="url-help" className="field-help">
          Public links only. Playlists, private media, DRM, and live streams are not
          supported.
        </p>
        <button className="button button-primary find-button" type="submit" disabled={busy}>
          {phase === "analyzing" ? (
            <>
              <span className="spinner" aria-hidden="true" /> Analyzing link…
            </>
          ) : (
            <>
              Find video <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </form>

      <div id="downloader-status" className="sr-live" aria-live="polite" aria-atomic="true">
        {statusText}
      </div>

      {phase === "analyzing" && (
        <div className="analysis-skeleton" aria-hidden="true">
          <div className="skeleton skeleton-image" />
          <div className="skeleton-lines">
            <div className="skeleton" />
            <div className="skeleton short" />
            <div className="skeleton tiny" />
          </div>
        </div>
      )}

      {error && (
        <div className="error-panel" role="alert">
          <span className="error-icon" aria-hidden="true">!</span>
          <div>
            <strong>{error.message}</strong>
            <p>{errorAdvice(error.code)}</p>
            <code>{error.code}</code>
          </div>
        </div>
      )}

      {result && (
        <section className="media-result" aria-labelledby="media-title">
          <div className="media-summary">
            <div className="thumbnail-wrap">
              {result.media.thumbnail ? (
                <Image
                  src={result.media.thumbnail}
                  alt=""
                  width={320}
                  height={180}
                  sizes="(max-width: 640px) 100vw, 220px"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="thumbnail-fallback" aria-hidden="true">▶</div>
              )}
              <span>{formatDuration(result.media.duration)}</span>
            </div>
            <div className="media-copy">
              <span className="source-badge">{result.media.source}</span>
              <h3 id="media-title">{result.media.title}</h3>
              <p>{result.media.creator || "Creator not provided"}</p>
              <dl>
                <div><dt>Formats</dt><dd>{result.media.formats.length}</dd></div>
                <div><dt>Session</dt><dd>10 min</dd></div>
              </dl>
            </div>
          </div>

          <fieldset className="format-list">
            <legend>Choose a format</legend>
            {result.media.formats.map((format: MediaFormat) => (
              <label className={selected === format.id ? "format-option selected" : "format-option"} key={format.id}>
                <input
                  type="radio"
                  name="format"
                  value={format.id}
                  checked={selected === format.id}
                  onChange={() => setSelected(format.id)}
                  disabled={phase === "preparing"}
                />
                <span className="format-kind" aria-hidden="true">{format.kind === "video" ? "▶" : "♫"}</span>
                <span className="format-main">
                  <strong>{format.label}</strong>
                  <small>{format.fps ? `${format.fps} fps · ` : ""}{format.requiresMerge ? "FFmpeg processing required" : "Direct stream"}</small>
                </span>
                <span className="format-size">{formatSize(format.estimatedBytes)}</span>
              </label>
            ))}
          </fieldset>

          {phase === "preparing" && (
            <div className="progress-panel" role="status">
              <div><strong>{statusText}</strong><span>{Math.round(progress)}%</span></div>
              <progress max="100" value={progress}>{Math.round(progress)}%</progress>
              <button type="button" onClick={cancel}>Cancel processing</button>
            </div>
          )}

          {phase === "started" && (
            <div className="success-panel" role="status">
              <span aria-hidden="true">✓</span>
              <div><strong>Download started</strong><p>{statusText}</p></div>
            </div>
          )}

          <button
            className="button button-primary download-button"
            type="button"
            onClick={startDownload}
            disabled={!selectedFormat || phase === "preparing"}
          >
            {phase === "preparing" ? "Preparing file…" : `Download ${selectedFormat?.quality || "selected format"}`}
            <span aria-hidden="true">↓</span>
          </button>
        </section>
      )}

      <div className="responsible-note">
        <span aria-hidden="true">◇</span>
        <p>
          <strong>Use responsibly.</strong> Download only media you own, public-domain
          work, or content you have permission to save. Respect copyright and platform
          terms.
        </p>
      </div>
    </div>
  );
}
