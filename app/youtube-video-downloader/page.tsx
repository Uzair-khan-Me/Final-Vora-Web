import { PlatformPage, type PlatformContent } from "@/components/PlatformPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: 'YouTube Video Downloader for Authorized Public Videos',
  description: 'Analyze a public YouTube video or Short, compare available formats, and understand bot checks, cookies, regions, and split-stream limits.',
  path: "/youtube-video-downloader",
});

const content: PlatformContent = {
  name: "YouTube",
  slug: "youtube-video-downloader",
  kicker: "Videos and Shorts",
  title: "A clearer way to inspect public YouTube formats",
  intro: "Paste a public watch or Shorts link to see formats YouTube currently exposes to this server. Choose a progressive file or a higher split-stream quality when available.",
  supported: "Standard youtube.com watch URLs, youtu.be share links, and individual youtube.com/shorts links can usually be analyzed. This tool deliberately disables playlists and live streams.",
  copySteps: ["Open the individual video or Short—not a channel or playlist page.", "Select Share, then Copy link. A youtu.be or youtube.com link is fine.", "Paste the link above and wait for the visible analysis result before choosing a format."],
  limitations: ["YouTube can ask datacenter IPs to verify they are not bots.", "Age-restricted, members-only, private, and rental content requires access the server does not have.", "High-quality video often arrives without audio and must be merged temporarily with FFmpeg.", "Some formats require cookies or proof-of-origin tokens and may not be offered.", "Regional availability is evaluated from the server's hosting region.", "YouTube changes can require a newer yt-dlp release."],
  responsibility: "Save your own uploads, Creative Commons or public-domain work, or videos whose owner has given you permission. Do not use the service to evade access controls or platform restrictions.",
  faqs: [
    { question: "Why is 1080p marked as merged?", answer: "YouTube commonly serves high-resolution video and audio separately. Final Vora Web downloads the selected video and an allowed audio stream, then asks FFmpeg to merge them in a short-lived temporary directory." },
    { question: "What does YouTube bot verification mean?", answer: "YouTube sometimes challenges shared cloud or datacenter addresses. That is a hosting-network restriction, not proof that the public link is invalid. Waiting or operator-configured approved cookies or a proxy may help." },
    { question: "Can I download an entire playlist?", answer: "No. Playlists are disabled to reduce abuse, bandwidth, storage use, and accidental bulk downloading. Paste one individual video link at a time." },
  ],
};

export default function YouTubePage() { return <PlatformPage content={content} />; }
