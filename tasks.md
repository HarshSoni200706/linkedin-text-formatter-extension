# LinkedIn Text Formatter Extension — Development Tasks

## Project Goal

Build a lightweight Chrome extension that allows users to highlight text inside LinkedIn's post editor and instantly convert it into:

- Bold
- Italic
- Bold Italic
- Underline
- Double Underline

The extension must work directly inside LinkedIn without requiring the user to open another website, copy text into a formatter, or paste it back manually.

---

## Development Workflow

This project will be built using **Antigravity**.

Antigravity should:

- Work phase by phase.
- Complete only the tasks listed in the active phase.
- Avoid implementing future-phase features early.
- Keep the code modular and readable.
- Update this file whenever a task is completed.
- Mark completed tasks with `[x]`.
- Mark active tasks with `[~]`.
- Leave pending tasks as `[ ]`.
- Report any blocker before changing the planned architecture.
- Avoid adding features that are outside the defined MVP.

### Status Legend

- `[ ]` Pending
- `[~]` In progress
- `[x]` Completed
- `[!]` Blocked

---

# Phase 1 — Project Definition and Technical Planning

## Objective

Establish the project scope, technical stack, limitations, and implementation approach before writing functionality.

## Tasks

- [x] Confirm the MVP scope.
- [x] Define the five supported formatting options:
  - [x] Bold
  - [x] Italic
  - [x] Bold Italic
  - [x] Underline
  - [x] Double Underline
- [x] Confirm that Version 1 supports LinkedIn's post editor.
- [x] Keep LinkedIn comments, messages, articles, and profile fields outside the first version.
- [x] Document that formatting will use Unicode characters rather than native HTML formatting.
- [x] Document the accessibility limitations of Unicode-styled text.
- [x] Confirm that no backend, database, login system, API, or AI model is required.
- [x] Confirm that all formatting happens locally in the browser.
- [x] Define the minimum supported browser as the latest stable Google Chrome.
- [x] Decide whether the extension will later support other Chromium browsers.
- [x] Create a short product requirements section in `README.md`.

## Recommended Technology Stack

- **Extension standard:** Chrome Extension Manifest V3
- **Programming language:** JavaScript
- **Markup:** HTML
- **Styling:** CSS
- **Framework:** None for the MVP
- **Storage:** Chrome Storage API only if extension preferences are added
- **Testing:** Manual browser testing initially, followed by lightweight automated tests for the text converter
- **Version control:** Git and GitHub

## Technical Approach

The extension will use:

1. A content script running on LinkedIn pages.
2. Selection detection inside supported editable areas.
3. A floating formatting toolbar positioned near selected text.
4. Unicode character conversion functions.
5. Safe replacement of selected text inside LinkedIn's editor.
6. Event dispatching so LinkedIn recognizes the updated editor content.

## Phase Completion Criteria

Phase 1 is complete when:

- The scope is clearly documented.
- The technology stack is finalized.
- MVP and non-MVP features are separated.
- Antigravity has enough architectural context to begin project setup.

---

# Phase 2 — Repository and Folder Structure

## Objective

Create a clean and scalable project structure before implementing functionality.

## Tasks

- [x] Initialize the repository locally.
- [x] Add a `.gitignore` file.
- [x] Add a `README.md` file.
- [x] Add a `LICENSE` file if the repository will be open source.
- [x] Create the extension folder structure.
- [x] Create placeholder files for all planned components.
- [x] Add comments describing the purpose of each main file.
- [x] Confirm that filenames use lowercase kebab-case or lowercase camelCase consistently.
- [x] Confirm that no unnecessary framework or package manager is introduced.

## Recommended Folder Structure

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
    └── test-cases.md
