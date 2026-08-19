import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { Logo } from "./Logo";

const platformLinks = [
  ["YouTube", "/youtube-video-downloader"],
  ["TikTok", "/tiktok-video-downloader"],
  ["Instagram", "/instagram-video-downloader"],
  ["Facebook", "/facebook-video-downloader"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            A careful server-side utility for public media you have permission to
            save.
          </p>
          <a href={siteConfig.repository}>View source on GitHub ↗</a>
        </div>
        <div>
          <h2>Product</h2>
          <Link href="/#downloader">Downloader</Link>
          <Link href="/help">Help center</Link>
          <Link href="/about">About</Link>
          <a href={siteConfig.android}>Android app ↗</a>
        </div>
        <div>
          <h2>Platforms</h2>
          {platformLinks.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h2>Legal & safety</h2>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`${siteConfig.repository}/security/policy`}>Security</a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <p>© {new Date().getFullYear()} Final Vora Web.</p>
        <p>
          Designed and developed by{" "}
          <a href={siteConfig.developerUrl}>{siteConfig.developer}</a>.
        </p>
      </div>
    </footer>
  );
}
