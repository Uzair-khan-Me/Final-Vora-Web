import { describe, expect, it } from "vitest";

import { AppError, classifyYtDlpError } from "@/lib/server/errors";

describe("classifyYtDlpError", () => {
  it("maps TikTok's 'Please wait' challenge to BOT_VERIFICATION", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 1234567890: Please wait a moment while the challenge loads",
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("BOT_VERIFICATION");
  });

  it("maps TikTok's 'verify you are human' challenge to BOT_VERIFICATION", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 1234567890: TikTok requires us to verify you are human before continuing",
    );

    expect(error.code).toBe("BOT_VERIFICATION");
  });

  it("maps 'Unable to extract webpage' to the stale-extractor message", () => {
    const error = classifyYtDlpError("ERROR: Unable to extract webpage");

    expect(error.code).toBe("UNSUPPORTED_SITE");
    expect(error.message).toBe(
      "The source's page format is not recognized. The media engine may need an update, or the platform is blocking this server's network.",
    );
  });

  it("maps TikTok's 'Unexpected response from webpage request' to BOT_VERIFICATION", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 7661970756636527903: Unexpected response from webpage request; please report this issue on https://github.com/yt-dlp/yt-dlp/issues",
    );

    expect(error.code).toBe("BOT_VERIFICATION");
  });

  it("maps TikTok's 'Unable to extract universal data' to BOT_VERIFICATION", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 7661970756636527903: Unable to extract universal data for rehydration",
    );

    expect(error.code).toBe("BOT_VERIFICATION");
  });

  it("maps TikTok's 'Unable to extract aweme detail info' to BOT_VERIFICATION", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 7661970756636527903: Unable to extract aweme detail info",
    );

    expect(error.code).toBe("BOT_VERIFICATION");
  });

  it("maps a TikTok TLS/SSL reset to NETWORK_ERROR", () => {
    const error = classifyYtDlpError(
      "ERROR: [TikTok] 7661970756636527903: Unable to download webpage: TLS/SSL connection has been closed (EOF) (_ssl.c:992)",
    );

    expect(error.code).toBe("NETWORK_ERROR");
  });

  it("uses platform-neutral wording for bot challenges", () => {
    const error = classifyYtDlpError("ERROR: Sign in to confirm you're not a bot");

    expect(error.code).toBe("BOT_VERIFICATION");
    expect(error.message).not.toContain("YouTube");
  });

  it("never leaks raw stderr into the TikTok bot-verification message", () => {
    const error = classifyYtDlpError(
      'ERROR: [TikTok] 1234567890: Please wait...\n  File "yt_dlp/extractor/tiktok.py", line 300, in _solve_challenge\nSECRET_TOKEN=super-secret-value',
    );

    expect(error.code).toBe("BOT_VERIFICATION");
    expect(error.message).not.toContain("SECRET_TOKEN");
    expect(error.message).not.toContain("super-secret-value");
    expect(error.message).not.toContain("tiktok.py");
  });

  it("never leaks raw stderr into the stale-extractor message", () => {
    const error = classifyYtDlpError(
      'ERROR: [TikTok] 1234567890: Unable to extract webpage video data\n  File "yt_dlp/extractor/common.py", line 762\nINTERNAL_TRACE_9f2a1b',
    );

    expect(error.code).toBe("UNSUPPORTED_SITE");
    expect(error.message).not.toContain("INTERNAL_TRACE_9f2a1b");
    expect(error.message).not.toContain("common.py");
  });
});
