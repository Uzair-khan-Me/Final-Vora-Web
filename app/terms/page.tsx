import { ContentPage } from "@/components/ContentPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({ title: "Terms and Responsible Use", description: "Responsible-use conditions and service limitations for Final Vora Web.", path: "/terms" });

export default function TermsPage() {
  return <ContentPage title="Terms and responsible use" slug="terms" updated="August 19, 2026" description="Use Final Vora Web only for lawful, authorized downloads. These project terms are practical rules, not a substitute for legal advice.">
    <h2>Your responsibility</h2>
    <p>You may use this service only to save media you own, public-domain material, content offered under a license that permits downloading, or content you have clear permission to save. You are responsible for following copyright law, privacy rights, and the source platform’s terms.</p>
    <h2>Prohibited use</h2>
    <ul><li>Do not use the service to infringe copyright or redistribute media without permission.</li><li>Do not attempt to access private, friends-only, paid, age-gated, or otherwise restricted media.</li><li>Do not use it to bypass DRM, authentication, rate limits, or platform security controls.</li><li>Do not automate bulk downloads, probe internal networks, evade service limits, or impose excessive bandwidth or compute load.</li><li>Do not submit malicious links, credentials, cookies, tokens, or personal data belonging to someone else.</li></ul>
    <h2>No guarantee of availability</h2>
    <p>Source support is best-effort. Platforms change frequently and can block datacenter addresses, require login, restrict regions, remove formats, or present bot verification. The project does not promise every public link or quality will work.</p>
    <h2>No affiliation</h2>
    <p>Final Vora Web is an independent open-source utility. Mentioned platform names identify compatible link types and do not imply endorsement, sponsorship, or affiliation.</p>
    <h2>Resource limits</h2>
    <p>Operators may limit URL length, media duration, file size, job lifetime, concurrent jobs, and request rate. Jobs can be cancelled or removed to protect the service and its hosting allowance.</p>
    <h2>Service provided as-is</h2>
    <p>The software is provided under its repository license without a guarantee that a given source, format, file, or deployment will remain available. Verify downloaded files and keep your own originals.</p>
  </ContentPage>;
}
