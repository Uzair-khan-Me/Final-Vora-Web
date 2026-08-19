import { spawn } from "node:child_process";

import { json } from "@/lib/server/api";
import { serverConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ToolState = { available: boolean; version?: string };
let cached: { at: number; ytDlp: ToolState; ffmpeg: ToolState } | undefined;

function checkTool(command: string, args: string[]): Promise<ToolState> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ available: false });
    }, 2_000);
    child.stdout.on("data", (chunk: Buffer) => {
      output = (output + chunk.toString("utf8")).slice(0, 300);
    });
    child.once("error", () => {
      clearTimeout(timeout);
      resolve({ available: false });
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      const firstLine = output.trim().split("\n")[0]?.slice(0, 120);
      resolve(
        code === 0
          ? { available: true, ...(firstLine ? { version: firstLine } : {}) }
          : { available: false },
      );
    });
  });
}

export async function GET() {
  if (!cached || Date.now() - cached.at > 30_000) {
    const [ytDlp, ffmpeg] = await Promise.all([
      checkTool(serverConfig.ytDlpPath, ["--version"]),
      checkTool("ffmpeg", ["-version"]),
    ]);
    cached = { at: Date.now(), ytDlp, ffmpeg };
  }

  const healthy = cached.ytDlp.available && cached.ffmpeg.available;
  return json(
    {
      status: healthy ? "ok" : "degraded",
      version: serverConfig.version,
      tools: { ytDlp: cached.ytDlp, ffmpeg: cached.ffmpeg },
    },
    { status: healthy ? 200 : 503 },
  );
}
