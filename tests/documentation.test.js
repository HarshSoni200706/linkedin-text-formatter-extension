/**
 * documentation.test.js
 *
 * Phase 13 — Documentation automated test suite.
 * Zero-dependency, offline, deterministic Node test suite.
 * Validates documentation completeness, link integrity, file existence,
 * privacy disclosures, accessibility warnings, version consistency,
 * and absence of unsupported claims or broken local links.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Test Harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const results = [];

function assert(name, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    results.push({ status: 'PASS', name });
  } else {
    failed++;
    results.push({ status: 'FAIL', name, expected, actual });
  }
}

function assertTrue(name, actual) {
  assert(name, !!actual, true);
}

function assertFalsy(name, actual) {
  assert(name, !!actual, false);
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

// ---------------------------------------------------------------------------
// Read Core Files
// ---------------------------------------------------------------------------

const readme = exists('README.md') ? read('README.md') : '';
const privacy = exists('PRIVACY.md') ? read('PRIVACY.md') : '';
const contributing = exists('CONTRIBUTING.md') ? read('CONTRIBUTING.md') : '';
const changelog = exists('CHANGELOG.md') ? read('CHANGELOG.md') : '';
const manifest = exists('manifest.json') ? JSON.parse(read('manifest.json')) : {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// 1. README exists
assertTrue('01. README.md exists', exists('README.md'));

// 2. Project name exists in README
assertTrue('02. Project name in README.md', /^# LinkedIn Text Formatter Extension/m.test(readme));

// 3. One-line description exists
assertTrue('03. One-line description in README.md',
  /LinkedIn Text Formatter is a lightweight Chrome extension that lets users format selected text in LinkedIn's Create a Post editor/i.test(readme));

// 4. Problem statement exists
assertTrue('04. Problem being solved section in README.md', /^## Problem Being Solved/m.test(readme));

// 5. Workflow exists
assertTrue('05. How the extension works section in README.md', /^## How the Extension Works/m.test(readme));

// 6. Five styles are documented
assertTrue('06. Bold style documented in README', /Mathematical Bold/i.test(readme));
assertTrue('06. Italic style documented in README', /Mathematical Italic/i.test(readme));
assertTrue('06. Bold Italic style documented in README', /Mathematical Bold Italic/i.test(readme));
assertTrue('06. Underline style documented in README', /Combining Low Line/i.test(readme));
assertTrue('06. Double Underline style documented in README', /Combining Double Low Line/i.test(readme));

// 7. Installation steps exist
assertTrue('07. Installation section in README.md', /^## Installation in Developer Mode/m.test(readme));
assertTrue('07. Git clone command in README', /git clone https:\/\/github\.com\/HarshSoni200706\/linkedin-text-formatter-extension\.git/.test(readme));

// 8. Usage steps exist
assertTrue('08. Usage instructions section in README.md', /^## Usage Instructions/m.test(readme));
assertTrue('08. Mouse workflow in README', /^### Mouse Workflow/m.test(readme));
assertTrue('08. Keyboard workflow in README', /^### Keyboard Workflow/m.test(readme));

// 9. Folder structure exists
assertTrue('09. Project structure section in README.md', /^## Project Structure/m.test(readme));
assertTrue('09. Folder structure lists manifest.json', /manifest\.json/.test(readme));

// 10. Technology stack exists
assertTrue('10. Technology stack section in README.md', /^## Technology Stack/m.test(readme));
assertTrue('10. Technology stack lists Manifest V3', /Manifest V3/.test(readme));

// 11. Architecture exists
assertTrue('11. Architecture overview section in README.md', /^## Architecture Overview/m.test(readme));
assertTrue('11. Architecture documents EditorManager', /EditorManager/.test(readme));
assertTrue('11. Architecture documents SelectionManager', /SelectionManager/.test(readme));

// 12. Testing instructions exist
assertTrue('12. Running automated tests section in README.md', /^## Running Automated Tests/m.test(readme));

// 13. Privacy section exists
assertTrue('13. Privacy section in README.md', /^## Privacy/m.test(readme));

// 14. Accessibility section exists
assertTrue('14. Accessibility section in README.md', /^## Accessibility/m.test(readme));

// 15. Known limitations exist
assertTrue('15. Known limitations section in README.md', /^## Known Limitations/m.test(readme));

// 16. Contribution section exists
assertTrue('16. Contributing section in README.md', /^## Contributing/m.test(readme));

// 17. Roadmap exists
assertTrue('17. Development roadmap section in README.md', /^## Development Roadmap/m.test(readme));

// 18. License section exists
assertTrue('18. License section in README.md', /^## License/m.test(readme));

// 19. CONTRIBUTING.md exists
assertTrue('19. CONTRIBUTING.md exists', exists('CONTRIBUTING.md'));

// 20. PRIVACY.md exists
assertTrue('20. PRIVACY.md exists', exists('PRIVACY.md'));

// 21. CHANGELOG.md exists
assertTrue('21. CHANGELOG.md exists', exists('CHANGELOG.md'));

// 22. Manual testing checklist exists
assertTrue('22. Manual testing checklist exists', exists('docs/testing/manual-testing-checklist.md'));

// 23. Unicode mapping guide exists
assertTrue('23. Unicode mapping guide exists', exists('docs/development/updating-unicode-mappings.md'));

// 24. Editor detection guide exists
assertTrue('24. Editor detection guide exists', exists('docs/development/linkedin-editor-detection.md'));

// 25. Packaging guide exists
assertTrue('25. Packaging guide exists', exists('docs/release/packaging.md'));

// 26. Screenshot directory documentation exists
assertTrue('26. Screenshot README exists', exists('assets/screenshots/README.md'));

// 27. No unsupported feature is documented as available
assertFalsy('27. README does not claim comments are supported', /Comments are supported/i.test(readme));
assertFalsy('27. README does not claim messaging is supported', /Messaging is supported/i.test(readme));

// 28. No Chrome Web Store publication claim exists
assertFalsy('28. README does not claim CWS published', /available on the Chrome Web Store/i.test(readme));
assertFalsy('28. CHANGELOG does not claim CWS published', /published on Chrome Web Store/i.test(changelog));

// 29. No broken local Markdown links exist in docs and README
const mdFiles = [
  'README.md', 'PRIVACY.md', 'CONTRIBUTING.md', 'CHANGELOG.md',
  'docs/testing/manual-testing-checklist.md',
  'docs/development/updating-unicode-mappings.md',
  'docs/development/linkedin-editor-detection.md',
  'docs/release/packaging.md',
  'docs/qa/phase-11-test-report.md',
  'docs/security/phase-12-security-review.md',
  'assets/screenshots/README.md'
];

mdFiles.forEach((file) => {
  if (!exists(file)) return;
  const content = read(file);
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  links.forEach((linkStr) => {
    const targetMatch = linkStr.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!targetMatch) return;
    const target = targetMatch[2];
    // Skip external URLs and anchor links
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#') || target.startsWith('mailto:')) {
      return;
    }
    const cleanTarget = target.split('#')[0];
    if (!cleanTarget) return;
    const resolvedPath = path.resolve(path.dirname(path.join(ROOT_DIR, file)), cleanTarget);
    assertTrue(`29. Relative link in ${file} target exists: ${cleanTarget}`, fs.existsSync(resolvedPath));
  });
});

// 30. No private absolute filesystem paths exist in documentation files
mdFiles.forEach((file) => {
  if (!exists(file)) return;
  const content = read(file);
  assertFalsy(`30. No file:/// in ${file}`, /file:\/\/\//i.test(content));
  assertFalsy(`30. No local home directory in ${file}`, /\/home\/harshsoni/i.test(content));
  assertFalsy(`30. No /Users/ path in ${file}`, /\/Users\//i.test(content));
});

// 31. No placeholder screenshot broken image links in README
const mdImageLinks = readme.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
mdImageLinks.forEach((imgStr) => {
  const match = imgStr.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (!match) return;
  const target = match[2];
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    assertTrue(`31. Embedded markdown image link in README exists on disk: ${target}`, exists(target));
  }
});

const htmlImageLinks = readme.match(/<img[^>]+src=["']([^"']+)["']/g) || [];
htmlImageLinks.forEach((imgStr) => {
  const match = imgStr.match(/src=["']([^"']+)["']/);
  if (!match) return;
  const target = match[1];
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    assertTrue(`31. Embedded HTML img link in README exists on disk: ${target}`, exists(target));
  }
});
assert('31. At least one embedded screenshot image in README', (mdImageLinks.length + htmlImageLinks.length) > 0, true);

// 32. Privacy claims consistency across README and PRIVACY.md
assertTrue('32. README mentions zero data upload', /not uploaded|never sent/i.test(readme));
assertTrue('32. PRIVACY.md mentions zero data collection', /does not collect/i.test(privacy));

// 33. Accessibility warning present in README
assertTrue('33. Accessibility warning block in README.md', /> \[!WARNING\][\s\S]*?Screen Reader Notice/m.test(readme));

// 34. Link and URL exclusions documented
assertTrue('34. Protected links and URLs documented in README', /protected/i.test(readme) && /links/i.test(readme));

// 35. Both composer layouts documented
assertTrue('35. Layout A documented in README', /Layout A/i.test(readme) || /Direct-document/i.test(readme));
assertTrue('35. Layout B documented in README', /Layout B/i.test(readme) || /Shadow DOM/i.test(readme));

// 36. License file exists
assertTrue('36. LICENSE file exists', exists('LICENSE'));

// 37. Version references consistency
const popupHtml = read('src/popup/popup.html');
assertTrue('37. Manifest version is 0.1.0', manifest.version === '0.1.0');
assertTrue('37. Popup HTML version is v0.1.0', popupHtml.includes('v0.1.0'));
assertTrue('37. README documents version 0.1.0', /0\.1\.0/.test(readme));

// 38. Test commands in README include all current test suites
const expectedSuites = [
  'formatter.test.js',
  'editor-detector.test.js',
  'selection-manager.test.js',
  'toolbar-manager.test.js',
  'text-replacement-manager.test.js',
  'popup.test.js',
  'ux-accessibility.test.js',
  'quality-assurance.test.js',
  'security-privacy.test.js'
];
expectedSuites.forEach((suite) => {
  assertTrue(`38. README lists test suite ${suite}`, readme.includes(suite));
});

// ---------------------------------------------------------------------------
// Run Test Suite
// ---------------------------------------------------------------------------

function runDocumentationTests() {
  return { passed, failed, results };
}

if (typeof process !== 'undefined' && process.argv) {
  const summary = runDocumentationTests();
  console.log('========================================');
  console.log('Phase 13 Documentation Test Suite Results:');
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Total: ${summary.passed + summary.failed}`);
  console.log('========================================');
  summary.results.forEach((r) => {
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
