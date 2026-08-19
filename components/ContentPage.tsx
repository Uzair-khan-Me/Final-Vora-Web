import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { siteConfig } from "@/lib/site";

export function ContentPage({
  title,
  description,
  slug,
  children,
  updated,
}: {
  title: string;
  description: string;
  slug: string;
  children: React.ReactNode;
  updated?: string;
}) {
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: title, item: `${siteConfig.url}/${slug}` },
        ],
      }} />
      <header className="page-hero">
        <div className="narrow-shell">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{title}</span></nav>
          <h1>{title}</h1>
          <p>{description}</p>
          {updated && <span className="legal-meta">Last updated: {updated}</span>}
        </div>
      </header>
      <div className="content-page"><div className="narrow-shell prose">{children}</div></div>
    </>
  );
}