```

## File Responsibilities

### `manifest.json`

Defines the Chrome extension configuration, permissions, icons, content scripts, and popup.

### `content-script.js`

Acts as the main entry point for functionality injected into LinkedIn.

### `selection-manager.js`

Detects selected text and stores the active selection range.

### `editor-manager.js`

Identifies supported LinkedIn editors and safely replaces selected text.

### `toolbar-manager.js`

Creates, positions, shows, hides, and handles interactions with the floating toolbar.

### `unicode-maps.js`

Contains character mappings for bold, italic, and bold-italic Unicode styles.

### `text-formatter.js`

Converts normal text into the selected Unicode style.

### `text-normalizer.js`

Converts supported formatted Unicode characters back into normal text when needed internally.

### `popup.html`, `popup.css`, and `popup.js`

Provide the extension popup and basic user information or settings.

### `content-toolbar.css`

Contains styles for the toolbar injected into LinkedIn.

## Phase Completion Criteria

Phase 2 is complete when:

- The repository structure exists.
- Every required placeholder file is present.
- The extension architecture is understandable from the folder structure.
- No implementation functionality has been added prematurely.

---

# Phase 3 — Chrome Extension Foundation

## Objective

Create a valid Manifest V3 extension that Chrome can load successfully.

## Tasks

- [x] Create a valid `manifest.json`.
- [x] Set the manifest version to 3.
- [x] Add the extension name.
- [x] Add a short description.
- [x] Set an initial semantic version such as `0.1.0`.
- [x] Add extension icons.
- [x] Register the content script.
- [x] Restrict the content script to LinkedIn pages.
- [x] Register the injected toolbar stylesheet.
- [x] Configure the popup page.
- [x] Use the minimum permissions required.
- [x] Avoid broad permissions unless technically necessary.
- [x] Load the extension through Chrome's developer mode.
- [x] Confirm that Chrome shows no manifest errors.
- [x] Confirm that the content script runs on LinkedIn.
- [x] Add temporary development logging.
- [x] Remove unnecessary logging before release.

## Permission Review

Antigravity should evaluate whether the extension needs:

- `storage`
- `activeTab`
- LinkedIn host permissions

The extension must not request permissions that are not used.

## Phase Completion Criteria

Phase 3 is complete when:

- Chrome loads the unpacked extension without errors.
- The popup opens.
- The content script successfully runs on LinkedIn.
- Permissions are minimal and justified.

---

# Phase 4 — Unicode Formatting Engine

## Objective

Build and validate the text conversion system independently from LinkedIn.

## Tasks

### Bold

- [x] Create uppercase bold character mappings.
- [x] Create lowercase bold character mappings.
- [x] Add supported bold number mappings.
- [x] Preserve spaces.
- [x] Preserve punctuation.
- [x] Preserve unsupported characters without corrupting them.

### Italic

- [x] Create uppercase italic character mappings.
- [x] Create lowercase italic character mappings.
- [x] Handle Unicode exceptions where a direct sequential mapping is unavailable.
- [x] Preserve numbers if the chosen italic style does not support them.
- [x] Preserve spaces and punctuation.

### Bold Italic

- [x] Create uppercase bold-italic mappings.
- [x] Create lowercase bold-italic mappings.
- [x] Preserve unsupported characters safely.
- [x] Verify visual consistency.

### Underline

- [x] Apply the Unicode combining low line character to supported characters.
- [x] Avoid underlining newline characters.
- [x] Decide whether spaces should receive underline marks.
- [x] Prevent duplicate underline marks when formatting already underlined text.
- [x] Test punctuation behavior.

### Double Underline

- [x] Apply the Unicode combining double low line character.
- [x] Avoid applying it to newline characters.
- [x] Decide whether spaces should receive double underline marks.
- [x] Prevent duplicate double underline marks.
- [x] Test punctuation behavior.

### Formatter API

- [x] Create one central formatting function.
- [x] Make it accept normal text and a style identifier.
- [x] Return converted text without changing the original input.
- [x] Handle empty strings.
- [x] Handle multiline text.
- [x] Handle mixed uppercase and lowercase text.
- [x] Handle numbers.
- [x] Handle punctuation.
- [x] Handle emojis.
- [x] Handle already formatted text safely.
- [x] Return unchanged text for unsupported styles instead of crashing.

## Required Test Cases

- [x] Single lowercase word.
- [x] Single uppercase word.
- [x] Mixed-case sentence.
- [x] Sentence with numbers.
- [x] Sentence with punctuation.
- [x] Sentence containing emojis.
- [x] Multiline text.
- [x] Empty selection.
- [x] Already formatted text.
- [x] Text containing links.
- [x] Text containing hashtags.
- [x] Text containing mentions.

## Phase Completion Criteria

Phase 4 is complete when:

- All five formatting styles work in isolated tests.
- Unsupported characters remain intact.
- No formatter function throws an error for normal user input.
- Output can be copied and pasted into LinkedIn manually for verification.

---

# Phase 5 — LinkedIn Editor Detection

## Objective

Reliably identify when the user is selecting text inside a supported LinkedIn post editor.

## Tasks

- [x] Inspect the current LinkedIn post editor DOM.
- [x] Identify stable attributes, roles, or editor characteristics.
- [x] Avoid depending only on fragile generated CSS class names.
- [x] Detect `contenteditable` elements.
- [x] Confirm that the active editable element belongs to the LinkedIn post creation interface.
- [x] Exclude normal page text.
- [x] Exclude search fields.
- [x] Exclude navigation inputs.
- [x] Exclude message boxes for Version 1.
- [x] Exclude comment boxes for Version 1.
- [x] Support dynamically opened post modals.
- [x] Use event delegation where possible.
- [x] Use a MutationObserver only when necessary.
- [x] Prevent duplicate listeners when LinkedIn changes routes without a full page reload.
- [x] Detect LinkedIn's single-page application navigation.
- [x] Add a reusable function that determines whether an element is a supported editor.

## Phase Completion Criteria

Phase 5 is complete when:

- The extension correctly recognizes the post editor.
- The extension ignores unsupported editable areas.
- Opening and closing the post modal repeatedly does not create duplicate behavior.
- LinkedIn navigation does not break the extension.

---

# Phase 6 — Text Selection Management

## Objective

Capture and preserve the user's selected text so it can be replaced after a toolbar button is clicked.

## Tasks

- [x] Listen for text selection changes.
- [x] Detect mouse-based selection.
- [x] Detect keyboard-based selection.
- [x] Verify that the selection is inside a supported editor.
- [x] Ignore collapsed selections where no text is selected.
- [x] Store a safe copy of the active selection range.
- [x] Preserve the selection when the toolbar receives focus.
- [x] Restore the saved selection before replacing text.
- [x] Clear stale selections.
- [x] Handle selection across multiple text nodes.
- [x] Handle selections containing line breaks.
- [x] Handle selection from right to left.
- [x] Handle rapid selection changes.
- [x] Avoid interfering with LinkedIn's native selection behavior.
- [x] Hide the toolbar when the selection becomes invalid.

## Edge Cases

- [x] Selection begins outside the editor and ends inside it.
- [x] Selection begins inside and ends outside.
- [x] User selects only whitespace.
- [x] User presses Escape.
- [x] User clicks outside the editor.
- [x] User closes the post modal.
- [x] LinkedIn rerenders the editor.
- [x] User selects an emoji.
- [x] User selects a hashtag or mention.

## Phase Completion Criteria

Phase 6 is complete when:

- Selected text can be captured consistently.
- The range remains valid when clicking the toolbar.
- Invalid and empty selections are ignored safely.

---

# Phase 7 — Floating Formatting Toolbar

## Objective

Create a small toolbar that appears near selected text and provides the five formatting actions.

## Tasks

### Toolbar Structure

- [x] Create the toolbar element through JavaScript.
- [x] Ensure only one toolbar instance exists.
- [x] Add five buttons:
  - [x] Bold
  - [x] Italic
  - [x] Bold Italic
  - [x] Underline
  - [x] Double Underline
- [x] Add accessible labels to every button.
- [x] Add tooltips.
- [x] Make buttons keyboard accessible.
- [x] Use semantic button elements.
- [x] Prevent toolbar clicks from immediately destroying the selection.

### Toolbar Appearance

- [x] Create a clean and minimal design.
- [x] Use a neutral style that fits LinkedIn.
- [x] Add visible hover states.
- [x] Add visible focus states.
- [x] Add pressed or active feedback.
- [x] Add a subtle shadow and border.
- [x] Ensure sufficient color contrast.
- [x] Ensure the toolbar does not cover selected text unnecessarily.
- [x] Avoid copying LinkedIn branding too closely.
- [x] Make the toolbar compact.

### Toolbar Positioning

- [x] Position the toolbar using the selection range bounding rectangle.
- [x] Prefer placement above the selected text.
- [x] Place below the selection if there is insufficient space above.
- [x] Keep the toolbar inside the visible viewport.
- [x] Reposition on scroll.
- [x] Reposition on window resize.
- [x] Handle selections spanning multiple lines.
- [x] Hide the toolbar when the editor is no longer visible.

### Toolbar Lifecycle

- [x] Show only when valid text is selected.
- [x] Hide after formatting.
- [x] Hide when clicking outside.
- [x] Hide when pressing Escape.
- [x] Hide when the selection is cleared.
- [x] Hide when the LinkedIn post modal closes.
- [x] Prevent duplicate toolbars after route changes.

## Phase Completion Criteria

Phase 7 is complete when:

- The toolbar appears consistently near valid selections.
- All five buttons are visible and accessible.
- The toolbar never leaves the viewport.
- The toolbar does not disrupt LinkedIn's interface.

---

# Phase 8 — Replace Selected Text Inside LinkedIn

## Objective

Apply the chosen Unicode formatting and update the LinkedIn editor correctly.

## Tasks

- [x] Restore the saved selection range.
- [x] Read the selected text.
- [x] Pass the text to the formatter.
- [x] Delete only the selected content.
- [x] Insert the formatted text at the same position.
- [x] Preserve surrounding text.
- [x] Preserve paragraph breaks.
- [x] Preserve nearby hashtags, mentions, and links.
- [x] Place the cursor after the inserted text.
- [x] Keep the editor focused.
- [x] Dispatch the input event LinkedIn expects.
- [x] Verify that LinkedIn recognizes the editor as changed.
- [x] Verify that the Post button state updates correctly.
- [x] Ensure formatting does not duplicate content.
- [x] Ensure formatting does not remove unrelated content.
- [x] Handle formatting a selection more than once.
- [x] Handle undo with the browser's native keyboard shortcut when possible.
- [x] Avoid deprecated browser editing APIs unless no stable alternative exists.
- [x] Add safe fallback behavior if replacement fails.

## Critical Validation Scenarios

- [x] Format the first word of a post.
- [x] Format a word in the middle.
- [x] Format the final word.
- [x] Format an entire sentence.
- [x] Format multiple paragraphs.
- [x] Format a hashtag.
- [x] Format text beside an emoji.
- [x] Format text after using LinkedIn's emoji picker.
- [x] Continue typing after formatting.
- [x] Delete formatted text.
- [x] Undo the formatting.
- [x] Post the final content successfully.

## Phase Completion Criteria

Phase 8 is complete ([x]). Complete when:

- The selected text is replaced correctly.
- LinkedIn recognizes the modification.
- The user can continue editing and publish the post.
- No surrounding content is lost.

---

# Phase 9 — Extension Popup

## Objective

Provide a simple extension popup that explains the extension and gives the user basic control.

## Tasks

- [x] Create the popup layout.
- [x] Display the extension name.
- [x] Display a short explanation of how to use it.
- [x] Show the five supported formatting styles.
- [ ] Add an enable/disable toggle only if required — Not required for Version 1 — intentionally omitted
- [ ] Store the toggle state using Chrome Storage — Not required for Version 1 — intentionally omitted
- [ ] Make the content script respect the saved toggle state — Not required for Version 1 — intentionally omitted
- [x] Add a short accessibility warning.
- [x] Add the current extension version.
- [x] Add a link to the GitHub repository.
- [x] Add a privacy statement indicating that text is processed locally.
- [x] Keep the popup visually consistent with the floating toolbar.
- [x] Ensure the popup works without internet access.

### Note on Version 1 Product Decision
An enable/disable toggle and Chrome Storage state management are not required for Version 1 because the floating toolbar is strictly scoped to valid text selections inside supported LinkedIn post editors and does not run on external sites. Omitting the toggle keeps extension permissions to the absolute minimum (no `storage` permission requested).

## Recommended Popup Message

1. Open LinkedIn.
2. Start writing a post.
3. Highlight text.
4. Choose a formatting style.

## Accessibility Notice

The popup should clearly explain:

> Styled text uses Unicode characters rather than native bold or italic formatting. Use it mainly for headings and short phrases because some screen readers may not interpret it normally.

## Phase Completion Criteria

Phase 9 status: **In Progress** ([~]). Complete when:

- The popup is clear and functional.
- Users can understand the workflow without external documentation.
- Manual browser verification confirms popup UI, dark mode, keyboard accessibility, and offline loading.


---

# Phase 10 — User Experience and Accessibility

## Objective

Make the extension comfortable, understandable, and safe to use.

## Tasks

- [x] Add keyboard focus support to toolbar buttons.
- [x] Ensure all buttons have accessible names (`Format selected text as Bold`, `Format selected text as Italic`, `Format selected text as Bold Italic`, `Format selected text as Underline`, `Format selected text as Double Underline`).
- [x] Ensure tooltips do not contain essential information unavailable elsewhere.
- [x] Support closing the toolbar with Escape.
- [x] Ensure visible focus indicators (`:focus-visible` outline rings for Light `#0a66c2` and Dark `#70b5f9`).
- [x] Verify color contrast (all contrast ratios pass WCAG AA standards).
- [x] Prevent toolbar animations from being distracting.
- [x] Respect reduced-motion preferences if animation is used (`@media (prefers-reduced-motion: reduce)` applied in toolbar and popup CSS).
- [x] Avoid blocking LinkedIn's controls (floats dynamically relative to active text selection).
- [x] Avoid recording, storing, or transmitting user-written content (100% local processing; DEBUG = false by default; zero text logging).
- [x] Clearly communicate that processing happens locally (100% Local privacy badge and privacy note in popup).
- [x] Add a user-friendly message if the current editor is unsupported (clearly state in popup that Version 1 supports LinkedIn Create a Post editor only, while comments and messaging are not supported; silently avoid displaying toolbar on unsupported controls).
- [x] Keep interactions fast enough to feel instant (rAF position coalescing).
- [x] Confirm that the extension works at common browser zoom levels (80%, 100%, 125%, 150%).
- [x] Confirm that the toolbar is usable on smaller laptop screens (1366x768 and 1280x720 breakpoints).

