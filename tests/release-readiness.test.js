/**
 * release-readiness.test.js
 *
 * Phase 14 — Release Readiness automated test suite.
 * Zero-dependency, offline, deterministic Node test suite.
 *
 * Validates:
 * - Version = 1.0.0 throughout manifest, popup, changelog, docs
 * - Manifest structural validity
 * - Required icons exist
 * - All content-script source files exist
 * - No unexpected permissions
 * - No remote resource references in source
 * - No unconditional debug logs in production source
 * - Privacy policy exists
 * - Changelog contains 1.0.0 entry
 * - Release documentation exists
 * - Screenshot assets exist
 * - Support section exists in README
 * - No secret-like patterns in source
 * - Release ZIP build script exists
 * - .gitignore covers release artifacts
 * - Release notes exist
 * - Chrome Web Store readiness doc exists
 * - Chrome Web Store listing doc exists
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(name, actual, expected) {
  const ok = actual === expected;
  if (ok) { passed++; results.push({ status: 'PASS', name }); }
  else { failed++; results.push({ status: 'FAIL', name, expected, actual }); }
}
function assertTrue(name, actual)  { assert(name, !!actual, true); }
function assertFalsy(name, actual) { assert(name, !!actual, false); }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel)   { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : ''; }

// ─── Load files ─────────────────────────────────────────────────────────────
const manifestRaw = read('manifest.json');
let manifest = {};
try { manifest = JSON.parse(manifestRaw); } catch (_) {}

const readme    = read('README.md');
const changelog = read('CHANGELOG.md');
const privacy   = read('PRIVACY.md');

// ─── 1. Version = 1.0.0 ─────────────────────────────────────────────────────
assert('01. manifest.json version is 1.0.0', manifest.version, '1.0.0');
assertTrue('01. README.md references 1.0.0', /1\.0\.0/.test(readme));
assertTrue('01. CHANGELOG.md contains [1.0.0] section', /^## \[1\.0\.0\]/m.test(changelog));
assertTrue('01. popup.html fallback badge is v1.0.0',
  read('src/popup/popup.html').includes('v1.0.0'));

// ─── 2. Manifest structural validity ────────────────────────────────────────
assert('02. manifest_version = 3', manifest.manifest_version, 3);
assertTrue('02. name declared', typeof manifest.name === 'string' && manifest.name.length > 0);
assertTrue('02. description declared', typeof manifest.description === 'string' && manifest.description.length > 0);
assertTrue('02. action.default_popup declared', !!(manifest.action && manifest.action.default_popup));
assertTrue('02. content_scripts declared', Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0);
assertTrue('02. matches restricted to LinkedIn',
  manifest.content_scripts && manifest.content_scripts[0].matches &&
  manifest.content_scripts[0].matches.join('') === 'https://www.linkedin.com/*');
assertFalsy('02. no <all_urls>',
  manifestRaw.includes('<all_urls>'));
assertFalsy('02. no all_frames',
  manifestRaw.includes('"all_frames"'));
assertFalsy('02. no http:// in matches',
  (manifest.content_scripts || []).some(cs => (cs.matches || []).some(m => m.startsWith('http://'))));

// ─── 3. No unexpected permissions ───────────────────────────────────────────
const perms = manifest.permissions || [];
assertTrue('03. permissions array is empty or absent', perms.length === 0);
assertFalsy('03. no host_permissions declared', !!(manifest.host_permissions));

// ─── 4. Required icons exist ─────────────────────────────────────────────────
['assets/icons/icon-16.png',
 'assets/icons/icon-32.png',
 'assets/icons/icon-48.png',
 'assets/icons/icon-128.png'].forEach(f => assertTrue(`04. ${f} exists`, exists(f)));

// ─── 5. All content-script JS paths exist ────────────────────────────────────
(manifest.content_scripts || []).forEach(cs => {
  (cs.js || []).forEach(f =>
    assertTrue(`05. Content script JS exists: ${f}`, exists(f)));
  (cs.css || []).forEach(f =>
    assertTrue(`05. Content script CSS exists: ${f}`, exists(f)));
});

// ─── 6. Popup file exists ────────────────────────────────────────────────────
const popupPath = manifest.action && manifest.action.default_popup;
assertTrue('06. Popup HTML exists', popupPath ? exists(popupPath) : false);

// ─── 7. No unconditional production console.log in source ───────────────────
const sourceFiles = [
  'src/content/content-script.js',
  'src/content/editor-manager.js',
  'src/content/selection-manager.js',
  'src/content/toolbar-manager.js',
  'src/content/text-replacement-manager.js',
  'src/formatter/text-formatter.js',
  'src/formatter/text-normalizer.js',
  'src/formatter/unicode-maps.js',
  'src/popup/popup.js',
];
sourceFiles.forEach(f => {
  const src = read(f);
  // Unconditional means not gated by `if (DEBUG)` or equivalent
  // We allow: console.error, DEBUG-gated console.log, popup.js fallback console.warn
  const unconditional = src.split('\n').filter(line => {
    const trimmed = line.trim();
    return (
      trimmed.includes('console.log(') &&
      !trimmed.startsWith('//') &&
      !trimmed.includes('if (DEBUG)') &&
      !trimmed.includes('function debugLog')
    );
  });
  assertTrue(`07. No unconditional console.log in ${f}`, unconditional.length === 0);
});

// ─── 8. No remote resource URLs in source ────────────────────────────────────
const remotePattern = /https?:\/\/(?!github\.com|www\.linkedin\.com)/;
sourceFiles.forEach(f => {
  // Only flag actual script src / fetch / XHR patterns, not comments or string literals in popup footer
  const src = read(f);
  const lines = src.split('\n').filter(line => {
    const t = line.trim();
    return !t.startsWith('//') && !t.startsWith('*') && remotePattern.test(line) &&
      (line.includes('fetch(') || line.includes('XMLHttpRequest') ||
       line.includes('import(') || line.includes('<script src'));
  });
  assertTrue(`08. No remote fetch/XHR in ${f}`, lines.length === 0);
});

// ─── 9. Privacy policy exists ────────────────────────────────────────────────
assertTrue('09. PRIVACY.md exists', exists('PRIVACY.md'));
assertTrue('09. PRIVACY.md mentions local processing', /local(ly|ly inside|ized)|process(ed|es)? (all text )?locally/i.test(privacy));
assertTrue('09. PRIVACY.md mentions no data collection', /does not collect/i.test(privacy));

// ─── 10. License exists ──────────────────────────────────────────────────────
assertTrue('10. LICENSE file exists', exists('LICENSE'));
assertTrue('10. LICENSE is MIT', /MIT License/i.test(read('LICENSE')));

// ─── 11. Release documentation exists ───────────────────────────────────────
assertTrue('11. Release notes exist', exists('docs/release/v1.0.0-release-notes.md'));
assertTrue('11. CWS readiness doc exists', exists('docs/release/chrome-web-store-readiness.md'));
assertTrue('11. CWS listing doc exists', exists('docs/release/chrome-web-store-listing.md'));
assertTrue('11. Packaging guide exists', exists('docs/release/packaging.md'));

// ─── 12. Screenshot assets exist ────────────────────────────────────────────
['assets/screenshots/toolbar-selection.png',
 'assets/screenshots/bold-result.png',
 'assets/screenshots/layout-a-direct.png',
 'assets/screenshots/layout-b-shadow.png'].forEach(f =>
  assertTrue(`12. Screenshot exists: ${f}`, exists(f)));

// ─── 13. Changelog 1.0.0 section has content ────────────────────────────────
assertTrue('13. CHANGELOG 1.0.0 section not empty',
  /## \[1\.0\.0\][\s\S]{50,}/.test(changelog));
assertFalsy('13. CHANGELOG does not claim CWS published',
  /published on Chrome Web Store/i.test(changelog));

// ─── 14. README support section ─────────────────────────────────────────────
assertTrue('14. README has Support section', /^## Support/m.test(readme));
assertTrue('14. README support links to GitHub Issues',
  /github\.com.*issues/.test(readme));

// ─── 15. .gitignore covers release artifacts ────────────────────────────────
const gitignore = read('.gitignore');
assertTrue('15. .gitignore covers *.zip', /\*\.zip/.test(gitignore));
assertTrue('15. .gitignore covers .DS_Store', /\.DS_Store/.test(gitignore));
assertTrue('15. .gitignore covers node_modules', /node_modules/.test(gitignore));

// ─── 16. No secret-like patterns in source files ────────────────────────────
const secretPattern = /api_key\s*=\s*['"]|apiKey\s*[:=]\s*['"]|password\s*=\s*['"]|bearer\s+[a-zA-Z0-9]{16}/i;
sourceFiles.forEach(f => {
  assertFalsy(`16. No secret pattern in ${f}`, secretPattern.test(read(f)));
});

// ─── 17. Build script exists ────────────────────────────────────────────────
assertTrue('17. build-release.js exists', exists('build-release.js'));

// ─── 18. Manifest icon paths all exist ──────────────────────────────────────
Object.entries(manifest.icons || {}).forEach(([size, iconPath]) =>
  assertTrue(`18. Icon ${size}px path exists: ${iconPath}`, exists(iconPath)));
Object.entries((manifest.action && manifest.action.default_icon) || {}).forEach(([size, iconPath]) =>
  assertTrue(`18. Action icon ${size}px path exists: ${iconPath}`, exists(iconPath)));

// ─── 19. README version matches manifest ────────────────────────────────────
assertTrue('19. README version matches manifest (1.0.0)', readme.includes(manifest.version || ''));

// ─── 20. No development phase labels in runtime HTML/CSS ────────────────────
const runtimeHtml = read('src/popup/popup.html');
const runtimeCss  = read('src/styles/content-toolbar.css');
assertFalsy('20. No "Phase" labels in popup HTML', /Phase \d+/i.test(runtimeHtml));
assertFalsy('20. No "Phase" labels in toolbar CSS', /Phase \d+/i.test(runtimeCss));

// ─── Results ─────────────────────────────────────────────────────────────────
if (typeof process !== 'undefined' && process.argv) {
  console.log('========================================');
  console.log('Phase 14 Release Readiness Test Results:');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log('========================================');
  results.forEach(r => {
    if (r.status === 'FAIL') {
      console.error(`[FAIL] ${r.name}`);
      console.error(`       Expected: ${r.expected}`);
      console.error(`       Actual:   ${r.actual}`);
    } else {
      console.log(`[PASS] ${r.name}`);
    }
  });
  process.exit(failed > 0 ? 1 : 0);
}
