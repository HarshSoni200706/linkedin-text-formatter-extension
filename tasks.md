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

- [ ] Inspect the current LinkedIn post editor DOM.
- [ ] Identify stable attributes, roles, or editor characteristics.
- [ ] Avoid depending only on fragile generated CSS class names.
- [ ] Detect `contenteditable` elements.
- [ ] Confirm that the active editable element belongs to the LinkedIn post creation interface.
- [ ] Exclude normal page text.
- [ ] Exclude search fields.
- [ ] Exclude navigation inputs.
- [ ] Exclude message boxes for Version 1.
- [ ] Exclude comment boxes for Version 1.
- [ ] Support dynamically opened post modals.
- [ ] Use event delegation where possible.
- [ ] Use a MutationObserver only when necessary.
- [ ] Prevent duplicate listeners when LinkedIn changes routes without a full page reload.
- [ ] Detect LinkedIn's single-page application navigation.
- [ ] Add a reusable function that determines whether an element is a supported editor.

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

- [ ] Listen for text selection changes.
- [ ] Detect mouse-based selection.
- [ ] Detect keyboard-based selection.
- [ ] Verify that the selection is inside a supported editor.
- [ ] Ignore collapsed selections where no text is selected.
- [ ] Store a safe copy of the active selection range.
- [ ] Preserve the selection when the toolbar receives focus.
- [ ] Restore the saved selection before replacing text.
- [ ] Clear stale selections.
- [ ] Handle selection across multiple text nodes.
- [ ] Handle selections containing line breaks.
- [ ] Handle selection from right to left.
- [ ] Handle rapid selection changes.
- [ ] Avoid interfering with LinkedIn's native selection behavior.
- [ ] Hide the toolbar when the selection becomes invalid.

## Edge Cases

- [ ] Selection begins outside the editor and ends inside it.
- [ ] Selection begins inside and ends outside.
- [ ] User selects only whitespace.
- [ ] User presses Escape.
- [ ] User clicks outside the editor.
- [ ] User closes the post modal.
- [ ] LinkedIn rerenders the editor.
- [ ] User selects an emoji.
- [ ] User selects a hashtag or mention.

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

- [ ] Create the toolbar element through JavaScript.
- [ ] Ensure only one toolbar instance exists.
- [ ] Add five buttons:
  - [ ] Bold
  - [ ] Italic
  - [ ] Bold Italic
  - [ ] Underline
  - [ ] Double Underline
- [ ] Add accessible labels to every button.
- [ ] Add tooltips.
- [ ] Make buttons keyboard accessible.
- [ ] Use semantic button elements.
- [ ] Prevent toolbar clicks from immediately destroying the selection.

### Toolbar Appearance

- [ ] Create a clean and minimal design.
- [ ] Use a neutral style that fits LinkedIn.
- [ ] Add visible hover states.
- [ ] Add visible focus states.
- [ ] Add pressed or active feedback.
- [ ] Add a subtle shadow and border.
- [ ] Ensure sufficient color contrast.
- [ ] Ensure the toolbar does not cover selected text unnecessarily.
- [ ] Avoid copying LinkedIn branding too closely.
- [ ] Make the toolbar compact.

### Toolbar Positioning

- [ ] Position the toolbar using the selection range bounding rectangle.
- [ ] Prefer placement above the selected text.
- [ ] Place below the selection if there is insufficient space above.
- [ ] Keep the toolbar inside the visible viewport.
- [ ] Reposition on scroll.
- [ ] Reposition on window resize.
- [ ] Handle selections spanning multiple lines.
- [ ] Hide the toolbar when the editor is no longer visible.

### Toolbar Lifecycle

- [ ] Show only when valid text is selected.
- [ ] Hide after formatting.
- [ ] Hide when clicking outside.
- [ ] Hide when pressing Escape.
- [ ] Hide when the selection is cleared.
- [ ] Hide when the LinkedIn post modal closes.
- [ ] Prevent duplicate toolbars after route changes.

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

- [ ] Restore the saved selection range.
- [ ] Read the selected text.
- [ ] Pass the text to the formatter.
- [ ] Delete only the selected content.
- [ ] Insert the formatted text at the same position.
- [ ] Preserve surrounding text.
- [ ] Preserve paragraph breaks.
- [ ] Preserve nearby hashtags, mentions, and links.
- [ ] Place the cursor after the inserted text.
- [ ] Keep the editor focused.
- [ ] Dispatch the input event LinkedIn expects.
- [ ] Verify that LinkedIn recognizes the editor as changed.
- [ ] Verify that the Post button state updates correctly.
- [ ] Ensure formatting does not duplicate content.
- [ ] Ensure formatting does not remove unrelated content.
- [ ] Handle formatting a selection more than once.
- [ ] Handle undo with the browser's native keyboard shortcut when possible.
- [ ] Avoid deprecated browser editing APIs unless no stable alternative exists.
- [ ] Add safe fallback behavior if replacement fails.

## Critical Validation Scenarios

