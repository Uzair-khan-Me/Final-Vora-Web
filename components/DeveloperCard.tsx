"use client";

import Image from "next/image";

import { siteConfig } from "@/lib/site";

/**
 * Developer block shared by the home page and the About page. The portrait
 * is hot-linked from the Final Vora site; if it fails to load, the framed
 * initials fallback stays in its place instead of breaking the layout.
 */
export function DeveloperCard() {
  return (
    <div className="developer-card">
      <div className="developer-portrait">
        <span className="developer-portrait-fallback" aria-hidden="true">
          {siteConfig.developer
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </span>
        <Image
          src={siteConfig.developerPortrait}
          alt={`${siteConfig.developer} — ${siteConfig.developerTitle}`}
          fill
          sizes="(max-width: 900px) 220px, 230px"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>
      <div className="developer-copy">
        <span className="eyebrow">Developer</span>
        <h2>{siteConfig.developer}</h2>
        <p className="developer-role">{siteConfig.developerTitle}</p>
        <p className="developer-bio">{siteConfig.developerBio}</p>
        <div className="developer-actions">
          <a
            className="button button-primary"
            href={siteConfig.developerPortfolio}
            rel="noopener noreferrer"
            target="_blank"
          >
            View portfolio <span aria-hidden="true">↗</span>
          </a>
          <a
            className="button button-quiet"
            href={`mailto:${siteConfig.developerEmail}`}
          >
            Contact developer
          </a>
        </div>
      </div>
    </div>
  );
}
