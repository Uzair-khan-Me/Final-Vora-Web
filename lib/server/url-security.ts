import { lookup as dnsLookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

import { AppError } from "./errors";

export type LookupAddress = { address: string; family: number };
export type LookupFunction = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<LookupAddress[]>;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "instance-data.ec2.internal",
]);

export function isPublicAddress(address: string): boolean {
  try {
    const parsed = ipaddr.process(address.replace(/^\[|\]$/g, ""));
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

export async function validatePublicMediaUrl(
  value: unknown,
  lookup: LookupFunction = dnsLookup,
): Promise<string> {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("INVALID_URL", "Paste a public media link to continue.");
  }
  if (value.length > 2_048) {
    throw new AppError("INVALID_URL", "The link is too long (maximum 2,048 characters).");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AppError(
      "INVALID_URL",
      "Enter a complete public link beginning with http:// or https://.",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError(
      "UNSUPPORTED_PROTOCOL",
      "Only public HTTP and HTTPS links are supported.",
    );
  }
  if (url.username || url.password) {
    throw new AppError(
      "INVALID_URL",
      "Links containing a username or password are not accepted.",
    );
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new AppError(
      "PRIVATE_URL",
      "Only standard HTTP and HTTPS ports are accepted.",
    );
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.$/, "");
  if (
    !hostname ||
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new AppError(
      "PRIVATE_URL",
      "Local, private, and infrastructure addresses are blocked.",
    );
  }

  if (ipaddr.isValid(hostname) && !isPublicAddress(hostname)) {
    throw new AppError(
      "PRIVATE_URL",
      "Local, private, and infrastructure addresses are blocked.",
    );
  }

  let records: LookupAddress[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError(
      "DNS_FAILURE",
      "That hostname could not be resolved. Check the link and try again.",
      422,
    );
  }

  if (!records.length) {
    throw new AppError(
      "DNS_FAILURE",
      "That hostname did not resolve to a public server.",
      422,
    );
  }
  if (records.some(({ address }) => !isPublicAddress(address))) {
    throw new AppError(
      "PRIVATE_URL",
      "The link resolves to a private or non-routable network address.",
    );
  }

  url.hash = "";
  return url.toString();
}