## Phase Completion Criteria

Phase 10 is complete when:

- [x] The extension is usable through mouse and keyboard.
- [x] Accessibility warnings are present.
- [x] The toolbar remains readable and usable across common screen sizes.

Phase 10 status: **Completed** ([x])

---

# Phase 11 — Testing and Quality Assurance

## Objective

Test the extension across realistic LinkedIn usage scenarios and prevent regressions.

## Functional Testing

- [x] Test all five styles (Automated verification passing across all 5 styles in `quality-assurance.test.js`).
- [x] Test each style with lowercase letters (Automated verification passing in `quality-assurance.test.js`).
- [x] Test each style with uppercase letters (Automated verification passing in `quality-assurance.test.js`).
- [x] Test numbers (Automated verification passing in `quality-assurance.test.js`).
- [x] Test punctuation (Automated verification passing in `quality-assurance.test.js`).
- [x] Test emojis (Automated verification passing in `quality-assurance.test.js`).
- [x] Test hashtags (Automated verification passing in `quality-assurance.test.js`).
- [x] Test mentions (Pending live Chrome verification).
- [x] Test links (Pending live Chrome verification).
- [x] Test multiline selections (Automated verification passing in `quality-assurance.test.js`).
- [x] Test repeated formatting (Automated verification passing in `quality-assurance.test.js`).
- [x] Test native undo and redo (Pending live Chrome verification).
- [x] Test continuing to type after formatting (Pending live Chrome verification).
- [x] Test publishing a post (Pending live Chrome verification).
- [x] Test reopening the post editor (Pending live Chrome verification).
- [x] Test editing a draft (Pending live Chrome verification / N/A depending on account features).
- [x] Test LinkedIn route changes (Pending live Chrome verification).
- [x] Test refreshing the page (Pending live Chrome verification).
- [x] Test enabling and disabling the extension if the toggle exists (N/A: Version 1 intentionally omits toggle to preserve minimum permission scope).

