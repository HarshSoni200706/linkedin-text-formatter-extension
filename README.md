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
- **Extension Popup:** Accessible toolbar popup providing usage instructions, style previews, Unicode accessibility guidance, privacy guarantee, and link to GitHub repository.
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

- **Testing the Popup:** Click the extension icon in Chrome's toolbar (or pinned extensions menu). The popup should open displaying the usage instructions, supported styles, accessibility notice, privacy statement, and manifest version.
- **Testing the Content Script:**
  1. Open [LinkedIn](https://www.linkedin.com/).
  2. Open Chrome Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`).
  3. Open the **Console** tab.
  4. Look for the message: `[LinkedIn Text Formatter] Editor detector initialized.`

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

## Important Unicode Accessibility Limitation

> [!WARNING]
> **Accessibility Notice:** Styled text generated by this extension uses mathematical and stylized Unicode code points rather than semantic HTML (`<b>`, `<i>`) or CSS styles. Some screen readers (used by visually impaired users) may read Unicode formatted text character-by-character, pronounce mathematical symbol names, or skip them entirely. 
> 
> **Best Practice:** Use Unicode styling sparingly—primarily for short headings, single keywords, or key emphasis—and avoid converting entire paragraphs.

---

## Extension Popup (Phase 9)

The extension includes a lightweight, offline-ready Chrome toolbar popup (`src/popup/popup.html`).

### Key Information Displayed
- **Header:** Extension icon, name, dynamically populated version (`chrome.runtime.getManifest().version`), and a "100% Local" privacy badge.
- **How to Use:** Clear step-by-step instructions for selecting text in LinkedIn's post editor and formatting it.
- **Supported Styles Preview:** Live visual previews of all five formatting options (`𝐁𝐨𝐥𝐝`, `𝐼𝑡𝑎𝑙𝑖𝑐`, `𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄`, `U̲n̲d̲e̲r̲l̲i̲n̲e̲`, `D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̲e̲`) alongside plain-text labels.
- **Accessibility Warning:** Explicit notice regarding screen reader behavior on Unicode text.
- **Privacy Statement:** Guarantee that text processing occurs 100% locally in the browser with zero external server communication.
- **GitHub Repository Link:** Direct link to the source repository (`https://github.com/HarshSoni200706/linkedin-text-formatter-extension`).

### Product Decision: No Enable/Disable Toggle in Version 1
Version 1 intentionally omits an enable/disable toggle and Chrome Storage permission:
- The floating toolbar is strictly scoped to valid text selections inside supported LinkedIn post editors.
- The extension content script does not execute on unrelated web pages.
- Omitting the toggle preserves minimum permission scope (`storage` permission is not requested).

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
    ├── runner.html
    └── test-cases.md
```

---

## Text Replacement Engine (Phase 8)

Phase 8 connects the floating toolbar to the Unicode formatting engine via `src/content/text-replacement-manager.js`.

### How Formatting is Applied
When a toolbar action button is activated:
1. **Context & Selection Validation:** Confirms valid active selection, range attachment, and editor connectivity.
2. **Entity Protection Check:** Inspects selected contents for atomic non-editable entities (e.g., LinkedIn mentions, entity cards, or `contenteditable="false"` nodes). If present, formatting aborts safely.
3. **Selected-Text Reading & Conversion:** Reads `range.toString()`, normalizes existing Unicode marks, and applies the chosen style (`bold`, `italic`, `bold-italic`, `underline`, `double-underline`).
4. **Insertion Strategy:** 
   - **Primary Strategy:** Uses `document.execCommand('insertText', false, formattedText)` while the range is restored. This native browser text command replaces the selected range, triggers LinkedIn's editor state listeners, and preserves browser native `Ctrl+Z` undo history.
   - **Fallback Strategy:** Uses DOM Range operations (`range.deleteContents()`, `range.insertNode(textNode)`), dispatches synthetic input events, and performs safe rollback if an exception occurs.
5. **Event Notification:** Dispatches a composed, bubbling `InputEvent` (`inputType: 'insertText'`) on the editor element to notify LinkedIn's post composer of state changes.
6. **Caret Placement & Focus:** Collapses the caret immediately after the inserted formatted text, restores editor focus, and allows the user to continue typing naturally.
7. **Toolbar Hiding & Cleanup:** Hides the toolbar with reason `'formatting-applied'`, clears the saved selection, and ends protected interaction safely.

---

## Running Automated Test Suites

The extension contains 183 zero-dependency unit tests across 6 test suites.

To run all automated tests in Terminal using Node.js:
```bash
node tests/formatter.test.js
node tests/editor-detector.test.js
node tests/selection-manager.test.js
node tests/toolbar-manager.test.js
node tests/text-replacement-manager.test.js
node tests/popup.test.js
```

---

## Current Development Status

* **Active Phase:** Phase 9 — Extension Popup (Implementation complete, 183 Node unit tests passing across 6 test suites, pending manual browser check of toolbar popup UI).
* **Next Phase:** Phase 10 — Manual Quality Assurance & Edge Case Hardening.

---

## License

This project is licensed under the [MIT License](LICENSE).
