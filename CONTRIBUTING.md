# Contributing

Thanks for improving Final Vora Web.

1. Open an issue for substantial product or architecture changes.
2. Create a focused branch in your fork.
3. Install the exact dependency tree with `npm ci`.
4. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit --omit=dev`, and `git diff --check`.
5. Add or update tests for security boundaries and user-visible behavior.
6. Open a pull request explaining impact, screenshots for UI work, validation, privacy changes, and deployment implications.

Do not add features that bypass DRM, authentication, private-video controls, source restrictions, or TLS verification. Do not commit cookies, proxy credentials, tokens, downloaded media, APKs, archives, or private links. Mock source extraction in automated tests rather than relying on a live platform.

UI changes must preserve semantic HTML, keyboard access, visible focus, 44-pixel touch targets, reduced-motion behavior, mobile layout, and immediate loading/error feedback. Content must avoid fake metrics, fake reviews, affiliation claims, universal-compatibility claims, and inaccurate “on-device/no logs” language.