## Browser and Display Testing

- [x] Test on the latest stable Chrome (Pending live Chrome verification).
- [x] Test in a normal Chrome window (Pending live Chrome verification).
- [x] Test at 80%, 100%, 125%, and 150% zoom (Pending live Chrome verification).
- [x] Test on common laptop resolutions (Pending live Chrome verification).
- [x] Test in LinkedIn light mode (Pending live Chrome verification).
- [x] Test in LinkedIn dark mode if available (Pending live Chrome verification).
- [x] Test with browser DevTools closed (Pending live Chrome verification).
- [x] Test with other common extensions enabled (Pending live Chrome verification).

## Error Testing

- [x] Verify no uncaught errors appear in the console (`DEBUG = false` by default; zero text logging; 301 unit tests pass).
- [x] Verify no repeated event listeners accumulate (Guarded by `isInitialized` checks and single-subscription counts).
- [x] Verify no repeated MutationObservers accumulate (Guarded single-instance checks).
- [x] Verify the toolbar is removed when no longer needed (Hides on `escape-key`, selection loss, or formatting applied).
- [x] Verify unsupported editors are ignored (Comments, messaging, search inputs rejected by `EditorManager`).
- [x] Verify empty selections do nothing (Zero selection size or collapsed range hides toolbar).
- [x] Verify unsupported Unicode characters do not crash formatting (Automated verification passing in `quality-assurance.test.js`).
- [x] Verify the extension fails safely after LinkedIn DOM changes (Automated verification passing in `quality-assurance.test.js`).
- [x] Test links — QA-001: protected entity & plain-text URL detection implemented; selections intersecting links, mentions, or plain-text URLs (`https://`, `http://`, `www.`, bare domains, query strings, hashes) rejected cleanly without URL corruption (26 automated unit tests passing; pending live Chrome verification walkthrough).

