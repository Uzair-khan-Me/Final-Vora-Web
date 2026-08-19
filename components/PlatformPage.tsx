import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { Downloader } from "./Downloader";
import { JsonLd } from "./JsonLd";

export type PlatformContent = {
  name: string;
  slug: string;
  kicker: string;
  title: string;
  intro: string;
  supported: string;
  copySteps: string[];
  limitations: string[];
  responsibility: string;
  faqs: { question: string; answer: string }[];
};

export function PlatformPage({ content }: { content: PlatformContent }) {
  const pageUrl = `${siteConfig.url}/${content.slug}`;
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
              { "@type": "ListItem", position: 2, name: `${content.name} downloader guide`, item: pageUrl },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]}
      />
      <div className="shell platform-hero-grid">
        <header className="page-hero">
          <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>{content.name}</span></nav>
          <span className="hero-kicker">{content.kicker}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </header>
        <div className="downloader-wrap platform-downloader"><Downloader heading={`Download a public ${content.name} link`} /></div>
      </div>
      <section className="section section-alt">
        <div className="shell guide-grid">
          <article className="guide-panel"><span className="eyebrow">Public-link support</span><h2>What can be analyzed</h2><p>{content.supported}</p><p className="field-help">Compatibility is best-effort and may change when {content.name} changes its website or access rules.</p></article>
          <article className="guide-panel"><span className="eyebrow">Find the right link</span><h2>How to copy it</h2><ol>{content.copySteps.map((step) => <li key={step}>{step}</li>)}</ol></article>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <div className="section-heading"><span className="eyebrow">Know before you download</span><h2>{content.name} limitations</h2><p>No downloader can guarantee access when the platform withholds a stream.</p></div>
          <ul className="limitation-list">{content.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>
      <section className="section section-alt">
        <div className="shell notice-card"><span className="notice-icon" aria-hidden="true">◇</span><div><h2>Responsible use on {content.name}</h2><p>{content.responsibility}</p></div><Link href="/terms" className="button button-quiet">Read the terms</Link></div>
      </section>
      <section className="section">
        <div className="shell"><div className="section-heading center"><span className="eyebrow">Platform questions</span><h2>{content.name} download FAQ</h2></div><div className="faq-list">{content.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></div>
      </section>
    </>
  );
}
