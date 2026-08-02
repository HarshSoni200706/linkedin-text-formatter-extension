# LinkedIn Text Formatter Extension

A lightweight Chrome Extension that enables users to highlight text directly inside LinkedIn's post editor and convert it into styled Unicode text (Bold, Italic, Bold Italic, Underline, and Double Underline).

---

## Problem Statement

LinkedIn's post editor does not provide native rich text formatting (bolding, italics, or underlining) for normal posts. Users who want to emphasize headings, bullet points, or key takeaways are often forced to use external third-party converter websites, copy text back and forth, and re-format manually—breaking their writing workflow.

## Proposed Solution

The **LinkedIn Text Formatter Extension** inserts an inline floating toolbar whenever text is highlighted inside LinkedIn's post creation modal. Users can convert selected text to five distinct Unicode formatting styles with a single click, completely locally and seamlessly within their workflow.

---

## MVP Features

- **Direct LinkedIn Integration:** Works directly within LinkedIn's post creation modal.
- **Five Supported Text Styles:**
  - **Bold** (e.g., 𝑩𝒐𝒍𝒅 or 𝐁𝐨𝐥𝐝)
  - *Italic* (e.g., 𝑰𝒕𝒂𝒍𝒊𝒄 or 𝐼𝑡𝑎𝑙𝑖𝑐)
  - ***Bold Italic*** (e.g., 𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄)
  - <u>Underline</u> (Combining Unicode Low Line)
  - <u>̲Double Underline</u> (Combining Unicode Double Low Line)
- **Inline Floating Toolbar:** Appears positioned near selected text with minimal disruption.
- **Local Processing:** 100% client-side text conversion with zero data transmission or tracking.

---

## Technology Stack

- **Extension Specification:** Chrome Extension Manifest V3
- **Programming Language:** JavaScript (ES6+)
- **Markup & Styling:** HTML5, Vanilla CSS
- **Frameworks / Libraries:** None (Framework-free, lightweight)
- **Backend / Database / APIs:** None

---

## Permissions & Scope

To maintain security, privacy, and performance, this extension follows the principle of least privilege:
- **No requested permissions:** Does not require broad permissions like `storage`, `activeTab`, or `<all_urls>`.
- **Domain Restricted:** The content script is restricted strictly to matching URL patterns on LinkedIn (`https://www.linkedin.com/*`). It cannot run or access any other websites.

---

## Installation & Developer Mode Testing

To load the extension manually into Google Chrome for testing:

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the `linkedin-text-formatter-extension` folder.
5. Confirm that the extension appears in the list without any manifest or syntax errors.

### Verifying Extension Components

