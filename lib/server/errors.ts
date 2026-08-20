export type ErrorCode =
  | "BAD_REQUEST"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "INVALID_URL"
  | "UNSUPPORTED_PROTOCOL"
  | "PRIVATE_URL"
  | "DNS_FAILURE"
  | "RATE_LIMITED"
  | "CAPACITY_REACHED"
  | "ENGINE_MISSING"
  | "FFMPEG_MISSING"
  | "EXTRACTION_TIMEOUT"
  | "DOWNLOAD_TIMEOUT"
  | "NETWORK_ERROR"
  | "UNSUPPORTED_SITE"
  | "UNAVAILABLE_MEDIA"
  | "PRIVATE_MEDIA"
  | "RESTRICTED_MEDIA"
  | "DRM_MEDIA"
  | "BOT_VERIFICATION"
  | "COOKIES_REQUIRED"
  | "UNSUPPORTED_FORMAT"
  | "EXPIRED_JOB"
  | "STORAGE_EXHAUSTED"
  | "CANCELLED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function publicError(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }

  console.error("Unexpected server error", error);
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "The server could not complete that request. Please try again.",
      },
    },
  };
}

export function classifyYtDlpError(stderr: string, timedOut = false): AppError {
  const message = stderr.slice(-8_000);
  if (timedOut) {
    return new AppError(
      "EXTRACTION_TIMEOUT",
      "The source took too long to respond. Try again in a moment.",
      504,
    );
  }
  if (/ENOENT|not found|spawn .* ENOENT/i.test(message)) {
    return new AppError(
      "ENGINE_MISSING",
      "The media engine is unavailable on this server.",
      503,
    );
  }
  if (/ffmpeg.*not found|ffprobe.*not found/i.test(message)) {
    return new AppError(
      "FFMPEG_MISSING",
      "FFmpeg is unavailable, so this format cannot be prepared.",
      503,
    );
  }
  if (
    /Sign in to confirm|not a bot|bot verification|PO Token|Please wait|verify(?:ing)? you (?:are|'re) (?:a )?human|Unable to (?:extract challenge data|solve JS challenge|extract universal data for rehydration|extract aweme detail info)|Unexpected response from webpage request/i.test(
      message,
    )
  ) {
    return new AppError(
      "BOT_VERIFICATION",
      "The source's platform challenged this server as a bot. Try later, or ask the operator to configure approved cookies or a proxy.",
      502,
    );
  }
  if (/cookies? (are|is) required|use --cookies|login required/i.test(message)) {
    return new AppError(
      "COOKIES_REQUIRED",
      "This source requires an authenticated session. Only operator-configured cookies can be used.",
      422,
    );
  }
  if (/Private video|private media|members-only|friends.only/i.test(message)) {
    return new AppError(
      "PRIVATE_MEDIA",
      "This media is private or account-only. Final Vora Web supports public media only.",
      422,
    );
  }
  if (/not available in your country|geo.?restrict|region/i.test(message)) {
    return new AppError(
      "RESTRICTED_MEDIA",
      "This media is not available from the server's region.",
      422,
    );
  }
  if (/age.?restrict|confirm your age/i.test(message)) {
    return new AppError(
      "RESTRICTED_MEDIA",
      "This media requires age or account verification that the server cannot provide.",
      422,
    );
  }
  if (/DRM|copyright protected/i.test(message)) {
    return new AppError(
      "DRM_MEDIA",
      "DRM-protected media is not supported and will not be bypassed.",
      422,
    );
  }
  if (/TLS|SSL|certificate|ECONNRESET|network is unreachable|unable to connect/i.test(message)) {
    return new AppError(
      "NETWORK_ERROR",
      "The server could not establish a secure connection to the source. Try again later.",
      502,
    );
  }
  if (/Unsupported URL|No suitable extractor/i.test(message)) {
    return new AppError(
      "UNSUPPORTED_SITE",
      "This website or link type is not currently supported by the media engine.",
      422,
    );
  }
  if (/Unable to (?:extract|download) webpage/i.test(message)) {
    return new AppError(
      "UNSUPPORTED_SITE",
      "The source's page format is not recognized. The media engine may need an update, or the platform is blocking this server's network.",
      422,
    );
  }
  if (/Requested format is not available|format .* not available/i.test(message)) {
    return new AppError(
      "UNSUPPORTED_FORMAT",
      "That format is no longer available. Analyze the link again and choose another option.",
      422,
    );
  }
  if (/No space left on device|disk quota/i.test(message)) {
    return new AppError(
      "STORAGE_EXHAUSTED",
      "The server does not have enough temporary space for this media.",
      507,
    );
  }
  if (/Video unavailable|media is unavailable|removed|deleted/i.test(message)) {
    return new AppError(
      "UNAVAILABLE_MEDIA",
      "This media is unavailable, removed, or cannot be accessed from this server.",
      422,
    );
  }

  return new AppError(
    "UNAVAILABLE_MEDIA",
    "The source could not provide this media. It may be unavailable, restricted, or recently changed.",
    422,
  );
}