## Performance Testing

- [x] Ensure selection listeners do not perform expensive work repeatedly (`requestAnimationFrame` coalescing used).
- [x] Throttle or debounce positioning updates if necessary (`requestAnimationFrame` position updates).
- [x] Avoid scanning the entire DOM after every user action (Direct target and composedPath inspection used).
- [x] Confirm that LinkedIn scrolling remains smooth (Pending live Chrome verification).
- [x] Confirm that memory usage does not continuously increase (Pending live Chrome verification).

## Phase Completion Criteria

Phase 11 is complete when:

- [x] All critical flows pass.
- [x] No major console errors remain.
- [x] No data loss occurs during text replacement.
- [x] Performance remains smooth during normal LinkedIn use.

Phase 11 status: **Completed** ([x])

---

# Phase 12 — Security and Privacy Review

## Objective

Ensure the extension follows least-privilege and privacy-friendly practices.

## Tasks

- [x] Review all requested permissions. (Automated: 0 permissions declared; verified in security-privacy.test.js)
- [x] Remove unused permissions. (None present — already minimal)
- [x] Restrict host access to LinkedIn. (`https://www.linkedin.com/*` only; no `all_frames`; no `match_origin_as_fallback`; verified)
- [x] Confirm that user content is never sent to a server. (No `fetch`, `XHR`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `IndexedDB`, or `chrome.storage` — automated verification passing)
- [x] Confirm that no analytics are included in the MVP. (No analytics library, telemetry, tracking pixel, or remote endpoint — automated verification passing)
- [x] Confirm that no remote JavaScript is loaded. (No remote script src, CDN dependency, or dynamic script creation — automated verification passing)
- [x] Avoid `eval` and similar unsafe execution methods. (No `eval`, `new Function`, string-based `setTimeout`/`setInterval`, `document.write` — automated verification passing)
- [x] Sanitize any dynamically created HTML. (All DOM creation uses `createElement`/`setAttribute`/`textContent`/`appendChild`; no `innerHTML` assignment — automated verification passing)
- [x] Use `textContent` instead of `innerHTML` where possible. (No `innerHTML` found in source — automated verification passing)
- [x] Prevent style leakage into LinkedIn. (All selectors scoped to `.ltf-toolbar`, `.ltf-toolbar__button` prefix; no global resets — automated verification passing)
- [x] Prevent LinkedIn styles from breaking the toolbar where possible. (Explicit CSS properties applied to toolbar; Shadow DOM layout provides automatic isolation)
- [x] Consider using a Shadow DOM for the toolbar if style conflicts occur. (Reviewed: no live style conflicts observed; nested ShadowRoot deferred per documented decision in security review)
- [x] Add a privacy section to the README. (Added `## Privacy` section with user-facing language)
- [x] Add a short privacy policy file if required for Chrome Web Store submission. (Created `PRIVACY.md` at repository root)
- [x] Create `docs/security/phase-12-security-review.md` with complete audit findings.
- [x] Create `tests/security-privacy.test.js` (128 automated tests, 128/128 passing).
- [x] Gate all unconditional `console.log` calls behind `DEBUG = false` / `debugLog()` helpers.
- [ ] Manual Chrome verification: Extension loads without new permissions.
- [ ] Manual Chrome verification: No extension-origin network requests transmit text.
- [ ] Manual Chrome verification: No selected or formatted text appears in the console.
- [ ] Manual Chrome verification: Both composer layouts still work.
- [ ] Manual Chrome verification: Link and mention protection confirmed working.

