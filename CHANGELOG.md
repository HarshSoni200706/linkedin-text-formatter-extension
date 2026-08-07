# Changelog

All notable changes to the LinkedIn Text Formatter Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Manual documentation verification and screenshot capture
- Packaging for extension distribution

---

## [0.1.0]

### Added

- **Unicode Formatting Engine:**
  - Standardized character mapping and normalization for 5 text styles:
    - **Bold:** Mathematical Bold (`𝐁𝐨𝐥𝐝`)
    - **Italic:** Mathematical Italic (`𝐼𝑡𝑎𝑙𝑖𝑐`, U+1D455 exception handling)
    - **Bold Italic:** Mathematical Bold Italic (`𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄`)
    - **Underline:** Combining Low Line U+0332 (`U̲n̲d̲e̲r̲l̲i̲n̲e̲`)
    - **Double Underline:** Combining Double Low Line U+0333 (`D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̲e̲`)

- **LinkedIn Editor Detection:**
  - Multi-signal scoring engine supporting two LinkedIn post editor layouts:
    - **Layout A:** Direct-document LinkedIn Create a Post editor (`/sharing/compose`, modal dialogs)
    - **Layout B:** Open Shadow DOM composer (`DIV.ql-editor` inside `DIV#interop-outlet` shadow root)
  - Composed path resolution for Shadow DOM boundary crossing (`composedPath()`)
  - Explicit exclusion filters for comments, messaging, search boxes, CAPTCHAs, and `.ql-clipboard` helper elements

- **Floating Content Toolbar:**
  - Contextual floating toolbar positioned dynamically above/below user text selections
  - Single canonical toolbar instance reparented across DOM hosts
  - Smooth visibility transitions, viewport boundary clamping, and debounced repositioning on scroll/resize

- **Extension Information Popup:**
  - Polished popup displaying extension description, usage steps, supported style previews, accessibility advisory, local privacy guarantee, and dynamic manifest version
  - Offline-capable HTML/CSS with static GitHub link navigation

- **Protected Entity & URL Safeguards (QA-001):**
  - Detection and rejection of selections overlapping links (`a[href]`), mentions (`@name`), protected rich entities, and plain-text URLs (`https://`, `http://`, `www.`, bare domains, percent-encoded queries)
  - Prevents destruction of LinkedIn anchor structures and Quill link nodes

- **Accessibility & UX Features:**
  - Full keyboard activation (Enter/Space) and Escape key dismissal
  - ARIA toolbar roles, labels, and focus indicators
  - System dark mode support (`prefers-color-scheme: dark`) and reduced-motion support (`prefers-reduced-motion: reduce`)

- **Privacy & Security Safeguards:**
  - 100% local text conversion with zero network requests and zero background telemetry
  - Zero Chrome permissions declared (`permissions: []`)
  - Restricted host matching (`https://www.linkedin.com/*`)
  - Production log silencing (`DEBUG = false`)
  - Root privacy policy (`PRIVACY.md`) and security review suite (`docs/security/phase-12-security-review.md`)

- **Automated Test Suite:**
  - Comprehensive zero-dependency Node test suites covering formatting, editor detection, selection management, toolbar lifecycle, text replacement, popup behavior, UX/accessibility, quality assurance, security/privacy, and documentation.
