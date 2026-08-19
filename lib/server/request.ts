import { AppError } from "./errors";
import { serverConfig } from "./config";

type Bucket = { count: number; resetAt: number };

const globalRateState = globalThis as typeof globalThis & {
  __finalVoraRateBuckets?: Map<string, Bucket>;
};
const buckets = (globalRateState.__finalVoraRateBuckets ??= new Map());

export async function readJsonBody<T>(request: Request, maxBytes = 4_096): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    throw new AppError(
      "UNSUPPORTED_CONTENT_TYPE",
      "Send this request as application/json.",
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    throw new AppError("BAD_REQUEST", "The request body is too large.", 413);
  }

  const text = await request.text();
  if (!text || Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new AppError("BAD_REQUEST", "The request body is empty or too large.", 400);
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as T;
  } catch {
    throw new AppError("BAD_REQUEST", "The JSON request body is invalid.", 400);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  try {
    if (new URL(origin).host !== host) {
      throw new Error("origin mismatch");
    }
  } catch {
    throw new AppError("BAD_REQUEST", "Cross-origin API requests are not allowed.", 403);
  }
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function enforceRateLimit(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + serverConfig.rateLimitWindowMs,
    });
  } else {
    existing.count += 1;
    if (existing.count > serverConfig.rateLimitMax) {
      const retry = Math.max(1, Math.ceil((existing.resetAt - now) / 1_000));
      const error = new AppError(
        "RATE_LIMITED",
        `Too many requests. Try again in ${retry} seconds.`,
        429,
      );
      Object.assign(error, { retryAfter: retry });
      throw error;
    }
  }

  if (buckets.size > 5_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }
}

export function resetRateLimitForTests() {
  buckets.clear();
}
