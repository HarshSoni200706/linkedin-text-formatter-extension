# LinkedIn Text Formatter Extension

A lightweight Chrome Extension that enables users to highlight text directly inside LinkedIn's post editor and convert it into styled Unicode text (Bold, Italic, Bold Italic, Underline, and Double Underline).

---

## Problem Statement

LinkedIn's post editor does not provide native rich text formatting (bolding, italics, or underlining) for normal posts. Users who want to emphasize headings, bullet points, or key takeaways are often forced to use external third-party converter websites, copy text back and forth, and re-format manually—breaking their writing workflow.

## Proposed Solution

The **LinkedIn Text Formatter Extension** inserts an inline floating toolbar whenever text is highlighted inside LinkedIn's post creation modal. Users can convert selected text to five distinct Unicode formatting styles with a single click or keyboard shortcut, completely locally and seamlessly within their workflow.

---

## MVP Features

- **Direct LinkedIn Integration:** Works directly within LinkedIn's post creation modal (supports direct-document and open Shadow DOM composers).
- **Five Supported Text Styles:**
  - **Bold** (`𝐁𝐨𝐥𝐝`)
  - *Italic* (`𝐼𝑡𝑎𝑙𝑖𝑐`)
  - ***Bold Italic*** (`𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄`)
  - <u>Underline</u> (`U̲n̲d̲e̲r̲l̲i̲n̲e̲`)
  - <u>̲Double Underline</u> (`D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̳e̳`)
- **Inline Floating Toolbar:** Appears positioned near selected text with minimal disruption.
- **Full Keyboard & Mouse Support:** Accessible toolbar buttons with explicit aria-labels, focus indicators, and Escape key dismissal.
- **Extension Popup:** Accessible toolbar popup providing usage instructions, style previews, Unicode accessibility guidance, privacy guarantee, supported scope notice, and link to GitHub repository.
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

## Supported LinkedIn Editor Scope

> [!NOTE]
> **Version 1 Scope Notice:** This extension is designed specifically for LinkedIn's **Create a Post** composer (supporting both direct-document and open Shadow DOM modal variations). 
> 
> Comments, direct messaging, search boxes, group posts, and pulse article editors are **not** currently supported in Version 1. The extension silently ignores text selections in unsupported fields to prevent disruption to standard LinkedIn usage.

---

## Interaction Workflows

### Mouse Workflow
1. Highlight text inside LinkedIn's Create a Post editor using mouse drag or double/triple click.
2. The inline floating toolbar appears directly above (or below) the selection.
3. Click any of the 5 formatting buttons.
4. The text is transformed instantly, focus returns to the editor, and the caret is placed after the inserted formatted text.

### Keyboard Workflow
1. Highlight text inside LinkedIn's Create a Post editor using `Shift + Arrow keys` or `Ctrl + A`.
2. Press `Tab` to shift focus into the floating formatting toolbar.
3. Use `Tab` / `Shift + Tab` to move between formatting buttons (focus ring is clearly visible in both light and dark themes).
4. Press `Enter` or `Space` to activate the chosen formatting style.
5. Press `Escape` at any time to dismiss the toolbar without altering selected text or corrupting the editor.

---

## Installation & Developer Mode Testing

To load the extension manually into Google Chrome for testing:

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the `linkedin-text-formatter-extension` folder.
5. Confirm that the extension appears in the list without any manifest or syntax errors.

---

## User Experience, Accessibility & Privacy (Phase 10 Audit)

### Accessible Button Naming & Focus Indicators
- Every toolbar button is a semantic `<button type="button">` with descriptive accessible names:
  - `Format selected text as Bold`
  - `Format selected text as Italic`
  - `Format selected text as Bold Italic`
  - `Format selected text as Underline`
  - `Format selected text as Double Underline`
- High-contrast `:focus-visible` outline rings are implemented for both Light (`#0a66c2`) and Dark (`#70b5f9`) appearance themes.
- Contrast ratios pass WCAG AA requirements across all text elements (4.5:1 for normal text, 3:1 for UI focus rings).

### Reduced-Motion Support
- Respects system preferences via `@media (prefers-reduced-motion: reduce)`.
- Transitions, transforms, and animations are disabled for users with reduced motion preferences.

### Privacy Audit & Zero Data Transmission
- **100% Local Processing:** Your text is processed locally in your browser. It is not uploaded, stored, or sent to a server.
- Zero analytics, tracking scripts, external fonts, remote resources, or network calls.
- Debug logging is disabled by default (`DEBUG = false`), ensuring clean production execution without user text logging.

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
│   │   ├── toolbar-manager.js
│   │   └── text-replacement-manager.js
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
    ├── editor-detector.test.js
    ├── selection-manager.test.js
    ├── toolbar-manager.test.js
    ├── text-replacement-manager.test.js
    ├── popup.test.js
    ├── ux-accessibility.test.js
    ├── runner.html
    └── test-cases.md
```

---

## Running Automated Test Suites

The extension contains **212 zero-dependency unit tests** across 7 test suites.

To run all automated tests in Terminal using Node.js:
```bash
node tests/formatter.test.js
node tests/editor-detector.test.js
node tests/selection-manager.test.js
node tests/toolbar-manager.test.js
node tests/text-replacement-manager.test.js
node tests/popup.test.js
node tests/ux-accessibility.test.js
```

---

## Current Development Status

* **Active Phase:** Phase 10 — User Experience and Accessibility (Implementation complete, 212 Node unit tests passing across 7 test suites, pending manual browser accessibility and zoom verification).
* **Next Phase:** Phase 11 — Testing and Quality Assurance.

---

## License

This project is licensed under the [MIT License](LICENSE).
