import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="logo" href="/" aria-label="Final Vora Web home">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img">
          <path d="M7.5 6.5h17l-2.2 5H13l3 4h4.5l-5.4 10L6.8 11.6A3.4 3.4 0 0 1 7.5 6.5Z" />
          <path className="logo-mark-accent" d="m19.8 14.5 5.3 3.2-5.3 3.2v-6.4Z" />
        </svg>
      </span>
      {!compact && (
        <span className="logo-type">
          Final Vora <span>Web</span>
        </span>
      )}
    </Link>
  );
}