- **Testing the Popup:** Click the extension icon in Chrome's toolbar (or pinned extensions menu). The popup should open displaying the Phase 3 status message.
- **Testing the Content Script:**
  1. Open [LinkedIn](https://www.linkedin.com/).
  2. Open Chrome Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
  3. Open the **Console** tab.
  4. Look for the message: `[LinkedIn Text Formatter] Content script loaded successfully on LinkedIn.`

---

## Unicode Formatting Engine

This project contains a standalone, zero-dependency Unicode formatting engine. It transforms plain text into stylized representations without using HTML or CSS.

### Native Rich Text vs. Unicode Styling
- **Native Rich Text:** Uses markup tags (`<b>`, `<i>`, `<u>`) or styling properties to change the presentation layer. It preserves the underlying standard ASCII characters.
- **Unicode Styling:** Modifies the actual text data by converting characters to specific mathematical alphanumeric code points. This allows the styled text to persist when copied and pasted onto platforms that only support plain text, such as LinkedIn.

### Supported Characters & Formatting Logic
- **Bold (`bold`):** Translates standard English uppercase `A–Z` and lowercase `a–z` to Mathematical Bold Serif equivalents, and digits `0–9` to Mathematical Bold digits.
- **Italic (`italic`):** Translates standard English uppercase `A–Z` and lowercase `a–z` to Mathematical Italic Serif equivalents. Digits are left unstyled as the Unicode italic serif alphabet does not define italic digits.
  - *Exception:* Lowercase italic `h` is mapped to the Planck Constant (`ℎ`, `U+210E`) because `U+1D455` is undefined in the standard mathematical Unicode block.
- **Bold Italic (`bold-italic`):** Translates uppercase `A–Z` and lowercase `a–z` to Mathematical Bold Italic Serif equivalents. Digits are left unstyled.
- **Underline (`underline`):** Appends U+0332 (`COMBINING LOW LINE`) to each eligible character.
- **Double Underline (`double-underline`):** Appends U+0333 (`COMBINING DOUBLE LOW LINE`) to each eligible character.

### Non-ASCII and Unsupported Characters
Punctuation, emojis, hashtags, URLs, and non-Latin alphabets (such as Chinese, Hindi, etc.) are **not** modified. Emojis and newlines are skipped when applying underline combining marks to avoid visual layout corruption.

### Idempotency & Normalization
To prevent stacked transformations or corrupted text, the formatting engine automatically passes all input through a normalizer (`src/formatter/text-normalizer.js`) before applying a new style. The normalizer maps styled Unicode characters back to their plain ASCII counterparts and strips existing U+0332/U+0333 combining marks.

---

## Running Formatter Tests

The formatter test suite runs 26 test cases verifying various text conversions, edge cases, and normalization behaviors.

### Running Tests via Browser (Zero Dependencies)
Since Node.js is not required, tests can be run directly inside any modern web browser:
1. Open the file `tests/runner.html` in your browser.
2. The page will dynamically execute `tests/formatter.test.js` and render the pass/fail results in a clear green/red interface.

### Running Tests via Node.js
If Node.js is available on your system, you can run the test suite in the terminal:
```bash
node tests/formatter.test.js
```

---

## Important Unicode Accessibility Limitation

> [!WARNING]
> **Accessibility Notice:** Styled text generated by this extension uses mathematical and stylized Unicode code points rather than semantic HTML (`<b>`, `<i>`) or CSS styles. Some screen readers (used by visually impaired users) may read Unicode formatted text character-by-character, pronounce mathematical symbol names, or skip them entirely. 
> 
> **Best Practice:** Use Unicode styling sparingly—primarily for short headings, single keywords, or key emphasis—and avoid converting entire paragraphs.

---

## Project Structure

```text
linkedin-text-formatter-extension/
│
├── manifest.json
├── README.md
├── LICENSE
├── .gitignore
├── tasks.md
│
├── src/
│   ├── content/
│   │   ├── content-script.js
│   │   ├── selection-manager.js
│   │   ├── editor-manager.js
│   │   └── toolbar-manager.js
│   │
│   ├── formatter/
│   │   ├── unicode-maps.js
│   │   ├── text-formatter.js
│   │   └── text-normalizer.js
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   │
│   ├── styles/
│   │   └── content-toolbar.css
│   │
│   └── shared/
│       ├── constants.js
│       └── utilities.js
│
├── assets/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-32.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   │
│   └── screenshots/
│
└── tests/
    ├── formatter.test.js
    ├── runner.html
    └── test-cases.md
```

---

## LinkedIn Editor Detection (Phase 5)

The extension includes a highly robust, modular editor-detection API located in `src/content/editor-manager.js`.

### Verification Status Matrix

* **Directly Verified Behavior (Offline Mock DOM):**
  * Resolution of child/text nodes to contenteditable roots.
  * Rejection of `input` and `textarea` elements.
  * Exclusion of search containers (via role `"search"`, `"searchbox"`, or class matches).
  * Exclusions for comments and messaging overlays using structural selectors.
  * Rejection of excluded dialog boxes (settings, filters, profiles).
  * Verification of the post composer dialog modal ancestor OR route-based `/sharing/compose` composer.
* **Structurally Inferred Behavior (Production Hypotheses):**
  * It is inferred that LinkedIn post composers will reside within wrappers having `role="dialog"`, `aria-modal="true"`, or classes like `share-creation-state`/`share-box`, OR on the `/sharing/compose` composer page route combined with a `role="textbox"` contenteditable.
  * It is inferred that comment editors will be housed under ancestors containing class tags with `"comment"` (such as `comments-comment-box`).
  * It is inferred that messaging editors will be nested inside forms/areas containing class tags with `"msg-"` or `"messaging"`.
* **Manual LinkedIn testing still required:**
  * Live verification of editor identification inside the actual LinkedIn web app (both modal popup and sharing composer page).
  * Verification that localized interfaces (non-English layouts) correctly resolve structures and exclude comments/messages (the English `aria-label`/`placeholder` checks have been demoted to secondary fallback status to aid localization, but manual confirmation is essential).
  * Route changes and dynamic modal opening sequence on the live website.

### Supported Editors
* **Create a Post Editor:** The main rich text editor inside the post-creation modal popup (on LinkedIn Home page, Feed, Groups, etc.) as well as the full-page route-based sharing composer (`/sharing/compose`).

### Intentionally Excluded Editors
* **Search and Navigation inputs:** All input/textarea fields in search bars or filters.
* **Comment Editors:** Rich comment-composer boxes under posts.
* **Messaging Editors:** Chat/messaging composers (overlays and full message page).
* **Profile / Article Editors:** Profile-edit fields and Pulse article/newsletter textareas.

### Robust Detection Details
* **Anti-fragility:** Instead of relying on volatile, minified, or generated LinkedIn CSS classes, the detector looks for stable semantic structures. It uses a **scored multi-signal approach** combining `contenteditable="true"` properties, accessible role types (`role="textbox"`), current URL pathnames (`/sharing/compose`), optional dialog wrappers (`role="dialog"`, `aria-modal="true"`), parent hierarchy traversal, and localized-label-safe checks.
* **Dynamic Modals & SPA Navigation:** Handled efficiently using **document-level event delegation** (`focusin` and `click` listeners) which captures dynamically generated dialog editors without continuous DOM polling or expensive `MutationObserver` overhead. Rather than monkey-patching the History API in the isolated content-script world, route changes are tracked by re-evaluating the URL whenever user interaction occurs or on `popstate` events, resetting the active editor cached reference.

### Running Editor Detection Tests
To verify the detector's logic offline in a simulated environment, execute the zero-dependency Node.js test runner:
```bash
node tests/editor-detector.test.js
```

---

## Text Selection Management (Phase 6)

The extension contains a memory-only selection manager API in `src/content/selection-manager.js` that tracks, preserves, and restores user-selected text boundaries.

### How Selections are Validated
A selection is classified as valid only when:
* A non-collapsed range is actively highlighted inside the browser window.
* The selected content is not empty or composed entirely of whitespace.
* Both start and end boundaries resolve to the exact same supported LinkedIn post-editor.
* The editor and the selected text nodes remain attached to the document body.

### Cloned Range Storage & Stale Range Rejection
* **In-Memory Range Capture:** Valid selections are copied in memory using `Range.cloneRange()` alongside selection direction metadata (RTL vs LTR).
* **Automatic Eviction:** Stale ranges are immediately cleared when the editor is disconnected, boundary nodes are removed, route changes occur, or the post modal is closed.

### Protected Interaction Support for Toolbar
To support the future floating formatting toolbar, the manager offers a state-locking mechanism (`beginProtectedInteraction` / `endProtectedInteraction` / `isExtensionElement`). During a protected interaction, focus shifts to toolbar buttons will not cause the selection manager to prematurely wipe the saved range.

### Privacy Behavior
* The selection manager operates entirely in local memory.
* Selected text contents are never stored in `chrome.storage`, written to persistent disks, logged to the console, or transmitted over network sockets.

### Running Selection Manager Tests
To execute the zero-dependency SelectionManager unit tests, run:
```bash
node tests/selection-manager.test.js
```

---

## Floating Formatting Toolbar (Phase 7)

The extension includes a floating toolbar implementation in `src/content/toolbar-manager.js` and styling in `src/styles/content-toolbar.css`.

### When the Toolbar Appears
* Appears automatically near a valid text selection made within LinkedIn's supported post creation editor.
* Subscribes to `SelectionManager` events (`onSelectionValid` / `onSelectionInvalid`).
* Hides immediately when the selection becomes invalid, collapsed, cleared, or when pressing `Escape`.

### Five Available Actions
1. **Bold** (`B`)
2. **Italic** (`I`)
3. **Bold Italic** (`BI`)
4. **Underline** (`U`)
5. **Double Underline** (`U` with double underline styling)

> **Note:** During Phase 7, buttons emit action requests to subscribers via `onFormatAction`. Text replacement and formatting are executed in Phase 8. Buttons do NOT modify LinkedIn post content during Phase 7.

### Accessibility Behavior
* Built with native `<button type="button">` elements.
* Supports full keyboard navigation (`Tab`, `Shift + Tab`, `Enter`, `Space`).
* Features distinct focus rings (`:focus-visible`) and high-contrast styling for both light and dark page themes.
* Pressing `Escape` hides the toolbar cleanly.

### Selection-Protection Behavior
* Implements `pointerdown` and `mousedown` handlers calling `SelectionManager.beginProtectedInteraction()`.
* Toolbar clicks do not steal focus or cause `SelectionManager` to clear the saved range prematurely.

### Positioning Strategy
* Uses viewport-relative coordinates (`position: fixed`) derived from `Range.getBoundingClientRect()`.
* Automatically prefers placing above the selection, falling back below the selection or clamping within viewport margins (`8px`) if space is constrained.
* Repositions on window resize and scroll using `requestAnimationFrame`.

### Running Toolbar Manager Tests
To execute the zero-dependency ToolbarManager unit tests, run:
```bash
node tests/toolbar-manager.test.js
```

---

## Current Development Status

* **Active Phase:** Phase 7 — Floating Formatting Toolbar (Implementation completed, pending manual LinkedIn browser verification).
* **Next Phase:** Phase 8 — Replace Selected Text Inside LinkedIn.

---

## License

This project is licensed under the [MIT License](LICENSE).


