import Link from "next/link";

import { navigation, siteConfig } from "@/lib/site";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <a
            className="button button-quiet desktop-only"
            href={siteConfig.android}
            rel="noopener noreferrer"
          >
            Android app
          </a>
          <details className="mobile-menu">
            <summary aria-label="Open navigation menu">
              <span />
              <span />
              <span />
            </summary>
            <nav aria-label="Mobile navigation">
              {navigation.map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
              <a href={siteConfig.android}>Android app</a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
