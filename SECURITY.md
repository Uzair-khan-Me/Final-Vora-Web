# Security policy

## Supported version

Security fixes are applied to the latest commit on `main`. Operators should rebuild frequently because source extractors and base-image packages change independently of application releases.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/Uzair-khan-Me/Final-Vora-Web/security/advisories/new). Do not open a public issue containing an exploit, private URL, cookie, token, proxy credential, internal hostname, or personal information. Include the affected commit, impact, minimal reproduction, and suggested mitigation when possible.

## Security model

Final Vora Web treats submitted URLs, extractor metadata, format identifiers, filenames, and child-process output as untrusted.

Controls include:

- only HTTP/HTTPS source URLs, maximum 2,048 characters;
- no URL credentials or nonstandard ports;
- explicit blocks for localhost, `.local`, internal/metadata names, private/link-local/loopback/reserved IPv4 and IPv6, and IPv4-mapped private IPv6;
- DNS resolution before extraction and rejection if any answer is non-public;
- no shell invocation: `yt-dlp` is started with `spawn` and a fixed argument array;
- extractor-generated format IDs are constrained, mapped to opaque client IDs, and checked against a short-lived server allowlist;
- source URLs are in JSON POST bodies and never placed in public download query strings;
- playlists and live streams disabled; duration, file size, job count, concurrency, request rate, metadata size, and process runtime bounded;
- child processes terminated on timeout, direct-stream disconnect, and cancellation; stderr always drained and bounded;
- unique temporary directories and cleanup after delivery, cancellation, failure, timeout, or TTL expiry;
- output filename, extension, MIME type, and `Content-Disposition` sanitized/allowlisted;
- same-origin browser API policy, no wildcard CORS, restrictive CSP, frame-ancestor protection in production, `nosniff`, referrer and permissions policies;
- no visitor-supplied cookies, proxy values, executable paths, or `yt-dlp` options;
- secrets excluded from Git and Docker build context; non-root production container.

DNS validation cannot fully eliminate a sophisticated time-of-check/time-of-use rebinding attack inside a third-party extractor or every redirect an extractor follows. For a high-risk public deployment, run outbound traffic through an egress proxy/firewall that blocks private, link-local, metadata, and organization networks at connection time; maintain a domain allowlist if product scope permits.

## Abuse prevention for operators

An anonymous media relay can create material bandwidth, copyright, and platform-policy risk. The included in-memory limits are a baseline for one small container, not a complete public-abuse system.

Production operators should:

1. require authentication or a private API key and issue per-user quotas;
2. use Redis or another shared store for rate limits and jobs before scaling beyond one instance;
3. set a strict monthly egress cap and monitor response bytes, temporary disk, FFmpeg CPU, child count, and error codes;
4. start with `DOWNLOAD_MAX_CONCURRENT=1`, a small `DOWNLOAD_MAX_FILE_MB`, and a short `DOWNLOAD_MAX_DURATION`;
5. keep playlists and live streams disabled;
6. publish an abuse/DMCA contact and act on valid reports;
7. review the host and source platform terms for the actual deployment;
8. redact request bodies and source URLs from logs and keep short retention;
9. rebuild monthly and promptly for Node.js, Next.js, `yt-dlp`, FFmpeg, Python, and OS security updates;
10. never disable TLS verification or use cookies/proxies to evade private, paid, or DRM access controls.

## Cookies and proxies

`YT_DLP_COOKIES` accepts only an operator-controlled **path** to a mounted Netscape-format cookie file. Never put cookie contents in an environment variable, image layer, Git commit, support issue, or log. Use least-privilege file permissions and an account authorized for the intended public media. Visitors cannot upload cookies.

`YT_DLP_PROXY` can contain proxy credentials and must be managed as a deployment secret. The proxy operator can observe outbound destinations and traffic metadata. A proxy does not make an otherwise prohibited download acceptable.