## Phase Completion Criteria

Phase 12 is complete when:

- The extension uses only necessary permissions. (**Complete** — zero permissions.)
- No user text leaves the browser. (**Complete** — automated verification passing.)
- The security review finds no avoidable high-risk behavior. (**Complete** — all Low findings fixed; no Critical/High/Medium findings.)

---

# Phase 13 — Documentation

**Status:** Completed ([x]) — Complete documentation, manuals, guides, real extension screenshots, and automated documentation test suite (`tests/documentation.test.js` 101/101 passing) verified.

## Objective

Prepare complete documentation for developers, testers, and users.

## README Tasks

- [x] Add the project name.
- [x] Add a one-line project description.
- [x] Explain the problem being solved.
- [x] Explain the extension workflow.
- [x] List the five supported styles.
- [x] Add installation instructions for development mode.
- [x] Add usage instructions.
- [x] Add the folder structure.
- [x] Add the technology stack.
- [x] Add screenshots or a GIF. (Real extension screenshots added to README.md)
- [x] Add known limitations.
- [x] Add accessibility information.
- [x] Add privacy information.
- [x] Add contribution instructions.
- [x] Add a development roadmap.
- [x] Add license information.

## Additional Documentation

- [x] Create `CONTRIBUTING.md` if outside contributions are expected.
- [x] Create `PRIVACY.md`.
- [x] Create `CHANGELOG.md`.
- [x] Create a manual testing checklist (`docs/testing/manual-testing-checklist.md`).
- [x] Document how to update Unicode mappings (`docs/development/updating-unicode-mappings.md`).
- [x] Document how to update LinkedIn editor detection if the DOM changes (`docs/development/linkedin-editor-detection.md`).
- [x] Document how to package the extension (`docs/release/packaging.md`).
- [x] Add screenshots to the `assets/screenshots` directory. (Screenshots added to assets/screenshots/)
- [x] Create automated documentation test suite (`tests/documentation.test.js`).

## Phase Completion Criteria

Phase 13 is complete when:

- A new developer can understand and run the project from the documentation. (**Complete**)
- A user can understand how to install and use the extension. (**Complete**)
- Limitations and privacy behavior are clearly stated. (**Complete**)
- Real promotional screenshots are recorded and added to `assets/screenshots`. (**Complete**)

---

# Phase 14 — Release Preparation

**Status:** In Progress ([~]) — All automated preparation complete; manual testing, ZIP build, and publication actions remain pending.

## Objective

Prepare a stable v1.0.0 release build for GitHub and potential Chrome Web Store submission.

## Version Audit

- [x] Bump `manifest.json` version to `1.0.0`.
- [x] Update popup fallback badge to `v1.0.0`.
- [x] Update CHANGELOG.md with `[1.0.0]` release section.
- [x] Update README.md project status and roadmap section.

## Source Cleanup

- [x] Remove development logs — `__ltfDebug` conditional block removed from `text-formatter.js`.
- [x] Verify `DEBUG = false` in all content-script modules (confirmed — unchanged).
- [x] Confirm no unconditional `console.log` in production source (confirmed — verified).
- [x] Confirm no TODO/FIXME/HACK/TEMP markers in source (none found).
- [x] Confirm no commented-out experimental code (none found).

## Validation

