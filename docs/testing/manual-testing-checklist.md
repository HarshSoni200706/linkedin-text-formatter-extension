# Manual Testing Checklist

**Extension Name:** LinkedIn Text Formatter  
**Target Environment:** Google Chrome / Chromium  
**Host Site:** `https://www.linkedin.com`  
**Test Date:** `[YYYY-MM-DD]`  
**Tester Name:** `[Tester Name]`  
**Browser Version:** `[Chrome Version]`  

---

## 1. Extension Installation & Loading

- [ ] Load unpacked extension from `chrome://extensions/`.
  - **Result:** Extension loads cleanly with name "LinkedIn Text Formatter" v0.1.0.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Inspect permissions in Chrome extension details page.
  - **Result:** Shows "No permissions requested" and site access restricted to `https://www.linkedin.com`.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Open extension popup from toolbar icon.
  - **Result:** Popup displays title, version badge `v0.1.0`, "100% Local" badge, steps, style previews, accessibility warning, privacy note, and GitHub footer link.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 2. Direct-Document Composer (Layout A)

- [ ] Open direct-document post composer (e.g., `/sharing/compose` or main feed "Start a post").
  - **Result:** Editor root recognized as Layout A.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text and verify floating toolbar placement.
  - **Result:** Floating toolbar appears above (or below) selection.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 3. Open Shadow DOM Composer (Layout B)

- [ ] Open LinkedIn modal post editor containing `DIV.ql-editor` inside `DIV#interop-outlet`.
  - **Result:** Selection manager resolves editable root inside ShadowRoot.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text inside Shadow DOM editor and apply formatting.
  - **Result:** Floating toolbar renders and reparents canonical instance cleanly into shadow host context.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 4. Five Formatting Styles Verification

- [ ] Select plain text and click **Bold** (`B`).
  - **Result:** Text converts to Mathematical Bold (`𝐁𝐨𝐥𝐝`).
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text and click **Italic** (`I`).
  - **Result:** Text converts to Mathematical Italic (`𝐼𝑡𝑎𝑙𝑖𝑐`, verifying U+1D455 for lowercase 'h').
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text and click **Bold Italic** (`BI`).
  - **Result:** Text converts to Mathematical Bold Italic (`𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄`).
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text and click **Underline** (`U`).
  - **Result:** Text converts with Combining Low Line U+0332 (`U̲n̲d̲e̲r̲l̲i̲n̲e̲`).
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select plain text and click **Double Underline** (`U=`).
  - **Result:** Text converts with Combining Double Low Line U+0333 (`D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̲e̳`).
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 5. Mixed Content & Formatting Scenarios

- [ ] Format selection containing numbers (`0-9`) and punctuation (`!?,.`).
  - **Result:** Numbers convert to bold/italic digits; punctuation remains preserved.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Format multiline text selection spanning multiple paragraphs.
  - **Result:** All lines convert cleanly while preserving line breaks.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Apply repeated formatting styles sequentially to the same selection.
  - **Result:** Character normalization handles conversion cleanly without corrupting characters.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 6. Editor Interaction & Caret Continuity

- [ ] Test native browser Undo (`Ctrl+Z` / `Cmd+Z`) after formatting.
  - **Result:** Original unformatted text is restored.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Test native browser Redo (`Ctrl+Y` / `Cmd+Shift+Z`) after undoing.
  - **Result:** Formatted Unicode text is reapplied.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Continue typing immediately after applying a style.
  - **Result:** Caret is placed at the end of the formatted selection; typing continues normally in standard font.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 7. Protected Entity & URL Rejection (QA-001)

- [ ] Select text overlapping a LinkedIn link (`a[href]`).
  - **Result:** Toolbar is rejected; no formatting applied.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select text overlapping a LinkedIn mention (`@Name`).
  - **Result:** Toolbar is rejected; mention entity preserved.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Select a plain-text URL (e.g., `https://example.com/path?arg=1#hash`).
  - **Result:** Toolbar does not appear; plain-text URL is protected.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 8. Post Publishing & Persistence

- [ ] Format text in post composer and click **Post** to publish.
  - **Result:** Post publishes successfully; formatted Unicode characters remain visible on the LinkedIn feed.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 9. Composer Lifecycle & Routing

- [ ] Close post composer, reopen it, and select text.
  - **Result:** Floating toolbar reappears cleanly; no stale state or duplicate toolbars.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Navigate between LinkedIn feed, profile, and jobs (SPA route changes) while composer is open.
  - **Result:** Extension detects route change and resets active editor references gracefully.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 10. Display, Resolution & Theme Variations

- [ ] Test at browser zoom levels (80%, 100%, 125%, 150%).
  - **Result:** Toolbar remains correctly positioned near selection.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Test on smaller laptop screen resolutions (e.g., 1280x800, 1366x768).
  - **Result:** Toolbar clamps cleanly within viewport bounds without overflowing screen edges.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Test in LinkedIn Light appearance and Dark appearance.
  - **Result:** Toolbar matches dark mode styles cleanly via `prefers-color-scheme`.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 11. Unsupported Editor Exclusion

- [ ] Click and select text inside LinkedIn Comment box.
  - **Result:** Extension ignores selection; floating toolbar does NOT appear.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Click and select text inside LinkedIn Messaging box.
  - **Result:** Extension ignores selection; floating toolbar does NOT appear.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Click inside LinkedIn Search box or Article editor.
  - **Result:** Extension ignores selection; toolbar does NOT appear.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 12. Console Errors & Lifecycle Inspection

- [ ] Open Chrome DevTools Console during full usage session.
  - **Result:** Zero uncaught exceptions; zero user text logged in console.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 13. Performance & Memory Stability

- [ ] Perform 20+ consecutive selection and formatting operations.
  - **Result:** Operations respond instantaneously (<50ms); single toolbar instance retained in DOM; no memory leaks.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 14. Privacy & Security Audit

- [ ] Open DevTools Network tab during selection and formatting.
  - **Result:** Zero network requests originating from extension.
  - **Evidence:** `[Pass / Fail / Notes]`
- [ ] Inspect DevTools Application tab (Storage, Cookies, IndexedDB).
  - **Result:** Zero extension entries or stored user text.
  - **Evidence:** `[Pass / Fail / Notes]`

---

## 15. Final Release Sign-Off

- [ ] All manual test items marked PASS.
- [ ] All 10 automated test suites passing (440+ tests, 0 failures).
- [ ] Privacy and Security review requirements verified.

**Sign-off Status:** `[ APPROVED / REJECTED ]`  
**Date:** `[YYYY-MM-DD]`  
