/**
 * popup.test.js
 *
 * Zero-dependency automated test suite for Phase 9 Extension Popup:
 * - Manifest popup configuration
 * - Storage permission absence (v1 product decision)
 * - Popup HTML structure, semantic sections, and accessibility labels
 * - Absence of inline scripts and remote CDN resources
 * - GitHub repository URL accuracy
 * - Version reading logic in popup.js
 * - Verification of exact Unicode formatting examples matching the engine output
 */

const fs = require('fs');
const path = require('path');
const { formatText } = require('../src/formatter/text-formatter');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT_DIR, 'manifest.json');
const HTML_PATH = path.join(ROOT_DIR, 'src/popup/popup.html');
const CSS_PATH = path.join(ROOT_DIR, 'src/popup/popup.css');
const JS_PATH = path.join(ROOT_DIR, 'src/popup/popup.js');

function runPopupTests() {
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

  // 1. Manifest Checks
  assert("Manifest file exists", fs.existsSync(MANIFEST_PATH), true);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert("Manifest popup path points to src/popup/popup.html", manifest.action && manifest.action.default_popup, 'src/popup/popup.html');
  assert("Manifest requests no storage permission (v1 product decision)", Boolean(manifest.permissions && manifest.permissions.includes('storage')), false);
  assert("Manifest version is 0.1.0", manifest.version, '0.1.0');

  // 2. File Existence Checks
  assert("popup.html exists", fs.existsSync(HTML_PATH), true);
  assert("popup.css exists", fs.existsSync(CSS_PATH), true);
  assert("popup.js exists", fs.existsSync(JS_PATH), true);

  const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
  const cssContent = fs.readFileSync(CSS_PATH, 'utf8');
  const jsContent = fs.readFileSync(JS_PATH, 'utf8');

  // 3. Security & Bundle Integrity Checks
  assert("popup.html references local popup.css", htmlContent.includes('<link rel="stylesheet" href="popup.css">'), true);
  assert("popup.html references local popup.js", htmlContent.includes('<script src="popup.js"></script>'), true);

  // Check for inline script tags containing code inside html
  const inlineScriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let hasInlineCode = false;
  let match;
  while ((match = inlineScriptRegex.exec(htmlContent)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      hasInlineCode = true;
    }
  }
  assert("popup.html contains no inline script code", hasInlineCode, false);

  // Check for remote resource links (http:// or https://) in HTML tags (except github repo link)
  const remoteTagMatch = htmlContent.match(/<(link|script|img)\s+[^>]*(href|src)=["']https?:\/\//i);
  assert("popup.html loads no remote CSS, JS, or image resources", remoteTagMatch, null);

  // 4. Section Structure Checks
  assert("popup.html contains header section", htmlContent.includes('class="popup-header"'), true);
  assert("popup.html contains How to Use section", htmlContent.includes('How to Use'), true);
  assert("popup.html contains Supported Styles section", htmlContent.includes('Supported Styles'), true);
  assert("popup.html contains Accessibility Note section", htmlContent.includes('Accessibility Note'), true);
  assert("popup.html contains Privacy Guaranteed section", htmlContent.includes('Privacy Guaranteed'), true);
  assert("popup.html contains version badge element (#extension-version)", htmlContent.includes('id="extension-version"'), true);

  // 5. Supported Styles Exact Content Checks (matching engine output dynamically)
  const expectedBold = formatText('Bold', 'bold');
  const expectedItalic = formatText('Italic', 'italic');
  const expectedBoldItalic = formatText('Bold Italic', 'bold-italic');
  const expectedUnderline = formatText('Underline', 'underline');
  const expectedDoubleUnderline = formatText('Double Underline', 'double-underline');

  assert("popup.html displays Bold style example matching engine", htmlContent.includes(expectedBold), true);
  assert("popup.html displays Italic style example matching engine", htmlContent.includes(expectedItalic), true);
  assert("popup.html displays Bold Italic style example matching engine", htmlContent.includes(expectedBoldItalic), true);
  assert("popup.html displays Underline style example matching engine", htmlContent.includes(expectedUnderline), true);
  assert("popup.html displays Double Underline style example matching engine", htmlContent.includes(expectedDoubleUnderline), true);

  // Verify double-underline example uses U+0333 for every character
  const doubleUnderlineBytes = Buffer.from(expectedDoubleUnderline);
  let hasSingleUnderline = false;
  for (let i = 0; i < doubleUnderlineBytes.length - 1; i++) {
    if (doubleUnderlineBytes[i] === 0xcc && doubleUnderlineBytes[i + 1] === 0xb2) {
      hasSingleUnderline = true;
    }
  }
  assert("Double Underline example uses U+0333 for all combining marks (no U+0332)", hasSingleUnderline, false);

  // 6. Accessibility & Warning Checks
  assert("popup.html contains Unicode accessibility warning text", htmlContent.includes('Styled text uses Unicode characters rather than native bold or italic formatting'), true);
  assert("popup.html contains local privacy statement text", htmlContent.includes('Your text is processed locally in your browser'), true);

  // 7. GitHub Repository Link Checks
  const repoUrl = 'https://github.com/HarshSoni200706/linkedin-text-formatter-extension';
  assert("popup.html contains real GitHub repository URL", htmlContent.includes(repoUrl), true);
  assert("popup.html GitHub link opens in new tab (target=_blank)", htmlContent.includes('target="_blank"'), true);

  // 8. Styling Checks
  assert("popup.css supports dark mode (@media prefers-color-scheme)", cssContent.includes('prefers-color-scheme: dark'), true);
  assert("popup.css sets max-width or width around 340px", cssContent.includes('width: 340px'), true);

  // 9. Popup JavaScript Logic Checks
  assert("popup.js reads manifest version via chrome.runtime.getManifest()", jsContent.includes('chrome.runtime.getManifest()'), true);

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runPopupTests();
  console.log(`========================================`);
  console.log(`Extension Popup Test Suite Results:`);
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
