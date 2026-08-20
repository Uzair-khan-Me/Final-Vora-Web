import { ContentPage } from "@/components/ContentPage";
import { DeveloperCard } from "@/components/DeveloperCard";
import { JsonLd } from "@/components/JsonLd";
import { pageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata({ title: "About", description: "The goals, architecture, boundaries, and developer behind Final Vora Web.", path: "/about" });

export default function AboutPage() {
  return <ContentPage title="About Final Vora Web" slug="about" description="A dedicated web application for inspecting and downloading authorized public media—with explicit technical and privacy boundaries.">
    <h2>Why this project exists</h2>
    <p>Final Vora Web turns a technical media-extraction workflow into a focused, accessible browser experience. It shows real source metadata and format choices, keeps the user informed during analysis and merging, and translates engine failures into understandable next steps.</p>
    <h2>How it is built</h2>
    <p>The interface uses Next.js, React, TypeScript, and Tailwind CSS. Node.js route handlers validate requests and start <code>yt-dlp</code> without a shell. FFmpeg merges split streams in unique temporary directories. Short-lived in-memory jobs keep original URLs out of download paths.</p>
    <div className="callout"><strong>Final Vora Web is server-side software.</strong> Links and media pass through the deployment’s server. It is not an “everything happens on your device” application.</div>
    <h2>What it will not do</h2>
    <p>The application does not bypass DRM, private-video protection, sign-in, paid access, or regional restrictions. It disables playlists and puts limits around duration, size, rate, concurrency, and job lifetime.</p>
    <h2>Android and web are separate</h2>
    <p>The original Final Vora repository continues to host the Android release. This repository is dedicated to the web application. You can <a href={siteConfig.android}>download the original Android APK</a> from its existing GitHub release.</p>
    <DeveloperCard />
    <p>
      The source, security policy, and contribution process are available in the{" "}
      <a href={siteConfig.repository}>Final Vora Web repository</a>.
    </p>
    <JsonLd data={{
      "@context": "https://schema.org",
      "@type": "Person",
      name: siteConfig.developer,
      jobTitle: siteConfig.developerTitle,
      url: siteConfig.developerPortfolio,
      sameAs: [siteConfig.developerUrl],
    }} />
  </ContentPage>;
}
