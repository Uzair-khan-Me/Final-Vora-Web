import { beforeEach, describe, expect, it } from "vitest";

import { AppError } from "@/lib/server/errors";
import {
  createAnalysisJob,
  createDownloadJob,
  resetJobsForTests,
  safeFilename,
} from "@/lib/server/jobs";
import { readJsonBody } from "@/lib/server/request";
import type { RawMediaInfo } from "@/lib/server/yt-dlp";

const info: RawMediaInfo = {
  id: "video-1",
  title: "A normal title",
  duration: 60,
  formats: [
    { format_id: "18", ext: "mp4", height: 360, vcodec: "h264", acodec: "aac", filesize: 1234 },
    { format_id: "137", ext: "mp4", height: 1080, vcodec: "h264", acodec: "none", filesize: 4000 },
    { format_id: "140", ext: "m4a", vcodec: "none", acodec: "aac", abr: 128, filesize: 500 },
  ],
};

beforeEach(() => resetJobsForTests());

describe("format allowlisting", () => {
  it("creates opaque choices and accepts an offered choice", () => {
    const analysis = createAnalysisJob("https://example.com/video", info);
    expect(analysis.media.formats.length).toBeGreaterThanOrEqual(2);
    const job = createDownloadJob(analysis.jobId, analysis.media.formats[0]!.id);
    expect(job.selection.formatId).toMatch(/^[\w.-]+$/);
  });

  it.each(["", "bestvideo+bestaudio", "18;rm -rf /", "../../etc/passwd", "$(touch pwned)"])("rejects a client-supplied arbitrary format: %s", (formatId) => {
    const analysis = createAnalysisJob("https://example.com/video", info);
    expect(() => createDownloadJob(analysis.jobId, formatId)).toThrow(AppError);
  });

  it("never offers extractor format IDs containing expressions or shell metacharacters", () => {
    const malicious: RawMediaInfo = {
      ...info,
      formats: [
        { format_id: "bestvideo+bestaudio", ext: "mp4", height: 720, vcodec: "h264", acodec: "aac" },
        { format_id: "18;touch_/tmp/x", ext: "mp4", height: 360, vcodec: "h264", acodec: "aac" },
      ],
    };
    expect(() => createAnalysisJob("https://example.com/video", malicious)).toThrow(/No safe downloadable/);
  });

  it("sanitizes filenames and prevents traversal or response-header injection", () => {
    const filename = safeFilename("../../bad\r\nContent-Type: text/html", "mp4");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain("\r");
    expect(filename).not.toContain("\n");
    expect(filename).toMatch(/\.mp4$/);
  });

  it("rejects oversized JSON before parsing", async () => {
    const request = new Request("http://localhost/api/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "x".repeat(5000) }),
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
