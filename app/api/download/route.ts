import { json, errorResponse } from "@/lib/server/api";
import { startMergedDownload } from "@/lib/server/downloads";
import { AppError } from "@/lib/server/errors";
import {
  createDownloadJob,
  removeDownloadJob,
} from "@/lib/server/jobs";
import {
  assertSameOrigin,
  enforceRateLimit,
  readJsonBody,
} from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{16,80}$/;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request);
    const body = await readJsonBody<{
      jobId?: unknown;
      formatId?: unknown;
    }>(request);
    if (
      typeof body.jobId !== "string" ||
      typeof body.formatId !== "string" ||
      !TOKEN.test(body.jobId) ||
      !TOKEN.test(body.formatId)
    ) {
      throw new AppError(
        "UNSUPPORTED_FORMAT",
        "The download selection is invalid. Analyze the link again.",
      );
    }

    const job = createDownloadJob(body.jobId, body.formatId);
    if (job.selection.requiresMerge) {
      try {
        startMergedDownload(job);
      } catch (error) {
        await removeDownloadJob(job);
        throw error;
      }
      return json(
        {
          jobId: job.id,
          status: "preparing",
          progress: job.progress,
          statusUrl: `/api/jobs/${job.id}`,
        },
        { status: 202 },
      );
    }

    return json({
      jobId: job.id,
      status: "ready",
      progress: 100,
      downloadUrl: `/api/download/${job.id}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
