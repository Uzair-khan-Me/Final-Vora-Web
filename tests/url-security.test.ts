import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/server/errors";
import {
  type LookupFunction,
  validatePublicMediaUrl,
} from "@/lib/server/url-security";

const publicLookup: LookupFunction = async () => [
  { address: "93.184.216.34", family: 4 },
];

async function expectCode(value: unknown, code: string, lookup = publicLookup) {
  try {
    await validatePublicMediaUrl(value, lookup);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe("validatePublicMediaUrl", () => {
  it("accepts and normalizes public HTTPS and HTTP URLs", async () => {
    await expect(validatePublicMediaUrl(" https://example.com/video#part ", publicLookup)).resolves.toBe("https://example.com/video");
    await expect(validatePublicMediaUrl("http://example.com/v", publicLookup)).resolves.toBe("http://example.com/v");
  });

  it.each(["not a url", "https://", "", null])("rejects malformed input %s", async (value) => {
    await expectCode(value, "INVALID_URL");
  });

  it.each(["file:///etc/passwd", "ftp://example.com/video", "javascript:alert(1)"])("rejects unsupported protocol %s", async (value) => {
    await expectCode(value, "UNSUPPORTED_PROTOCOL");
  });

  it("rejects embedded credentials", async () => {
    await expectCode("https://user:password@example.com/video", "INVALID_URL");
  });

  it.each([
    "http://localhost/x",
    "http://service.local/x",
    "http://127.0.0.1/x",
    "http://0.0.0.0/x",
    "http://10.2.3.4/x",
    "http://172.16.0.1/x",
    "http://172.31.255.255/x",
    "http://192.168.2.3/x",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/x",
    "http://[fc00::1]/x",
    "http://[fe80::1]/x",
    "http://[::ffff:127.0.0.1]/x",
    "http://metadata.google.internal/x",
  ])("blocks local, private, metadata, and mapped addresses: %s", async (value) => {
    await expectCode(value, "PRIVATE_URL");
  });

  it("blocks a public hostname if any DNS answer is private", async () => {
    await expectCode("https://example.com/x", "PRIVATE_URL", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.4", family: 4 },
    ]);
  });

  it("returns a stable DNS failure", async () => {
    await expectCode("https://does-not-resolve.example/x", "DNS_FAILURE", async () => {
      throw new Error("ENOTFOUND private diagnostics");
    });
  });

  it("rejects nonstandard ports and excessively long URLs", async () => {
    await expectCode("https://example.com:8080/x", "PRIVATE_URL");
    await expectCode(`https://example.com/${"a".repeat(2050)}`, "INVALID_URL");
  });
});