- [ ] Format the first word of a post.
- [ ] Format a word in the middle.
- [ ] Format the final word.
- [ ] Format an entire sentence.
- [ ] Format multiple paragraphs.
- [ ] Format a hashtag.
- [ ] Format text beside an emoji.
- [ ] Format text after using LinkedIn's emoji picker.
- [ ] Continue typing after formatting.
- [ ] Delete formatted text.
- [ ] Undo the formatting.
- [ ] Post the final content successfully.

## Phase Completion Criteria

Phase 8 is complete when:

- The selected text is replaced correctly.
- LinkedIn recognizes the modification.
- The user can continue editing and publish the post.
- No surrounding content is lost.

---

# Phase 9 — Extension Popup

## Objective

Provide a simple extension popup that explains the extension and gives the user basic control.

## Tasks

- [ ] Create the popup layout.
- [ ] Display the extension name.
- [ ] Display a short explanation of how to use it.
- [ ] Show the five supported formatting styles.
- [ ] Add an enable/disable toggle only if required.
- [ ] Store the toggle state using Chrome Storage.
- [ ] Make the content script respect the saved toggle state.
- [ ] Add a short accessibility warning.
- [ ] Add the current extension version.
- [ ] Add a link to the GitHub repository.
- [ ] Add a privacy statement indicating that text is processed locally.
- [ ] Keep the popup visually consistent with the floating toolbar.
- [ ] Ensure the popup works without internet access.

## Recommended Popup Message

1. Open LinkedIn.
2. Start writing a post.
3. Highlight text.
4. Choose a formatting style.

## Accessibility Notice

The popup should clearly explain:

> Styled text uses Unicode characters rather than native bold or italic formatting. Use it mainly for headings and short phrases because some screen readers may not interpret it normally.

## Phase Completion Criteria

Phase 9 is complete when:

- The popup is clear and functional.
- Users can understand the workflow without external documentation.
- Any saved setting persists between browser sessions.

---

# Phase 10 — User Experience and Accessibility

## Objective

Make the extension comfortable, understandable, and safe to use.

## Tasks

- [ ] Add keyboard focus support to toolbar buttons.
- [ ] Ensure all buttons have accessible names.
- [ ] Ensure tooltips do not contain essential information unavailable elsewhere.
- [ ] Support closing the toolbar with Escape.
- [ ] Ensure visible focus indicators.
- [ ] Verify color contrast.
- [ ] Prevent toolbar animations from being distracting.
- [ ] Respect reduced-motion preferences if animation is used.
- [ ] Avoid blocking LinkedIn's controls.
- [ ] Avoid recording, storing, or transmitting user-written content.
- [ ] Clearly communicate that processing happens locally.
- [ ] Add a user-friendly message if the current editor is unsupported.
- [ ] Keep interactions fast enough to feel instant.
- [ ] Confirm that the extension works at common browser zoom levels.
- [ ] Confirm that the toolbar is usable on smaller laptop screens.

## Phase Completion Criteria

Phase 10 is complete when:

- The extension is usable through mouse and keyboard.
- Accessibility warnings are present.
- The toolbar remains readable and usable across common screen sizes.

---

# Phase 11 — Testing and Quality Assurance

## Objective

Test the extension across realistic LinkedIn usage scenarios and prevent regressions.

## Functional Testing

- [ ] Test all five styles.
- [ ] Test each style with lowercase letters.
- [ ] Test each style with uppercase letters.
- [ ] Test numbers.
- [ ] Test punctuation.
- [ ] Test emojis.
- [ ] Test hashtags.
- [ ] Test mentions.
- [ ] Test links.
- [ ] Test multiline selections.
- [ ] Test repeated formatting.
- [ ] Test native undo and redo.
- [ ] Test continuing to type after formatting.
- [ ] Test publishing a post.
- [ ] Test reopening the post editor.
- [ ] Test editing a draft.
- [ ] Test LinkedIn route changes.
- [ ] Test refreshing the page.
- [ ] Test enabling and disabling the extension if the toggle exists.

## Browser and Display Testing

- [ ] Test on the latest stable Chrome.
- [ ] Test in a normal Chrome window.
- [ ] Test at 80%, 100%, 125%, and 150% zoom.
- [ ] Test on common laptop resolutions.
- [ ] Test in LinkedIn light mode.
- [ ] Test in LinkedIn dark mode if available.
- [ ] Test with browser DevTools closed.
- [ ] Test with other common extensions enabled.

## Error Testing

- [ ] Verify no uncaught errors appear in the console.
- [ ] Verify no repeated event listeners accumulate.
- [ ] Verify no repeated MutationObservers accumulate.
- [ ] Verify the toolbar is removed when no longer needed.
- [ ] Verify unsupported editors are ignored.
- [ ] Verify empty selections do nothing.
- [ ] Verify unsupported Unicode characters do not crash formatting.
- [ ] Verify the extension fails safely after LinkedIn DOM changes.

## Performance Testing

