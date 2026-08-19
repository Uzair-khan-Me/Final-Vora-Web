import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/about",
    "/help",
    "/privacy",
    "/terms",
    "/youtube-video-downloader",
    "/tiktok-video-downloader",
    "/instagram-video-downloader",
    "/facebook-video-downloader",
  ];
  return pages.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date("2026-08-19"),
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? (path.includes("downloader") ? 0.8 : 0.6) : 1,
  }));
}
