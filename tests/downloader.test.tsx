import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Downloader } from "@/components/Downloader";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Downloader interaction", () => {
  it("shows an immediate loading state and renders normalized metadata", async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })));
    const user = userEvent.setup();
    render(<Downloader />);

    await user.type(screen.getByLabelText(/public media url/i), "https://example.com/video");
    await user.click(screen.getByRole("button", { name: /find video/i }));
    expect(screen.getByRole("button", { name: /analyzing link/i })).toBeDisabled();
    expect(screen.getByText(/securely checking/i)).toBeInTheDocument();

    resolveFetch(response({
      jobId: "analysis_opaque_token",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      media: {
        id: "mock",
        title: "A mock public video",
        creator: "Test creator",
        duration: 75,
        thumbnail: null,
        source: "Mock source",
        formats: [{ id: "format_opaque_token", kind: "video", label: "720p · MP4", quality: "720p", extension: "mp4", estimatedBytes: 2000000, requiresMerge: false, fps: 30 }],
      },
    }));

    expect(await screen.findByRole("heading", { name: "A mock public video" })).toBeInTheDocument();
    expect(screen.getByText("720p · MP4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download 720p/i })).toBeEnabled();
  });

  it("shows a visible friendly API error instead of failing silently", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ error: { code: "BOT_VERIFICATION", message: "YouTube challenged this server." } }, 502)));
    const user = userEvent.setup();
    render(<Downloader />);
    await user.type(screen.getByLabelText(/public media url/i), "https://youtu.be/example");
    await user.click(screen.getByRole("button", { name: /find video/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("YouTube challenged this server.");
    expect(screen.getByRole("alert")).toHaveTextContent("retried automatically");
  });

  it("validates an empty field without making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Downloader />);
    await user.click(screen.getByRole("button", { name: /find video/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Paste a public media link first.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
