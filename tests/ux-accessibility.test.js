/**
 * ux-accessibility.test.js
 *
 * Zero-dependency automated test suite for Phase 10 — User Experience & Accessibility:
 * - Exact accessible names for toolbar buttons
 * - Keyboard activatable buttons (type="button", Enter/Space)
 * - Focus-visible CSS styling in toolbar and popup
 * - Escape key dismissal handler registration
 * - Reduced-motion CSS support (@media prefers-reduced-motion)
 * - Supported-editor limitation messaging in popup
 * - Local-processing and privacy statements
 * - Unicode accessibility warning visibility
 * - DEBUG logging disabled by default (DEBUG = false)
 * - Zero user text logging
 * - Bundle integrity (zero remote CDNs, scripts, or external stylesheets)
 * - Scope and permissions (zero requested Chrome permissions)
 * - Toolbar single-instance and ShadowRoot stylesheet single-instance integrity
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const TOOLBAR_JS_PATH = path.join(ROOT_DIR, 'src/content/toolbar-manager.js');
const TOOLBAR_CSS_PATH = path.join(ROOT_DIR, 'src/styles/content-toolbar.css');
const POPUP_HTML_PATH = path.join(ROOT_DIR, 'src/popup/popup.html');
const POPUP_CSS_PATH = path.join(ROOT_DIR, 'src/popup/popup.css');
const POPUP_JS_PATH = path.join(ROOT_DIR, 'src/popup/popup.js');
const CONTENT_SCRIPT_PATH = path.join(ROOT_DIR, 'src/content/content-script.js');
const REPLACEMENT_JS_PATH = path.join(ROOT_DIR, 'src/content/text-replacement-manager.js');

function runUXAccessibilityTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(name, actual, expected) {
    if (actual === expected) {
      passed++;
      results.push({ name, status: 'PASS', actual, expected });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', actual, expected });
    }
  }

  // 1. Toolbar Button Accessible Names & Configuration
  assert("Toolbar manager file exists", fs.existsSync(TOOLBAR_JS_PATH), true);
  const toolbarJsContent = fs.readFileSync(TOOLBAR_JS_PATH, 'utf8');

  assert("Toolbar buttons have accessible name 'Format selected text as Bold'", toolbarJsContent.includes("Format selected text as Bold"), true);
  assert("Toolbar buttons have accessible name 'Format selected text as Italic'", toolbarJsContent.includes("Format selected text as Italic"), true);
  assert("Toolbar buttons have accessible name 'Format selected text as Bold Italic'", toolbarJsContent.includes("Format selected text as Bold Italic"), true);
  assert("Toolbar buttons have accessible name 'Format selected text as Underline'", toolbarJsContent.includes("Format selected text as Underline"), true);
  assert("Toolbar buttons have accessible name 'Format selected text as Double Underline'", toolbarJsContent.includes("Format selected text as Double Underline"), true);

  // 2. Keyboard Accessibility & Activation
  assert("Toolbar buttons use explicit type='button'", toolbarJsContent.includes("btn.type = 'button'"), true);
  assert("Toolbar button listener supports Enter key", toolbarJsContent.includes("e.key === 'Enter'"), true);
  assert("Toolbar button listener supports Space key", toolbarJsContent.includes("e.key === ' '"), true);
  assert("Escape key listener handles toolbar dismissal", toolbarJsContent.includes("e.key === 'Escape'"), true);

  // 3. Focus Indicators & CSS Rules
  const toolbarCssContent = fs.readFileSync(TOOLBAR_CSS_PATH, 'utf8');
  const popupCssContent = fs.readFileSync(POPUP_CSS_PATH, 'utf8');

  assert("Toolbar CSS defines :focus-visible style", toolbarCssContent.includes(':focus-visible'), true);
  assert("Popup CSS defines :focus-visible style", popupCssContent.includes(':focus-visible'), true);

  // 4. Reduced-Motion Support
  assert("Toolbar JS contains @media (prefers-reduced-motion: reduce)", toolbarJsContent.includes('prefers-reduced-motion: reduce'), true);
  assert("Toolbar CSS contains @media (prefers-reduced-motion: reduce)", toolbarCssContent.includes('prefers-reduced-motion: reduce'), true);
  assert("Popup CSS contains @media (prefers-reduced-motion: reduce)", popupCssContent.includes('prefers-reduced-motion: reduce'), true);

  // 5. Popup Scope & Unsupported Editor Messaging
  const popupHtmlContent = fs.readFileSync(POPUP_HTML_PATH, 'utf8');
  assert("Popup contains supported scope note for LinkedIn post editor", popupHtmlContent.includes("Version 1 supports LinkedIn's Create a Post editor only"), true);
  assert("Popup explicitly states comments, messaging, and article editors are not supported", popupHtmlContent.includes("Comments, messaging, and article editors are not currently supported"), true);

  // 6. Privacy & Accessibility Notices in Popup
  assert("Popup includes local-processing privacy statement", popupHtmlContent.includes("Your text is processed locally in your browser"), true);
  assert("Popup includes Unicode accessibility warning note", popupHtmlContent.includes("Styled text uses Unicode characters rather than native bold or italic formatting"), true);

  // 7. Debug Logging Controls (DEBUG = false by default)
  assert("Toolbar Manager sets DEBUG = false by default", toolbarJsContent.includes('const DEBUG = false;'), true);
  const replacementJsContent = fs.readFileSync(REPLACEMENT_JS_PATH, 'utf8');
  assert("Text Replacement Manager sets DEBUG = false by default", replacementJsContent.includes('const DEBUG = false;'), true);
  const contentScriptContent = fs.readFileSync(CONTENT_SCRIPT_PATH, 'utf8');
  assert("Content script sets DEBUG = false by default", contentScriptContent.includes('const DEBUG = false;'), true);

  // Check that no user text parameter is logged directly
  assert("Text replacement does not log user text content", !replacementJsContent.includes('console.log(selectedText)'), true);

  // 8. Bundle Integrity & Security
  assert("Manifest file exists", fs.existsSync(MANIFEST_PATH), true);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert("Manifest requests no permissions (zero requested permissions)", !manifest.permissions || manifest.permissions.length === 0, true);
  assert("Popup HTML contains no remote HTTP/HTTPS resource tags", popupHtmlContent.match(/<(link|script|img)\s+[^>]*(href|src)=["']https?:\/\//i), null);

  // 9. Single Instance Behavior Guards
  assert("Toolbar Manager enforces single canonical toolbar lookup", toolbarJsContent.includes('cleanupDuplicateToolbars'), true);
  assert("Toolbar Manager enforces single ShadowRoot stylesheet insertion", toolbarJsContent.includes('ensureShadowToolbarStyles'), true);

  return { passed, failed, results };
}

// Auto-run in Node environment
if (typeof process !== 'undefined' && process.argv) {
  const summary = runUXAccessibilityTests();
  console.log(`========================================`);
  console.log(`UX & Accessibility Test Suite Results:`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total: ${summary.passed + summary.failed}`);
  console.log(`========================================`);
  summary.results.forEach(r => {
    if (r.status === 'FAIL') {
      console.error(`[FAIL] ${r.name}`);
      console.error(`       Expected: ${r.expected}`);
      console.error(`       Actual:   ${r.actual}`);
    } else {
      console.log(`[PASS] ${r.name}`);
    }
  });
  process.exit(summary.failed > 0 ? 1 : 0);
}
