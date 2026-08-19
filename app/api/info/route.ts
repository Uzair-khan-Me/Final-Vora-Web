import { json, errorResponse } from "@/lib/server/api";
import { capacity } from "@/lib/server/capacity";
import { createAnalysisJob } from "@/lib/server/jobs";
import {
  assertSameOrigin,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/request";
import { validatePublicMediaUrl } from "@/lib/server/url-security";
import { runYtDlpJson } from "@/lib/server/yt-dlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request);
    const body = await readJsonBody<{ url?: unknown }>(request);
    const url = await validatePublicMediaUrl(body.url);
    const release = capacity.acquire();
    try {
      const info = await runYtDlpJson(url, request.signal);
      return json(createAnalysisJob(url, info));
    } finally {
      release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
