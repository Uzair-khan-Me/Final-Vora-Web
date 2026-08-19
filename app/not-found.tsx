import Link from "next/link";

export default function NotFound() {
  return <div className="not-found shell"><div><span>404</span><h1>This page slipped out of frame</h1><p>The address does not match a Final Vora Web page.</p><Link className="button button-primary" href="/">Return to the downloader</Link></div></div>;
}