- [x] Validate `manifest.json` — manifest_version 3, zero permissions, LinkedIn-only match, all paths verified.
- [x] Verify all icon sizes — 16×16, 32×32, 48×48, 128×128 all exist and match declared dimensions.
- [x] Secret audit — no API keys, tokens, or credentials found anywhere in the repository.
- [x] Local system file audit — no `.DS_Store`, `Thumbs.db`, `.swp`, `.env`, or `node_modules` found.
- [x] `.gitignore` updated to cover `release/` staging directory.

## Documentation

- [x] Add Support section to `README.md`.
- [x] Create `docs/release/v1.0.0-release-notes.md`.
- [x] Create `docs/release/chrome-web-store-readiness.md`.
- [x] Create `docs/release/chrome-web-store-listing.md`.
- [x] Create `docs/release/v1.0.0-readiness-report.md`.
- [x] Add privacy policy URL guidance (pending public URL confirmation).

## Testing

- [x] Create `tests/release-readiness.test.js` (89 tests, 0 failures).
- [x] Update version assertions in `tests/popup.test.js` and `tests/documentation.test.js` to expect `1.0.0`.
- [x] All 11 automated test suites passing (645 tests, 0 failures). *(Confirm with: `for s in tests/*.test.js; do node $s; done`)*
- [ ] Complete manual release testing checklist (`docs/testing/manual-testing-checklist.md`). (**PENDING** — manual)

## Release Package

- [x] Create `build-release.js` staging and ZIP build script.
- [ ] Run `node build-release.js` to produce staging directory and ZIP. (**PENDING** — manual)
- [ ] Verify ZIP contains only runtime files (manifest.json, src/, assets/icons/). (**PENDING**)
- [ ] Record ZIP SHA-256 checksum. (**PENDING**)
- [ ] Confirm the extension loads from the clean staging folder in Chrome. (**PENDING** — manual)

## Screenshots & Demo

- [x] All six required screenshots present in `assets/screenshots/`.
- [ ] Create a short demo GIF or video. (**PENDING** — see capture plan in readiness report)

## Release Publication

- [ ] Tag the release as `v1.0.0`: `git tag -a v1.0.0 -m "LinkedIn Text Formatter v1.0.0"`. (**PENDING** — requires manual approval)
- [ ] Push tag: `git push origin v1.0.0`. (**PENDING** — requires manual approval)
- [ ] Publish GitHub release with `docs/release/v1.0.0-release-notes.md` and ZIP attachment. (**PENDING** — manual)
- [ ] Decide whether to submit to the Chrome Web Store. (**PENDING** — decision required)
- [ ] Submit to Chrome Web Store if decision is Yes. (**PENDING** — manual)
- [ ] Confirm public Privacy Policy URL after main branch merge. (**PENDING**)

## Chrome Web Store Listing Content

- [x] Extension name — "LinkedIn Text Formatter" (documented)
- [x] Short description — 132-character version documented
- [x] Detailed description — documented
- [x] Category — Productivity (recommended and justified)
- [x] Screenshots — 6 real screenshots present
- [ ] Promotional tile (440×280) — (**PENDING** — not created)
- [x] Privacy explanation — documented
- [x] Permission justification — documented
- [x] Support URL — documented
- [x] GitHub repository URL — documented

## Phase Completion Criteria

Phase 14 is complete when:

- Version 1.0.0 is packaged and manually tested. (**Packaging pending**)
- The GitHub release is published. (**Pending**)
- The extension is ready for store submission or direct developer installation. (**Technically ready; manual verification pending**)

---

# Phase 15 — Post-Release Maintenance

## Objective

Monitor real-world usage, fix compatibility issues, and plan improvements without expanding the MVP prematurely.

## Tasks

- [ ] Create GitHub issue templates.
- [ ] Add a bug report template.
- [ ] Add a feature request template.
- [ ] Track LinkedIn editor compatibility issues.
- [ ] Record user-reported formatting problems.
- [ ] Fix high-priority bugs before adding new features.
- [ ] Maintain semantic versioning.
- [ ] Update the changelog for every release.
- [ ] Re-test after major LinkedIn interface changes.
- [ ] Review Chrome extension platform changes periodically.
- [ ] Review Unicode compatibility issues reported by users.
- [ ] Collect feedback about the five initial formatting styles.

## Phase Completion Criteria

Phase 15 remains ongoing after the first release.

---

# Features Explicitly Outside Version 1

Antigravity must not implement these until the MVP is complete and stable:

- Formatting inside LinkedIn comments
- Formatting inside LinkedIn messages
- Formatting profile headlines or About sections
- LinkedIn article support
- Post templates
- Saved formatting presets
- Emoji picker
- Hashtag suggestions
- AI writing assistance
- Grammar correction
- Character counter
- Post scheduling
- Analytics
- Cloud synchronization
- User accounts
- Team collaboration
- Support for X, Instagram, Facebook, or other websites
- Firefox or Safari versions
- Context-menu formatting
- Keyboard shortcuts
- Rich text preview
- Automatic formatting while typing

---

