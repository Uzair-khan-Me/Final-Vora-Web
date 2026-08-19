import { PlatformPage, type PlatformContent } from "@/components/PlatformPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: 'TikTok Video Downloader for Public Posts',
  description: 'Use a public TikTok share link, inspect available media formats, and learn how login, region, removed-post, and attribution limits apply.',
  path: "/tiktok-video-downloader",
});

const content: PlatformContent = {
  name: "TikTok",
  slug: "tiktok-video-downloader",
  kicker: "Individual public posts",
  title: "Download a permitted public TikTok post",
  intro: "Use the post's Share action to copy its public link. Final Vora Web resolves that link on the server and shows only formats returned by the current extractor.",
  supported: "Individual public TikTok post links and official short share URLs are the intended input. Profiles, favorites, collections, drafts, and bulk account downloads are outside this tool's scope.",
  copySteps: ["Open the individual public post in TikTok or a browser.", "Tap Share and choose Copy link; avoid copying text that contains no URL.", "Paste the link above. If it redirects, the server still validates the original public hostname before extraction."],
  limitations: ["Friends-only, followers-only, drafts, and private-account posts are unavailable.", "A post can be public in your region but unavailable from the server's region.", "TikTok may require fresh cookies or change its link and signature behavior.", "Deleted, moderated, age-gated, or login-walled posts cannot be retrieved.", "The available file may include platform branding; the service does not promise watermark removal.", "Creator attribution and usage rights remain your responsibility."],
  responsibility: "A public post is not automatically free to reuse. Keep creator attribution where required, ask permission before republishing, and follow the creator's rights and TikTok's terms.",
  faqs: [
    { question: "Does Final Vora Web remove TikTok watermarks?", answer: "It downloads a format the source makes available; it does not guarantee or advertise watermark removal. The returned file depends on the current public streams and extractor behavior." },
    { question: "Why does a copied short link fail?", answer: "Short links must redirect through TikTok. Regional routing, an expired share link, TLS trouble, or a platform change can stop that resolution. Try copying a fresh link to the same public post." },
    { question: "Can it download private TikTok drafts?", answer: "No. Drafts and private posts are not public URLs, and Final Vora Web does not bypass account access." },
  ],
};

export default function TikTokPage() { return <PlatformPage content={content} />; }
