# Changelog

All notable changes to the LinkedIn Text Formatter Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

*(Nothing pending at this time.)*

---

## [1.0.0]

First stable release of the LinkedIn Text Formatter Chrome extension.

### Added

- **Five Unicode Formatting Styles:**
  - **Bold:** Mathematical Bold (`𝐁𝐨𝐥𝐝` — Unicode Mathematical Bold block)
  - **Italic:** Mathematical Italic (`𝐼𝑡𝑎𝑙𝑖𝑐` — U+1D455 Planck-constant exception handled)
  - **Bold Italic:** Mathematical Bold Italic (`𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄`)
  - **Underline:** Combining Low Line U+0332 (`U̲n̲d̲e̲r̲l̲i̲n̲e̲`)
  - **Double Underline:** Combining Double Low Line U+0333 (`D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̳e̳`)

- **LinkedIn Editor Detection:**
  - Multi-signal scoring engine supporting two post-creation editor layouts:
    - **Layout A:** Direct-document LinkedIn Create a Post composer
    - **Layout B:** Open Shadow DOM composer (`DIV.ql-editor` inside `DIV#interop-outlet`)
  - `event.composedPath()` resolution across Shadow DOM boundaries
  - Explicit exclusion of comments, messaging, search, article editors, CAPTCHAs, and `.ql-clipboard` helper elements

- **Floating Contextual Toolbar:**
  - Single canonical toolbar instance dynamically reparented across DOM and Shadow DOM hosts
  - Viewport-boundary clamping and debounced scroll/resize repositioning
  - Smooth show/hide transitions

- **Extension Information Popup:**
  - Displays usage steps, style previews, version (`v1.0.0`), "100% Local" badge, accessibility warning, and privacy guarantee
  - Version read dynamically from `chrome.runtime.getManifest()` — no hard-coded duplication
  - Offline-capable; links to GitHub repository for source reference

- **Protected Entity & URL Safeguards (QA-001):**
  - Selections overlapping links (`a[href]`), mentions (`@name`), protected rich-text entities, and plain-text URLs (`https://`, `http://`, `www.`, bare domains, percent-encoded queries, hash fragments) are detected and rejected before formatting
  - Prevents destruction of LinkedIn link entities and Quill link nodes

- **Keyboard Accessibility:**
  - `Tab` focus navigation across toolbar buttons
  - `Enter` / `Space` activation
  - `Escape` dismissal

- **Reduced-Motion Support:**
  - All transitions respect `prefers-reduced-motion: reduce`

- **System Dark Mode:**
  - Toolbar and popup respect `prefers-color-scheme: dark`

- **Privacy Safeguards:**
  - 100% in-browser local text conversion — no network requests
  - Zero permissions declared (`"permissions": []`)
  - Host access restricted to `https://www.linkedin.com/*`
  - `DEBUG = false` in all content script modules — zero production console output
  - No `chrome.storage`, `localStorage`, `sessionStorage`, IndexedDB, or cookie usage
  - Root-level `PRIVACY.md` policy document

- **Security:**
  - Manifest V3 platform with default-strict CSP
  - No `eval`, `new Function`, `innerHTML`, `document.write`, or remote assets
  - All scripts, styles, and assets bundled locally
  - Full Phase 12 security audit documented at `docs/security/phase-12-security-review.md`

- **Automated Test Suite:**
  - 10 zero-dependency Node test suites, 557+ assertions, 0 failures
  - Coverage: formatter engine, editor detection, selection management, toolbar lifecycle, text replacement, popup, UX/accessibility, quality assurance, security/privacy, and documentation

- **Documentation:**
  - Comprehensive `README.md` with 26 structured sections
  - `CONTRIBUTING.md`, `CHANGELOG.md`, `PRIVACY.md`
  - Developer guides: Unicode mapping maintenance, LinkedIn editor detection
  - Release documentation: packaging, release notes, store listing
  - Manual testing checklist (`docs/testing/manual-testing-checklist.md`)
  - Phase 11 QA report and Phase 12 security review
