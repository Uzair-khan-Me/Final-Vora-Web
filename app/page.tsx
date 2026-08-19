import type { Metadata } from "next";
import Link from "next/link";

import { Downloader } from "@/components/Downloader";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Final Vora Web — Public Media Downloader",
  description:
    "Analyze public video links and download available authorized video or audio formats with Final Vora Web's secure server-side workflow.",
  alternates: { canonical: "/" },
};

const faqs = [
  {
    question: "Which links can Final Vora Web analyze?",
    answer:
      "It offers best-effort support for public links handled by the installed yt-dlp version, including many YouTube, TikTok, Instagram, Facebook, Vimeo, Reddit, and X links. Platform changes can interrupt support without notice.",
  },
  {
    question: "Does processing happen on my device?",
    answer:
      "No. The link is sent to the Final Vora Web server. The server contacts the source, and may stream the file or temporarily store separate streams while FFmpeg merges them.",
  },
  {
    question: "Why can a public video still fail?",
    answer:
      "A source may require sign-in, cookies, age verification, or a supported region. YouTube and other platforms may also challenge datacenter IP addresses used by hosting providers.",
  },
  {
    question: "Are links and files stored permanently?",
    answer:
      "The application keeps short-lived in-memory job records and deletes temporary merge files after delivery or expiry. Infrastructure providers and reverse proxies may still produce access logs.",
  },
  {
    question: "Can Final Vora Web bypass DRM or private access?",
    answer:
      "No. It does not bypass DRM, authentication, or private-video controls. Use it only for media you own or have permission to save.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }}
      />
      <section className="hero">
        <div className="shell">
          <div className="hero-copy">
            <span className="hero-kicker">Public media, handled carefully</span>
            <h1>
              Your media. <span>Your format.</span>
            </h1>
            <p>
              Inspect a public media link, compare available formats, and download
              content you are authorized to save—without confusing controls or silent
              failures.
            </p>
            <div className="hero-trust" aria-label="Product characteristics">
              <span>No account required</span>
              <span>Short-lived jobs</span>
              <span>Clear limitations</span>
            </div>
          </div>
          <div className="downloader-wrap" id="downloader">
            <Downloader />
          </div>
        </div>
      </section>

      <section className="platform-strip" aria-label="Compatible source examples">
        <div className="shell">
          <p>Best-effort support through the current media engine</p>
          <div className="platform-list">
            {[
              "YouTube",
              "YouTube Shorts",
              "TikTok",
              "Instagram",
              "Facebook",
              "X / Twitter",
              "Vimeo",
              "Reddit",
              "Direct media",
            ].map((platform) => <span key={platform}>{platform}</span>)}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="how-it-works">
        <div className="shell">
          <div className="section-heading center">
            <span className="eyebrow">A clear three-step flow</span>
            <h2>From link to file, without guesswork</h2>
            <p>Every stage gives feedback, and every failure includes a useful next step.</p>
          </div>
          <div className="step-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <h3>Paste a public link</h3>
              <p>The server validates the URL and blocks local or private network targets before starting the media engine.</p>
            </article>
            <article className="step-card">
              <span className="step-number">02</span>
              <h3>Compare real formats</h3>
              <p>See the title, creator, duration, source, quality, file type, estimated size, and whether merging is required.</p>
            </article>
            <article className="step-card">
              <span className="step-number">03</span>
              <h3>Start your download</h3>
              <p>A short-lived opaque ticket starts a direct stream or a visible FFmpeg preparation job for split formats.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell privacy-layout">
          <div className="privacy-visual" aria-hidden="true">
            <div className="privacy-ring"><div className="privacy-core">⌁</div></div>
          </div>
          <div>
            <span className="eyebrow">Privacy with honest boundaries</span>
            <div className="section-heading">
              <h2>Short-lived by design, not “on-device”</h2>
              <p>
                A web downloader must contact source platforms from a server. Final Vora
                Web explains that path instead of claiming everything stays in your browser.
              </p>
            </div>
            <ul className="check-list">
              <li><span><strong>Opaque download tickets</strong>The original source URL is not placed in public download paths.</span></li>
              <li><span><strong>Temporary merge storage</strong>Split streams are deleted after delivery, cancellation, failure, or expiry.</span></li>
              <li><span><strong>No application account or permanent history</strong>The app itself does not maintain user profiles or a lasting download ledger.</span></li>
              <li><span><strong>Infrastructure can still log access</strong>Hosts, reverse proxies, and optional outbound proxy providers may create operational logs.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Formats without the mystery</span>
            <h2>Pick the output that fits</h2>
            <p>Format availability comes from the source—not a fabricated quality list.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-card-icon">4K</span><h3>Available video qualities</h3><p>Progressive formats stream directly. Higher split formats are clearly marked when FFmpeg needs to merge video and audio.</p></article>
            <article className="feature-card"><span className="feature-card-icon">♫</span><h3>Audio-only choices</h3><p>When the source exposes a safe audio stream, choose it directly and see its container and approximate bitrate.</p></article>
            <article className="feature-card"><span className="feature-card-icon">≋</span><h3>Honest size estimates</h3><p>Known or approximate byte sizes are displayed. Unknown sizes stay labelled as unknown rather than being guessed.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading center">
            <span className="eyebrow">Source-specific guidance</span>
            <h2>Public links across popular platforms</h2>
            <p>Support is best-effort and follows the current yt-dlp release installed by the operator.</p>
          </div>
          <div className="platform-card-grid">
            <article className="platform-card"><span className="platform-letter">YOUTUBE</span><h3>Videos and Shorts</h3><p>Paste a public watch or Shorts link. Some hosting IPs may trigger YouTube bot verification.</p><Link href="/youtube-video-downloader">YouTube guide →</Link></article>
            <article className="platform-card"><span className="platform-letter">TIKTOK</span><h3>Public post links</h3><p>Use the share link for a public post. Region, login, and removed-post restrictions can still apply.</p><Link href="/tiktok-video-downloader">TikTok guide →</Link></article>
            <article className="platform-card"><span className="platform-letter">SOCIAL</span><h3>Instagram and Facebook</h3><p>Public posts and reels may work; private groups, friends-only media, and login walls are excluded.</p><Link href="/instagram-video-downloader">Instagram guide →</Link></article>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="shell">
          <div className="notice-card">
            <span className="notice-icon" aria-hidden="true">◇</span>
            <div><h2>Permission comes first</h2><p>Download only your own work, public-domain media, or content you have explicit permission to save. Respect copyright and each platform’s terms.</p></div>
            <Link className="button button-quiet" href="/terms">Read responsible-use terms</Link>
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="shell">
          <div className="section-heading center"><span className="eyebrow">Useful answers</span><h2>Frequently asked questions</h2></div>
          <div className="faq-list">
            {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="shell android-callout">
          <div><span className="eyebrow">Prefer Android?</span><h2>Final Vora is available as an APK</h2><p>The Android release stays in the original Final Vora repository. Review your device’s sideloading and security settings before installing an APK.</p></div>
          <a className="button button-primary" href={siteConfig.android}>Download Android APK <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </>
  );
}
