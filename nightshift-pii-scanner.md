# Nightshift PII Exposure Scanner — quarzite

**Repo:** micr-dev/quarzite
**Date:** 2026-04-04
**Scanner:** Nightshift v3 (GLM 5.1)

## Summary

Static site (Win98 theme, HTML/CSS/JS). No server-side code, no databases, no user auth. PII exposure risk is minimal — this is a personal art portfolio with no forms, no logins, and no data collection.

## Findings

### P3 — Hardcoded Google API key in vendored dependency
- **File:** `jspaint/src/sessions.js:229`
- **Detail:** `apiKey: "AIzaSyBgau8Vu9ZE8u_j0rp-Lc044gYTX5O3X9k"`
- **Risk:** This is in the vendored jspaint submodule (upstream code). The key is a Firebase/Google API key which is typically restricted to a domain. However, it is committed in plaintext.
- **Recommendation:** This is in a git submodule (jspaint), not your own code. Consider forking jspaint and removing or rotating the key if it belongs to you. If it's the upstream author's key, no action needed on your end.

### P3 — No Content-Security-Policy headers
- **File:** `netlify.toml`
- **Detail:** No CSP headers configured. External scripts load from `unpkg.com` and `sleepie.uk`.
- **Risk:** If either CDN is compromised, malicious JS could execute on quarzite.micr.dev.
- **Recommendation:** Add CSP headers in `netlify.toml`:
  ```toml
  [[headers]]
    for = "/*"
    [headers.values]
      Content-Security-Policy = "default-src 'self'; script-src 'self' https://unpkg.com https://sleepie.uk; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:; media-src 'self'"
  ```

### P3 — localStorage used for easter egg state
- **File:** `js/app.js:23`
- **Detail:** `localStorage.setItem("eggFound", "1")` stores a simple flag.
- **Risk:** Negligible. No PII stored in localStorage.
- **Recommendation:** No action needed.

### P3 — No .gitignore for quarzite's own files
- **File:** Root directory
- **Detail:** No `.gitignore` file exists in the quarzite root. While the repo is mostly static assets, a `.gitignore` prevents accidental commits of editor files or OS artifacts.
- **Risk:** Low — the `.DS_Store` and similar files could be committed accidentally.
- **Recommendation:** Add a minimal `.gitignore`:
  ```
  .DS_Store
  Thumbs.db
  *.swp
  *.swo
  *~
  .idea/
  .vscode/
  ```

## Clean Areas

- **No hardcoded PII:** No emails, phone numbers, addresses, or real names in the site code.
- **No env secrets:** No `.env` files, no secret references in code.
- **No logging of user data:** No analytics, no tracking scripts beyond what's mentioned.
- **No unencrypted storage:** Static site, no storage layer.
- **.gitmodules:** Properly configured submodule reference.
- **gallery.json:** Contains only artist handles and social media URLs (public information).

## Verdict

**Low risk.** The site is a static art portfolio with no server-side logic. The only notable finding is a hardcoded Google API key in a vendored dependency (jspaint), which is an upstream issue. Adding CSP headers would harden the site against CDN compromise.
