# Nightshift: Code Review — Quarzite

**Repo:** micr-dev/quarzite
**Task:** code-review (Expert Review)
**Date:** 2026-04-03
**Reviewer:** Nightshift v3 (GLM 5.1)

---

## Executive Summary

Reviewed ~2,500 lines of JavaScript across 21 files (desktop + mobile) plus HTML, CSS, and JSON data. Quarzite is a Win98-themed personal art gallery with draggable windows, sound effects, an embedded jspaint clone, and a responsive mobile version.

**Overall quality:** Good for a personal project. Code is organized, IIFEs prevent global scope pollution, and accessibility is considered (aria attributes, keyboard navigation, lazy loading). The main concerns are XSS via innerHTML with unsanitized JSON data and some code duplication between desktop/mobile modules.

**Findings:** 0 P0, 1 P1, 4 P2, 6 P3

---

## Findings

### P1 — XSS via innerHTML with gallery.json Data

**Files:** `gallery.js` (line ~150), `mobile-viewer.js` (lines 37-47)
**Category:** Security

Gallery descriptions from `gallery.json` are injected via `innerHTML` without sanitization:

```javascript
// gallery.js
viewerDesc.innerHTML = imgObj.desc || "";
```

```javascript
// mobile-viewer.js
parts.push(
  `By <a href="${url}" target="_blank" rel="noopener noreferrer">${artist}</a>`
);
// ...
viewerMeta.innerHTML = parts.join(" • ");
```

The `desc` field in `gallery.json` already contains HTML (e.g., `<s>...</s><br>Found them!`). While this is a static personal site where the owner controls the JSON, if the JSON is ever sourced externally or user-contributed, this becomes a stored XSS vector.

**Risk:** Low (static JSON controlled by site owner), but the pattern is fragile.
**Recommendation:** Use a sanitization library (DOMPurify) or switch to `textContent` for non-HTML fields. At minimum, add a comment noting that `desc` intentionally contains HTML.

---

### P2 — Code Duplication: Desktop vs Mobile Modules

**Files:** `sounds.js` (20 lines) vs `mobile-sounds.js` (22 lines), `tabs.js` vs `mobile-tabs.js`

The mobile versions are near-identical to desktop but with different base paths. Example:

```javascript
// sounds.js
const base = "assets/w98sounds/";

// mobile-sounds.js  
const base = "w98sounds/"; // relative to assets/mobile.html
```

The only difference is the base URL. This could be unified with a path resolution function.

**Recommendation:** Create a shared `sounds-core.js` that accepts a base path parameter. Same pattern for gallery/viewer logic.

---

### P2 — No Error Boundary for Gallery Loading

**File:** `gallery.js` (lines ~80-130)

The gallery fetch doesn't handle network errors gracefully:

```javascript
const res = await fetch("data/gallery.json");
const data = await res.json();
```

If the fetch fails (CORS, 404, network error), the gallery strip is empty with no user feedback. The mobile version has a try/catch but just silently fails.

**Recommendation:** Show a fallback message ("Gallery unavailable") when fetch fails.

---

### P2 — run.js Contains Hardcoded Base64 GIF Data URI

**File:** `run.js` (10 lines)

The entire file is a single hardcoded base64-encoded GIF data URI. This is ~1.8KB of inline data that can't be cached separately by the browser.

**Recommendation:** Move to a standalone `.gif` file in assets/ and reference by URL.

---

### P2 — background.js Color Functions in Global Scope

**File:** `background.js` (124 lines)

Unlike all other modules which use IIFEs, `background.js` defines its functions globally:
- `hexToRgb`, `rgbToHsl`, `hslToRgb`, `rgbToHex`, `adjustLight`, etc.

These pollute the global namespace. While this works for a small project, it can cause naming conflicts.

**Recommendation:** Wrap in an IIFE and expose via `window.ColorUtils = { ... }` like other modules.

---

### P3 — Magic Numbers for Window Positions

**Files:** `notepad.js` (lines 26-27), `main.css` (lines 6-17)

