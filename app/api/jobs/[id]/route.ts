import { errorResponse, json } from "@/lib/server/api";
import { cancelDownload } from "@/lib/server/downloads";
import { AppError } from "@/lib/server/errors";
import { getDownloadJob } from "@/lib/server/jobs";
import { assertSameOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const TOKEN = /^[A-Za-z0-9_-]{16,80}$/;

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!TOKEN.test(id)) {
      throw new AppError("EXPIRED_JOB", "This download job is unknown.", 404);
    }
    const job = getDownloadJob(id);
    return json({
      jobId: job.id,
      status: job.status,
      progress: Math.round(job.progress),
      message:
        job.status === "ready"
          ? "Your file is ready."
          : job.status === "failed"
            ? job.error?.message || "The file could not be prepared."
            : job.progress >= 90
              ? "Merging video and audio with FFmpeg…"
              : "Downloading the selected streams…",
      ...(job.status === "ready"
        ? { downloadUrl: `/api/download/${job.id}` }
        : {}),
      ...(job.error ? { error: job.error } : {}),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!TOKEN.test(id)) {
      throw new AppError("EXPIRED_JOB", "This download job is unknown.", 404);
    }
    await cancelDownload(getDownloadJob(id));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
