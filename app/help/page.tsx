import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({ title: "Help Center", description: "Troubleshoot link analysis, formats, FFmpeg merging, bot verification, network errors, cookies, expired jobs, and downloads.", path: "/help" });

export default function HelpPage() {
  return <ContentPage title="Help center" slug="help" description="Understand each step of a download and find practical next actions when a source or hosting network refuses a request.">
    <h2>Start with a suitable link</h2>
    <ol><li>Open one individual, publicly viewable video or audio post.</li><li>Use the source platform’s Share or Copy link action.</li><li>Paste the full HTTP or HTTPS URL into the downloader.</li><li>Wait for the visible analysis result; do not submit repeatedly.</li><li>Select a direct format for the lightest workflow, or a merged format if you need a higher available quality.</li></ol>
    <h2>If “Find video” appears unresponsive</h2>
    <p>Confirm JavaScript is enabled, reload the page, and inspect whether an extension blocks same-origin API requests. In Arena previews, Next.js must allow the proxied <code>*.e2b.app</code> development origin; this repository configures that explicitly. A loading label and live status should appear immediately after submission.</p>
    <h2>Understand common errors</h2>
    <h3>YouTube bot verification</h3><p>YouTube can challenge a hosting provider’s shared datacenter IP. Try later. A deployment operator may configure authorized Netscape-format cookies or a reputable outbound proxy, but neither guarantees success.</p>
    <h3>Cookies required</h3><p>The public form never accepts browser cookies. Only the operator can securely mount a cookie file. Private or paid content remains out of scope even when cookies are configured.</p>
    <h3>TLS or network failure</h3><p>The server could not establish a verified secure connection. This can be a host firewall, DNS, certificate path, platform outage, or sandbox egress limitation. TLS verification must not be disabled.</p>
    <h3>No safe format</h3><p>The source did not expose a progressive video, video-plus-audio pair, or audio stream with a safe engine-generated format identifier. Analyze again later or choose another public source.</p>
    <h3>Expired job</h3><p>Analysis and download IDs are intentionally short-lived and one-time. Paste and analyze the original link again.</p>
    <h2>Direct versus merged formats</h2>
    <p>A direct format already contains the selected media and can stream through the server. A merged format combines separate video and audio using FFmpeg. Merging takes longer and uses temporary storage; its progress is visible and can be cancelled.</p>
    <h2>Still stuck?</h2>
    <p>Check the <Link href="/privacy">privacy explanation</Link> and <Link href="/terms">responsible-use terms</Link>. For a reproducible software issue, open a GitHub issue with the stable error code and source platform—but never include private URLs, cookies, tokens, or credentials.</p>
  </ContentPage>;
}
