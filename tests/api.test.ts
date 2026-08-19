import { mkdtemp, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  validate: vi.fn(),
}));
vi.mock("@/lib/server/yt-dlp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/yt-dlp")>();
  return { ...actual, runYtDlpJson: mocks.run };
});
vi.mock("@/lib/server/url-security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/url-security")>();
  return { ...actual, validatePublicMediaUrl: mocks.validate };
});

import { GET as health } from "@/app/api/health/route";
import { POST as infoPost } from "@/app/api/info/route";
import { GET as fileGet } from "@/app/api/download/[id]/route";
import { AppError } from "@/lib/server/errors";
import {
  createAnalysisJob,
  createDownloadJob,
  resetJobsForTests,
} from "@/lib/server/jobs";
import { resetRateLimitForTests } from "@/lib/server/request";

const metadata = {
  id: "mock-id",
  title: "Mock public video",
  uploader: "Mock creator",
  duration: 67,
  extractor_key: "Youtube",
  formats: [
    { format_id: "18", ext: "mp4", height: 360, vcodec: "h264", acodec: "aac", filesize: 1000 },
    { format_id: "140", ext: "m4a", vcodec: "none", acodec: "aac", abr: 128, filesize: 200 },
  ],
};

function infoRequest(body: string, contentType = "application/json", ip = "203.0.113.10") {
  return new Request("http://localhost/api/info", {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": ip, host: "localhost" },
    body,
  });
}

beforeEach(() => {
  resetJobsForTests();
  resetRateLimitForTests();
  mocks.run.mockReset().mockResolvedValue(metadata);
  mocks.validate.mockReset().mockImplementation(async (value: unknown) => {
    if (typeof value !== "string" || !value) {
      throw new AppError("INVALID_URL", "Paste a public media link to continue.");
    }
    return value;
  });
});

describe("API behavior", () => {
  it("returns a minimal health payload without paths or environment details", async () => {
    const response = await health();
    expect([200, 503]).toContain(response.status);
    const text = await response.text();
    expect(text).toContain('"version":"1.0.0"');
    expect(text).not.toContain(process.cwd());
    expect(text).not.toContain("YT_DLP_PROXY");
  });

  it("normalizes mock metadata and creates opaque format IDs", async () => {
    const response = await infoPost(infoRequest(JSON.stringify({ url: "https://example.com/video" })));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.media).toMatchObject({ title: "Mock public video", creator: "Mock creator", source: "YouTube" });
    expect(body.media.formats[0].id).not.toBe("18");
    expect(body.jobId).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects unsupported content types and malformed or missing JSON", async () => {
    const wrongType = await infoPost(infoRequest("url=x", "text/plain"));
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toMatchObject({ error: { code: "UNSUPPORTED_CONTENT_TYPE" } });

    const invalid = await infoPost(infoRequest("{"));
    expect(invalid.status).toBe(400);
    const missing = await infoPost(infoRequest("{}"));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: { code: "INVALID_URL" } });
  });

  it("returns friendly extractor errors without stack traces", async () => {
    mocks.run.mockRejectedValueOnce(new AppError("BOT_VERIFICATION", "YouTube challenged this server.", 502));
    const response = await infoPost(infoRequest(JSON.stringify({ url: "https://example.com/video" })));
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body).toEqual({ error: { code: "BOT_VERIFICATION", message: "YouTube challenged this server." } });
    expect(JSON.stringify(body)).not.toMatch(/stack|at runYtDlp/i);
  });

  it("enforces the configured in-memory request rate limit", async () => {
    let response = new Response();
    for (let count = 0; count < 21; count += 1) {
      response = await infoPost(infoRequest(JSON.stringify({ url: "https://example.com/video" }), "application/json", "198.51.100.9"));
    }
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("streams a prepared mock file with safe headers and cleans temporary storage", async () => {
    const analysis = createAnalysisJob("https://example.com/video", {
      ...metadata,
      title: "Bad\r\nHeader / title",
    });
    const job = createDownloadJob(analysis.jobId, analysis.media.formats[0]!.id);
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "vora-api-test-"));
    const file = path.join(tempDir, "media.mp4");
    await writeFile(file, "mock-streamed-media");
    job.tempDir = tempDir;
    job.outputPath = file;

    const response = await fileGet(new Request(`http://localhost/api/download/${job.id}`), { params: Promise.resolve({ id: job.id }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(response.headers.get("content-disposition")).not.toMatch(/[\r\n]/);
    expect(await response.text()).toBe("mock-streamed-media");
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(stat(tempDir)).rejects.toThrow();
  });
});
