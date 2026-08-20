import { readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { disposeCookies, resolveCookiesPath } from "@/lib/server/cookies";

const SAMPLE =
  "# Netscape HTTP Cookie File\n127.0.0.1\tFALSE\t/\tFALSE\t0\tsite\tsession\tabc";

afterAll(() => {
  disposeCookies();
});

describe("operator cookie resolution", () => {
  it("prefers an explicitly mounted file path over inline data", () => {
    disposeCookies();
    const mounted = "/run/secrets/yt-cookies.txt";
    expect(resolveCookiesPath(mounted, SAMPLE)).toBe(mounted);
    expect(resolveCookiesPath(mounted, undefined)).toBe(mounted);
  });

  it("returns no cookies when nothing is configured", () => {
    disposeCookies();
    expect(resolveCookiesPath("", "")).toBe("");
    expect(resolveCookiesPath("", "   \n ")).toBe("");
    expect(resolveCookiesPath("", undefined)).toBe("");
  });

  it("materializes inline cookie data as a private, memoized file", async () => {
    disposeCookies();
    const first = resolveCookiesPath("", SAMPLE);
    const second = resolveCookiesPath("", SAMPLE);
    expect(first).not.toBe("");
    expect(second).toBe(first);
    expect(readFileSync(first, "utf8")).toBe(`${SAMPLE}\n`);
    if (process.platform !== "win32") {
      const fileMode = (await stat(first)).mode & 0o777;
      const dirMode = (await stat(path.dirname(first))).mode & 0o777;
      expect(fileMode).toBe(0o600);
      expect(dirMode).toBe(0o700);
    }
  });

  it("keeps an existing trailing newline and re-materializes after disposal", async () => {
    disposeCookies();
    const withNewline = `${SAMPLE}\n`;
    const first = resolveCookiesPath("", withNewline);
    expect(readFileSync(first, "utf8")).toBe(withNewline);
    const dir = path.dirname(first);
    disposeCookies();
    await expect(stat(dir)).rejects.toThrow();
    const second = resolveCookiesPath("", withNewline);
    expect(second).not.toBe(first);
  });
});