- [ ] Ensure selection listeners do not perform expensive work repeatedly.
- [ ] Throttle or debounce positioning updates if necessary.
- [ ] Avoid scanning the entire DOM after every user action.
- [ ] Confirm that LinkedIn scrolling remains smooth.
- [ ] Confirm that memory usage does not continuously increase.

## Phase Completion Criteria

Phase 11 is complete when:

- All critical flows pass.
- No major console errors remain.
- No data loss occurs during text replacement.
- Performance remains smooth during normal LinkedIn use.

---

# Phase 12 — Security and Privacy Review

## Objective

Ensure the extension follows least-privilege and privacy-friendly practices.

## Tasks

- [ ] Review all requested permissions.
- [ ] Remove unused permissions.
- [ ] Restrict host access to LinkedIn.
- [ ] Confirm that user content is never sent to a server.
- [ ] Confirm that no analytics are included in the MVP.
- [ ] Confirm that no remote JavaScript is loaded.
- [ ] Avoid `eval` and similar unsafe execution methods.
- [ ] Sanitize any dynamically created HTML.
- [ ] Use `textContent` instead of `innerHTML` where possible.
- [ ] Prevent style leakage into LinkedIn.
- [ ] Prevent LinkedIn styles from breaking the toolbar where possible.
- [ ] Consider using a Shadow DOM for the toolbar if style conflicts occur.
- [ ] Add a privacy section to the README.
- [ ] Add a short privacy policy file if required for Chrome Web Store submission.

## Phase Completion Criteria

Phase 12 is complete when:

- The extension uses only necessary permissions.
- No user text leaves the browser.
- The security review finds no avoidable high-risk behavior.

---

# Phase 13 — Documentation

## Objective

Prepare complete documentation for developers, testers, and users.

## README Tasks

- [ ] Add the project name.
- [ ] Add a one-line project description.
- [ ] Explain the problem being solved.
- [ ] Explain the extension workflow.
- [ ] List the five supported styles.
- [ ] Add installation instructions for development mode.
- [ ] Add usage instructions.
- [ ] Add the folder structure.
- [ ] Add the technology stack.
- [ ] Add screenshots or a GIF.
- [ ] Add known limitations.
- [ ] Add accessibility information.
- [ ] Add privacy information.
- [ ] Add contribution instructions.
- [ ] Add a development roadmap.
- [ ] Add license information.

## Additional Documentation

- [ ] Create `CONTRIBUTING.md` if outside contributions are expected.
- [ ] Create `PRIVACY.md`.
- [ ] Create `CHANGELOG.md`.
- [ ] Create a manual testing checklist.
- [ ] Document how to update Unicode mappings.
- [ ] Document how to update LinkedIn editor detection if the DOM changes.
- [ ] Document how to package the extension.
- [ ] Add screenshots to the `assets/screenshots` directory.

## Phase Completion Criteria

Phase 13 is complete when:

- A new developer can understand and run the project from the documentation.
- A user can understand how to install and use the extension.
- Limitations and privacy behavior are clearly stated.

---

# Phase 14 — Release Preparation

## Objective

Prepare a stable release build for GitHub and potential Chrome Web Store submission.

## Tasks

- [ ] Remove development logs.
- [ ] Remove unused files.
- [ ] Remove commented-out experimental code.
- [ ] Verify extension version numbers.
- [ ] Validate `manifest.json`.
- [ ] Verify all icon sizes.
- [ ] Run the full testing checklist.
- [ ] Confirm the extension loads from a clean folder.
- [ ] Confirm the repository contains no secrets.
- [ ] Confirm the repository contains no local system files.
- [ ] Create release screenshots.
- [ ] Create a short demo GIF or video.
- [ ] Prepare a release ZIP containing only extension files.
- [ ] Create GitHub release notes.
- [ ] Tag the release as `v1.0.0`.
- [ ] Publish the first GitHub release.
- [ ] Decide whether to submit to the Chrome Web Store.
- [ ] Prepare a Chrome Web Store listing if required.
- [ ] Prepare a privacy policy URL if required.
- [ ] Add support and issue-reporting instructions.

## Chrome Web Store Listing Content

- [ ] Extension name.
- [ ] Short description.
- [ ] Detailed description.
- [ ] Category.
- [ ] Screenshots.
- [ ] Promotional image if required.
- [ ] Privacy explanation.
- [ ] Permission justification.
- [ ] Support URL.
- [ ] GitHub repository URL.

## Phase Completion Criteria

Phase 14 is complete when:

- Version 1.0.0 is packaged and tested.
- The GitHub release is published.
- The extension is ready for store submission or direct developer installation.

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
| Phase 4 — Unicode Formatting Engine | In Progress |
| Phase 5 — LinkedIn Editor Detection | Pending |
| Phase 6 — Text Selection Management | Pending |
| Phase 7 — Floating Formatting Toolbar | Pending |
| Phase 8 — Replace Selected Text Inside LinkedIn | Pending |
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
