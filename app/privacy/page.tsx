import { ContentPage } from "@/components/ContentPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "How Final Vora Web processes source links, temporary media files, short-lived job data, cookies, proxy traffic, and infrastructure logs.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <ContentPage title="Privacy" slug="privacy" updated="August 19, 2026" description="A plain-language account of what the application processes, what it does not retain by design, and where infrastructure logging can still occur.">
    <h2>What the service receives</h2>
    <p>When you submit a link, your browser sends that source URL to the Final Vora Web server. The server validates it, resolves its hostname, and contacts the source platform through <code>yt-dlp</code> to retrieve metadata. If you start a download, the server also retrieves the selected media stream.</p>
    <p>The application does not require a user account and does not ask visitors to upload browser cookies, passwords, or source-platform credentials.</p>

    <h2>Server-side processing</h2>
    <p>Processing does not happen entirely on your device. Direct formats are relayed from the source through the server to your browser. For split formats, video and audio may be placed in a unique temporary directory and merged with FFmpeg before delivery.</p>
    <p>Opaque, short-lived identifiers are used for analysis and download jobs so the original source URL does not need to appear in a public download path. In-memory job records expire automatically. Temporary merge files are deleted after delivery, cancellation, failure, or expiration.</p>

    <h2>History and operational logs</h2>
    <p>The application itself does not create a permanent download history or analytics profile. That does not mean “no logs” exist everywhere. The hosting provider, load balancer, reverse proxy, DNS provider, operating system, or security tooling may record IP addresses, timestamps, request paths, response sizes, and errors according to the operator’s configuration.</p>
    <p>Operators should minimize retention, avoid logging request bodies, and redact sensitive diagnostics. Source URLs are sent in JSON request bodies rather than access-log-visible GET query strings, but infrastructure behavior must still be reviewed.</p>

    <h2>Source platforms, thumbnails, and proxies</h2>
    <p>The source platform receives requests from the server and can apply its own privacy policy. A displayed thumbnail is loaded directly from an HTTPS source URL in the visitor’s browser, which can disclose the visitor’s network address to that image host. If the operator configures <code>YT_DLP_PROXY</code>, that proxy provider can observe outbound destinations and traffic metadata.</p>

    <h2>Operator cookies</h2>
    <p>An operator can optionally mount a Netscape-format cookie file into the server. On hosts without secret file mounts, the operator can instead supply the cookie file contents through the secret <code>YT_DLP_COOKIES_DATA</code> variable, which the server writes to a private temporary file that is removed at shutdown. Those cookies are server credentials and must never be committed to this repository, exposed to visitors, or used without authorization. Visitors cannot supply cookies through the application.</p>

    <h2>Retention and control</h2>
    <p>The default job lifetime is ten minutes and can be configured by the operator. A preparing merge can be cancelled in the interface. A completed one-time download ticket is removed after use. A server crash or redeploy also removes in-memory jobs and ephemeral temporary files.</p>

    <h2>Questions</h2>
    <p>For a deployment-specific privacy question, contact that deployment’s operator. For this open-source project, use the repository’s GitHub issue tracker without posting private links or credentials.</p>
  </ContentPage>;
}