Window positions are hardcoded pixel values:
```javascript
window: { left: 1143, top: 497, width: 382, height: 430 },
```

```css
--gallery-left: 231px;
--gallery-top: 148px;
```

These are designed for 1920×1080 (see `layout.js: DESIGN_WIDTH = 1920`). The scaling system handles other resolutions, but the initial positions are fragile.

**Recommendation:** Not actionable for a personal project, but worth noting for future redesigns.

---

### P3 — logo.js Has `<script>` Tags in JS File

**File:** `logo.js` (lines 1, 13)

The file wraps its code in `<script>` tags, which suggests it was originally inline HTML:
```javascript
<script>
  document.addEventListener("DOMContentLoaded", function () {
    // ...
  });
</script>
```

This will cause issues if loaded as a JS module or via `import`.

**Recommendation:** Remove the `<script>` wrapper tags.

---

### P3 — localStorage Used Without Feature Detection

**Files:** `tiles.js`, `controls.js`, `app.js`, `res-warning.js`, `notepad.js`

All modules use `localStorage` directly without checking availability. While `res-warning.js` wraps calls in try/catch, others don't. Private browsing in some browsers throws on `localStorage.setItem`.

**Recommendation:** Wrap localStorage access in try/catch consistently, or create a small storage utility module.

---

### P3 — Sound.play() Silently Swallows Errors

**Files:** `sounds.js` (line 17), `mobile-sounds.js` (line 18)

```javascript
a.play().catch(() => {});
```

Autoplay policy rejection is silently ignored. This is acceptable behavior but could mask other audio loading errors.

**Recommendation:** No action needed — this is standard practice for autoplay policy handling.

---

### P3 — debug.js Resize Grip Logic Doesn't Account for CSS Transform Scale

**File:** `debug.js` (lines 55-120)

The resize grip handlers calculate position from mouse deltas but don't divide by `currentScale` like `drag.js` does. This means debug resize operations are misaligned on scaled viewports.

**Recommendation:** Apply the same `window.AppLayout.getScale()` division used in `drag.js` (line 40-44).

---

### P3 — gallery.json Dates Are Not Validated

**File:** `gallery.js` (lines 23-34, sorting logic)

Dates from `gallery.json` are sorted as strings using `localeCompare`. This works for YYYY-MM-DD format but silently breaks for any other format. The `formatDate()` function uses `new Date(value)` which can produce unexpected results with ambiguous formats.

**Recommendation:** Not critical since the JSON is manually curated, but consider adding ISO date validation.

---

## Architecture Notes

### Positive Patterns
- **IIFE encapsulation** — All modules except `background.js` use IIFEs to avoid global scope pollution
- **Accessibility** — ARIA attributes on tabs, roles, keyboard navigation (arrow keys for tab switching)
- **Lazy loading** — Gallery images use `loading="lazy"` and `decoding="async"`
- **Responsive design** — Separate mobile layout with its own HTML/CSS/JS
- **Sound system** — Clean abstraction with volume control and graceful fallback
- **Win98 theming** — Consistent use of 98.css, authentic sound effects, pixel-perfect window management

### Code Statistics

| Metric | Value |
|--------|-------|
| Total JS files (quarzite-specific) | 21 |
| Total JS lines (quarzite-specific) | ~2,500 |
| HTML lines | 549 |
| CSS files | 2 |
| External dependency | 98.css (CDN), jspaint (embedded) |
| Global objects exposed | `W98`, `AppLayout`, `AppVolume`, `Tabs`, `Clippy`, `Notepad`, `DebugMode`, `window.openViewer` |

---

## Recommendations Summary

1. **P1:** Sanitize gallery.json HTML in `innerHTML` assignments (or document the intentional design)
2. **P2:** Unify desktop/mobile sound and gallery modules to reduce duplication
3. **P2:** Add error feedback for gallery fetch failures
4. **P2:** Extract `run.js` GIF to a static asset file
5. **P2:** Wrap `background.js` in IIFE
6. **P3:** Fix debug.js resize to account for viewport scale
7. **P3:** Remove `<script>` tags from `logo.js`
