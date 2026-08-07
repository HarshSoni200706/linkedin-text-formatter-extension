# LinkedIn Editor Detection & Maintenance

This document details the multi-signal scoring architecture used by the LinkedIn Text Formatter to detect and interact with supported LinkedIn post editors across DOM and Shadow DOM contexts.

---

## 1. Why Detection Maintenance is Necessary

LinkedIn continuously updates its front-end web application, periodically changing DOM hierarchies, class names, and rich-text editor components (such as Quill.js integrations). 

To ensure stability without breaking core post creation:
- Detection uses **multi-signal scoring** rather than relying on a single brittle CSS class.
- Supported editors are strictly validated before activating the floating toolbar.
- Unsupported elements (comments, messaging, search, CAPTCHAs) are explicitly excluded.

---

## 2. Supported Composer Layouts

The extension supports two primary post creation layouts:

### Layout A: Direct-Document Composer
- **Location:** Main feed post modal or `/sharing/compose` route.
- **Structure:** `DIV[contenteditable="true"]` or `DIV[role="textbox"]` located directly within the main `document`.
- **Identification:** Resolves via standard DOM tree traversal (`resolveToEditableRoot`).

### Layout B: Open Shadow DOM Composer
- **Location:** LinkedIn interop post composer outlet (`DIV#interop-outlet`).
- **Structure:** `DIV.ql-editor[contenteditable="true"]` hosted inside an open `ShadowRoot`.
- **Identification:** Resolves using `event.composedPath()` and ShadowRoot-aware parent traversal (`getComposedParent()`, `composedClosest()`).

---

## 3. Composed Path & Shadow DOM Traversal

Standard DOM methods (`element.closest()`, `node.parentNode`) cannot cross `ShadowRoot` boundaries. To handle open Shadow DOM composers safely:

- **`resolveEditableFromComposedPath(event)`**: Inspects `event.composedPath()` array to trace elements across shadow boundaries.
- **`composedClosest(node, predicate)`**: Walks up `parentElement`, `parentNode`, or `ShadowRoot.host` when reaching a document fragment boundary.

---

## 4. Detection & Scoring Logic

`src/content/editor-manager.js` evaluates target elements using a multi-signal scoring detector (`checkEditorSupport`):

### Positive Detection Signals (+Points)
- `contenteditable="true"` attribute
- `role="textbox"` attribute
- Class `ql-editor` (Quill editor)
- Presence inside recognized post creation modal dialogs (`dialog[open]`, `[role="dialog"]`)
- URL pathname matching `/sharing/compose` or `/feed/`

### Exclusion Signals (Rejection & 0 Score)
- `tagName` of `INPUT` or `TEXTAREA`
- Textarea `g-recaptcha-response` or elements inside `.g-recaptcha-badge` (CAPTCHA controls)
- Element inside `.ql-clipboard` (Quill clipboard helper iframe/div)
- Presence inside LinkedIn Comment containers (`.comments-comment-box`, `.comments-comment-text-editor`)
- Presence inside LinkedIn Messaging containers (`.msg-form`, `.msg-composable-form`)
- Presence inside LinkedIn Search input boxes (`.search-global-typeahead`)
- Presence inside LinkedIn Article / Newsletter editor (`/pulse/` routes)

---

## 5. Entity & Protected Content Exclusion (QA-001)

Selections are **rejected** and formatting is aborted if the selection range overlaps:

1. **Protected DOM Entities (`rangeIntersectsProtectedEntity`):**
   - Links (`a[href]`)
   - Mentions (`.option-mention`, `@` mention wrappers)
   - Elements with `contenteditable="false"`
   - `role="link"` controls

2. **Plain-Text URLs (`rangeIntersectsUrlText`):**
   - Plain-text URL tokens matching `https://`, `http://`, `www.`, bare domain strings, percent-encoded queries, and hash fragments.
   - Prevents destroying LinkedIn's URL preview card generators or Quill link objects.

---

## 6. How to Inspect & Support a New Composer Variant

If LinkedIn updates its post composer structure:

1. Open Chrome DevTools on LinkedIn's post editor.
2. Inspect the editable container:
   - Check if `contenteditable="true"` is present.
   - Check if the element lives in the main document or inside a `ShadowRoot`.
   - Identify parent modal containers and attributes.
3. Test detection via DevTools console:
   ```javascript
   window.LinkedInTextFormatter.checkEditorSupport($0)
   ```
4. Add a test fixture in `tests/editor-detector.test.js` or `tests/quality-assurance.test.js`.
5. Update `src/content/editor-manager.js` to include new positive signals while preserving all exclusion rules.

---

## 7. Privacy-Safe Debugging Guidelines

- Keep `DEBUG = false` in production code.
- When enabling temporary local debug logging during maintenance, **never** log editor content string values, selected text strings, or user account info.
- Verify log silencing before committing changes.