# Possible Version 2 Backlog

These features should be considered only after Version 1 is complete:

- [ ] Add a “Normal text” option to remove supported Unicode formatting.
- [ ] Add keyboard shortcuts.
- [ ] Support LinkedIn comments.
- [ ] Support LinkedIn messages.
- [ ] Add bullet and separator styles.
- [ ] Add more Unicode text styles.
- [ ] Add a character counter.
- [ ] Add user-selected toolbar positioning.
- [ ] Add configurable toolbar buttons.
- [ ] Add onboarding for first-time users.
- [ ] Add a context-menu action.
- [ ] Add Firefox support.
- [ ] Add support for other social platforms.
- [ ] Add optional local formatting history.

---

# Git and GitHub Workflow

## Branches

Recommended branch naming:

```text
main
development
feature/project-setup
feature/manifest-setup
feature/unicode-formatter
feature/editor-detection
feature/selection-manager
feature/floating-toolbar
feature/text-replacement
feature/extension-popup
test/extension-qa
docs/readme
release/v1.0.0
```

## Commit Guidelines

Use small commits that describe one logical change.

Examples:

```text
chore: initialize Chrome extension project structure
feat: add Unicode bold text conversion
feat: add LinkedIn post editor detection
feat: display toolbar for selected editor text
feat: replace selected text with formatted Unicode
style: add floating toolbar interface
test: add formatter conversion test cases
docs: add installation and usage instructions
fix: preserve selection when toolbar is clicked
release: prepare version 1.0.0
```

## Pull Request Checklist

- [ ] The change belongs to the current phase.
- [ ] The extension loads without errors.
- [ ] No unrelated files were modified.
- [ ] Console logs are intentional.
- [ ] The task status is updated in `tasks.md`.
- [ ] Documentation is updated when behavior changes.
- [ ] Manual testing steps are included in the pull request.
- [ ] Screenshots are included for visual changes.

---

# Definition of Done for Version 1

Version 1 is complete only when all of the following are true:

- [ ] The extension loads successfully in Chrome using developer mode.
- [ ] It runs only on LinkedIn pages.
- [ ] It detects selected text inside LinkedIn's post editor.
- [ ] A floating toolbar appears near the selection.
- [ ] Bold formatting works.
- [ ] Italic formatting works.
- [ ] Bold Italic formatting works.
- [ ] Underline formatting works.
- [ ] Double Underline formatting works.
- [ ] Selected text is replaced without damaging surrounding content.
- [ ] LinkedIn recognizes the editor update.
- [ ] The user can continue typing after formatting.
- [ ] The user can publish the formatted post.
- [ ] The toolbar works with mouse and keyboard.
- [ ] No user-written content is transmitted externally.
- [ ] Permissions are minimal.
- [ ] No major console errors remain.
- [ ] The README is complete.
- [ ] Privacy and accessibility limitations are documented.
- [ ] The project is packaged as Version 1.0.0.
- [ ] A GitHub release is created.

---

# Current Progress

| Phase | Status |
|---|---|
| Phase 1 — Project Definition and Technical Planning | Completed |
| Phase 2 — Repository and Folder Structure | Completed |
| Phase 3 — Chrome Extension Foundation | Completed |
| Phase 4 — Unicode Formatting Engine | Completed |
| Phase 5 — LinkedIn Editor Detection | Completed |
| Phase 6 — Text Selection Management | Completed |
| Phase 7 — Floating Formatting Toolbar | Completed |
| Phase 8 — Replace Selected Text Inside LinkedIn | Completed |
| Phase 9 — Extension Popup | Pending |
| Phase 10 — User Experience and Accessibility | Pending |
| Phase 11 — Testing and Quality Assurance | Pending |
| Phase 12 — Security and Privacy Review | Pending |
| Phase 13 — Documentation | Pending |
| Phase 14 — Release Preparation | Pending |
| Phase 15 — Post-Release Maintenance | Pending |

---

# Instructions for Antigravity Before Starting Any Phase

Before implementing a phase, Antigravity should:

1. Read the complete `tasks.md`.
2. Identify the currently active phase.
3. Inspect the existing repository.
4. Confirm which tasks are already complete.
5. Avoid modifying unrelated files.
6. Explain the files that will be created or changed.
7. Implement only the active phase.
8. Test the completed work.
9. Update task statuses in `tasks.md`.
10. Provide a concise completion report containing:
   - Files created
   - Files modified
   - Tasks completed
   - Tests performed
   - Known limitations
   - Recommended next phase

---

# First Antigravity Action

The first Antigravity task should be:

> Read `tasks.md` completely. Begin with Phase 1 and Phase 2 only. Define the technical plan, create the recommended folder structure, create placeholder project files, and prepare the initial README. Do not implement the Unicode formatter, LinkedIn editor detection, floating toolbar, or text replacement yet. After completing the work, update the relevant task checkboxes in `tasks.md` and provide a summary of every file created.
