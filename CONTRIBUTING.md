# Contributing to LinkedIn Text Formatter

Thank you for your interest in contributing to the LinkedIn Text Formatter Chrome extension! This document outlines guidelines and instructions for contributing to this project.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and respectful environment for all contributors. Please ensure that all interactions remain professional, constructive, and civil.

---

## Development Prerequisites

To work on this extension, you will need:

- **Git** (for version control)
- **Node.js** (v14+ recommended, zero npm dependencies required) to execute the automated test suites
- **Google Chrome** (or Chromium-based browser) to test unpacked extension functionality

---

## Repository Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/HarshSoni200706/linkedin-text-formatter-extension.git
   cd linkedin-text-formatter-extension
   ```
2. Load the extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the project root directory (containing `manifest.json`)

---

## Branch Naming Conventions

Use clear, prefixed branch names:

- `feature/<short-description>` — New capabilities or enhancements
- `fix/<issue-description>` — Bug fixes and remediation
- `docs/<doc-description>` — Documentation updates
- `test/<test-description>` — Test suite enhancements
- `refactor/<scope>` — Code refactoring without behavioral changes

---

## Commit Message Conventions

Follow standard imperative commit prefix formatting:

- `feat:` — New feature implementation
- `fix:` — Bug fix or defect remediation
- `docs:` — Documentation additions or revisions
- `test:` — Test suite additions or modifications
- `refactor:` — Code changes that neither fix a bug nor add a feature
- `style:` — Formatting, whitespace, or visual styling adjustments
- `chore:` — Repository maintenance or file updates

---

## Running Automated Tests

The repository features zero-dependency Node test suites. Run tests using Node.js directly:

```bash
node tests/formatter.test.js
node tests/editor-detector.test.js
node tests/selection-manager.test.js
node tests/toolbar-manager.test.js
node tests/text-replacement-manager.test.js
node tests/popup.test.js
node tests/ux-accessibility.test.js
node tests/quality-assurance.test.js
node tests/security-privacy.test.js
node tests/documentation.test.js
```

Or run all suites in sequence:

```bash
for suite in tests/*.test.js; do node "$suite"; done
```

Every PR must pass **100% of automated tests** with 0 failures before merging.

---

## Manual Browser Testing Requirements

In addition to automated Node tests, contributors must manually verify changes in Google Chrome:

1. **Test Layout A (Direct-Document Composer):**
   - Click "Start a post" on `https://www.linkedin.com/feed/` or `/sharing/compose`.
   - Select plain text and verify the floating toolbar appears.
   - Apply formatting and verify Unicode conversion.

2. **Test Layout B (Open Shadow DOM Composer):**
   - Open LinkedIn's modal composer (`DIV.ql-editor` inside `DIV#interop-outlet` shadow host).
   - Select text, apply formatting, and ensure canonical toolbar reuse.

3. **Verify Protected Entities:**
   - Ensure the toolbar is **rejected** for selections overlapping links (`a[href]`), mentions (`@name`), protected elements, or plain-text URLs (`https://...`).

---

## Key Development Rules & Constraints

### 1. Privacy & Telemetry
- **Zero data collection:** Never log, store, or transmit selected text, formatted output, URLs, or user information.
- **`DEBUG = false`:** Ensure production code keeps `DEBUG = false` across all modules.

### 2. Security Requirements
- **Zero permissions:** Do not add Chrome permissions (`storage`, `tabs`, `clipboardRead`, etc.) to `manifest.json`.
- **Restricted host matches:** Host match patterns must remain strictly `https://www.linkedin.com/*`.
- **No unsafe JavaScript:** Do not use `eval()`, `new Function()`, `document.write()`, `innerHTML`, or string-based `setTimeout()`.
- **Local assets only:** Do not import remote scripts, stylesheets, fonts, or CDN assets.

### 3. Preservation of Composer Layouts
- Changes must support **both** Layout A (direct-document) and Layout B (open Shadow DOM `.ql-editor`) post editors.
- Do not break Shadow DOM boundary resolution (`composedPath()`, `getRootNode()`).

### 4. Regression Coverage
- Every bug fix or defect resolution **must** include a new automated regression test in `tests/quality-assurance.test.js` or the relevant module test suite.

---

## Pull Request Expectations

Before opening a Pull Request:

1. Run all 10 automated test suites and ensure **0 failures**.
2. Perform manual Chrome testing across both composer layouts.
3. Ensure no trailing whitespace or unnecessary file modifications exist (`git diff`).
4. Provide a detailed PR description referencing the issue or task being addressed.
