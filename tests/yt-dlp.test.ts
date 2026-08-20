import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  config: {
    ytDlpPath: "",
    ytDlpProxy: "",
    ytDlpCookies: "",
    ytDlpCookiesData: "",
    extractionTimeoutMs: 100,
  },
}));

vi.mock("@/lib/server/config", () => ({ serverConfig: mocked.config }));

import { AppError } from "@/lib/server/errors";
import { runYtDlpJson, spawnYtDlp } from "@/lib/server/yt-dlp";

let directory: string;

async function executable(name: string, source: string) {
  const filename = path.join(directory, name);
  await writeFile(filename, `#!/usr/bin/env node\n${source}`);
  await chmod(filename, 0o755);
  return filename;
}

beforeAll(async () => { directory = await mkdtemp(path.join(os.tmpdir(), "vora-test-")); });
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

describe("yt-dlp child process boundary", () => {
  it("parses bounded metadata JSON from a fake executable", async () => {
    mocked.config.ytDlpPath = await executable("metadata.cjs", `process.stdout.write(JSON.stringify({id:'abc',title:'Mock video',duration:42,formats:[{format_id:'18',ext:'mp4',height:360,vcodec:'h264',acodec:'aac'}]}));`);
    await expect(runYtDlpJson("https://example.com/video")).resolves.toMatchObject({ title: "Mock video", duration: 42 });
  });

  it("streams mock media bytes from a fake executable", async () => {
    mocked.config.ytDlpPath = await executable("stream.cjs", `process.stdout.write('mock-streamed-output');`);
    const child = spawnYtDlp(["--format", "18", "--output", "-", "--", "https://example.com/video"]);
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    const code = await new Promise<number | null>((resolve) => child.once("close", resolve));
    expect(code).toBe(0);
    expect(output).toBe("mock-streamed-output");
  });

  it("maps child failures without leaking raw stack traces", async () => {
    mocked.config.ytDlpPath = await executable("failure.cjs", `process.stderr.write('ERROR: Unsupported URL\nSECRET_INTERNAL_TRACE'); process.exit(1);`);
    try {
      await runYtDlpJson("https://example.com/video");
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("UNSUPPORTED_SITE");
      expect((error as Error).message).not.toContain("SECRET_INTERNAL_TRACE");
    }
  });

  it("kills a hung child at the extraction timeout", async () => {
    mocked.config.ytDlpPath = await executable("timeout.cjs", `setInterval(() => {}, 1000);`);
    const started = Date.now();
    await expect(runYtDlpJson("https://example.com/video")).rejects.toMatchObject({ code: "EXTRACTION_TIMEOUT" });
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("cancels the child when the client signal aborts", async () => {
    mocked.config.ytDlpPath = await executable("abort.cjs", `setInterval(() => {}, 1000);`);
    const controller = new AbortController();
    const pending = runYtDlpJson("https://example.com/video", controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
  });
});
