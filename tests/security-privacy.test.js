/**
 * security-privacy.test.js
 *
 * Phase 12 — Security and Privacy automated test suite.
 * Zero-dependency, offline, deterministic.
 * Covers manifest permissions, host access, unsafe JS patterns, DOM safety,
 * network/analytics absence, CSP, style isolation, logging hygiene, storage
 * absence, message-passing, dependency audit, and privacy documentation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const TESTS_DIR = path.join(ROOT_DIR, 'tests');

// ---------------------------------------------------------------------------
// Minimal test harness
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

function assertFalsy(name, actual) {
  assert(name, !!actual, false);
}

function assertTrue(name, actual) {
  assert(name, !!actual, true);
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function read(relPath) {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8');
}

function readSrc(relPath) {
  return fs.readFileSync(path.join(SRC_DIR, relPath), 'utf8');
}

function readAllSrcJs() {
  const files = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.js')) {
        files.push({ path: full, content: fs.readFileSync(full, 'utf8') });
      }
    });
  }
  walk(SRC_DIR);
  return files;
}

function readAllSrcHtml() {
  const files = [];
  function walk(dir) {
    fs.readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.html')) {
        files.push({ path: full, content: fs.readFileSync(full, 'utf8') });
      }
    });
  }
  walk(SRC_DIR);
  return files;
}

const allSrcJs = readAllSrcJs();
const allSrcHtml = readAllSrcHtml();
const combinedSrcJs = allSrcJs.map(f => f.content).join('\n');
const manifest = JSON.parse(read('manifest.json'));
const popupHtml = readSrc('popup/popup.html');
const toolbarCss = readSrc('styles/content-toolbar.css');
const readmeContent = read('README.md');

// ---------------------------------------------------------------------------
// 1. Manifest Version
// ---------------------------------------------------------------------------

assert('01. Manifest V3 is used', manifest.manifest_version, 3);

// ---------------------------------------------------------------------------
// 2. No unnecessary permissions
// ---------------------------------------------------------------------------

const permissions = manifest.permissions || [];
const optionalPermissions = manifest.optional_permissions || [];
const hostPermissions = manifest.host_permissions || [];
const optionalHostPermissions = manifest.optional_host_permissions || [];

const FORBIDDEN_PERMISSIONS = [
  'storage', 'tabs', 'activeTab', 'scripting', 'clipboardRead', 'clipboardWrite',
  'history', 'cookies', 'downloads', 'notifications', 'webRequest', '<all_urls>',
  'declarativeContent', 'contentSettings', 'management', 'bookmarks', 'geolocation'
];

FORBIDDEN_PERMISSIONS.forEach((perm) => {
  assertFalsy(`02. Forbidden permission absent: ${perm}`, permissions.includes(perm));
});

assert('02. permissions array is empty (zero declared permissions)', permissions.length, 0);
assert('02. optional_permissions absent or empty', optionalPermissions.length, 0);

// ---------------------------------------------------------------------------
// 3. Host access restricted to LinkedIn
// ---------------------------------------------------------------------------

const contentScripts = manifest.content_scripts || [];
const allMatches = contentScripts.flatMap(cs => cs.matches || []);

assertTrue('03. At least one content script match pattern exists', allMatches.length > 0);
allMatches.forEach((pattern) => {
  assertTrue(`03. Match pattern starts with https://www.linkedin.com: ${pattern}`,
    pattern.startsWith('https://www.linkedin.com'));
  assertFalsy(`03. No http:// match pattern: ${pattern}`, pattern.startsWith('http://'));
});
assertFalsy('03. No <all_urls> match pattern', allMatches.includes('<all_urls>'));
assertFalsy('03. host_permissions absent or empty', hostPermissions.length > 0);

// 3b. No all_frames or match_origin_as_fallback leftover
contentScripts.forEach((cs, i) => {
  assertFalsy(`03. all_frames not set on content script ${i}`, cs.all_frames === true);
  assertFalsy(`03. match_origin_as_fallback not set on content script ${i}`, cs.match_origin_as_fallback === true);
});

// ---------------------------------------------------------------------------
// 4. No remote executable scripts
// ---------------------------------------------------------------------------

allSrcHtml.forEach(({ path: p, content }) => {
  const rel = path.relative(ROOT_DIR, p);
  // script src must not be a remote URL
  const remoteSrcMatches = content.match(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi) || [];
  assert(`04. No remote script src in ${rel}`, remoteSrcMatches.length, 0);
});

// ---------------------------------------------------------------------------
// 5. No remote stylesheets
// ---------------------------------------------------------------------------

allSrcHtml.forEach(({ path: p, content }) => {
  const rel = path.relative(ROOT_DIR, p);
  const remoteLinkMatches = content.match(/<link[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*rel=["']stylesheet["']/gi) ||
    content.match(/<link[^>]+rel=["']stylesheet["'][^>]*href=["'](https?:\/\/[^"']+)["']/gi) || [];
  assert(`05. No remote stylesheet in ${rel}`, remoteLinkMatches.length, 0);
});

// ---------------------------------------------------------------------------
// 6. No remote fonts (CSS @import or link)
// ---------------------------------------------------------------------------

allSrcHtml.forEach(({ path: p, content }) => {
  const rel = path.relative(ROOT_DIR, p);
  assertFalsy(`06. No remote font link in ${rel}`, /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(content));
});

const popupCss = readSrc('popup/popup.css');
assertFalsy('06. No remote font @import in popup.css', /@import.*https?:/i.test(popupCss));
assertFalsy('06. No remote font @import in toolbar.css', /@import.*https?:/i.test(toolbarCss));

// ---------------------------------------------------------------------------
// 7. No inline script in popup HTML
// ---------------------------------------------------------------------------

const inlineScriptPattern = /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi;
const inlineScripts = (popupHtml.match(inlineScriptPattern) || []).filter(s => !/^\s*$/.test(
  s.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '')
));
assert('07. No inline script block in popup HTML', inlineScripts.length, 0);

// ---------------------------------------------------------------------------
// 8. No inline event-handler attributes
// ---------------------------------------------------------------------------

allSrcHtml.forEach(({ path: p, content }) => {
  const rel = path.relative(ROOT_DIR, p);
  const inlineHandlers = content.match(/\s(on[a-z]+)\s*=/gi) || [];
  assert(`08. No inline event-handler attributes in ${rel}`, inlineHandlers.length, 0);
});

// ---------------------------------------------------------------------------
// 9. No eval
// ---------------------------------------------------------------------------

assertFalsy('09. No eval() in source JavaScript', /\beval\s*\(/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 10. No new Function
// ---------------------------------------------------------------------------

assertFalsy('10. No new Function() in source JavaScript', /new\s+Function\s*\(/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 11. No string-based setTimeout
// ---------------------------------------------------------------------------

assertFalsy('11. No string-based setTimeout()', /setTimeout\s*\(\s*['"`]/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 12. No string-based setInterval
// ---------------------------------------------------------------------------

assertFalsy('12. No string-based setInterval()', /setInterval\s*\(\s*['"`]/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 13. No document.write
// ---------------------------------------------------------------------------

assertFalsy('13. No document.write() in source JavaScript', /document\.write\s*\(/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 14. No unsafe-eval in CSP (Manifest V3 default does not allow it)
// ---------------------------------------------------------------------------

const cspString = JSON.stringify(manifest.content_security_policy || {});
assertFalsy('14. No unsafe-eval in manifest CSP', /unsafe-eval/i.test(cspString));
assertFalsy('14. No unsafe-inline script in manifest CSP', /unsafe-inline/i.test(cspString));

// ---------------------------------------------------------------------------
// 15. No user content inserted through innerHTML
// ---------------------------------------------------------------------------

// innerHTML must not be used in production source files at all
// (the only safe uses would be internal trusted-static strings)
assertFalsy('15. No innerHTML assignment in source JavaScript', /\binnerHTML\s*=/.test(combinedSrcJs));
assertFalsy('15. No outerHTML assignment in source JavaScript', /\bouterHTML\s*=/.test(combinedSrcJs));
assertFalsy('15. No insertAdjacentHTML in source JavaScript', /insertAdjacentHTML/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 16. Toolbar uses extension-owned selectors (ltf- prefix)
// ---------------------------------------------------------------------------

assertTrue('16. Toolbar CSS uses .ltf-toolbar selector', toolbarCss.includes('.ltf-toolbar'));
assertTrue('16. Toolbar CSS uses .ltf-toolbar__button selector', toolbarCss.includes('.ltf-toolbar__button'));
assertFalsy('16. Toolbar CSS does not globally reset body', /^body\s*\{/m.test(toolbarCss));
assertFalsy('16. Toolbar CSS does not globally reset button', /^button\s*\{/m.test(toolbarCss));
assertFalsy('16. Toolbar CSS does not globally reset div', /^div\s*\{/m.test(toolbarCss));

// ---------------------------------------------------------------------------
// 17. No broad generic LinkedIn CSS override
// ---------------------------------------------------------------------------

assertFalsy('17. No global * reset in toolbar CSS', /^\*\s*\{/m.test(toolbarCss));
assertFalsy('17. No :root variable override in toolbar CSS', /:root\s*\{/.test(toolbarCss));

// ---------------------------------------------------------------------------
// 18. DEBUG is false by default in every content script
// ---------------------------------------------------------------------------

const debugChecks = [
  { file: 'content/content-script.js', label: 'content-script.js' },
  { file: 'content/toolbar-manager.js', label: 'toolbar-manager.js' },
  { file: 'content/text-replacement-manager.js', label: 'text-replacement-manager.js' },
  { file: 'content/selection-manager.js', label: 'selection-manager.js' }
];

debugChecks.forEach(({ file, label }) => {
  const src = readSrc(file);
  assertTrue(`18. DEBUG = false in ${label}`, /const DEBUG = false/.test(src));
});

// ---------------------------------------------------------------------------
// 19. No selected text logging
// ---------------------------------------------------------------------------

assertFalsy('19. No console.log(selectedText) in source', /console\.log\(selectedText\)/.test(combinedSrcJs));
assertFalsy('19. No console.log(range.toString()) in source', /console\.log\(range\.toString\(\)\)/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 20. No formatted text logging
// ---------------------------------------------------------------------------

assertFalsy('20. No console.log(formattedText) in source', /console\.log\(formattedText\)/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 21. No fetch or XMLHttpRequest in source
// ---------------------------------------------------------------------------

assertFalsy('21. No fetch() call in source JavaScript', /\bfetch\s*\(/.test(combinedSrcJs));
assertFalsy('21. No XMLHttpRequest in source JavaScript', /new\s+XMLHttpRequest/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 22. No WebSocket or sendBeacon in source
// ---------------------------------------------------------------------------

assertFalsy('22. No WebSocket in source JavaScript', /new\s+WebSocket/.test(combinedSrcJs));
assertFalsy('22. No sendBeacon in source JavaScript', /navigator\.sendBeacon/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 23. No analytics library in source
// ---------------------------------------------------------------------------

const analyticsPatterns = [
  /google-analytics/i, /googletagmanager/i, /gtag\s*\(/,
  /mixpanel/i, /segment\.io/i, /amplitude/i, /heap\.io/i,
  /\banalytics\b/, /\btelemetry\b/, /\btracking\b/
];

analyticsPatterns.forEach((pat) => {
  assertFalsy(`23. No analytics pattern "${pat.source}" in source JS`, pat.test(combinedSrcJs));
});

// ---------------------------------------------------------------------------
// 24. No Chrome Storage usage in source
// ---------------------------------------------------------------------------

assertFalsy('24. No chrome.storage in source JavaScript', /chrome\.storage/.test(combinedSrcJs));
assertFalsy('24. No localStorage in source JavaScript', /\blocalStorage\b/.test(combinedSrcJs));
assertFalsy('24. No sessionStorage in source JavaScript', /\bsessionStorage\b/.test(combinedSrcJs));
assertFalsy('24. No indexedDB in source JavaScript', /\bindexedDB\b/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 25. No clipboard-reading API in source
// ---------------------------------------------------------------------------

assertFalsy('25. No navigator.clipboard.read in source JavaScript', /navigator\.clipboard\.read/.test(combinedSrcJs));
assertFalsy('25. No document.execCommand("paste") in source JavaScript', /execCommand\s*\(\s*['"]paste['"]/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 26. No remote dependency (package.json, node_modules)
// ---------------------------------------------------------------------------

assertFalsy('26. No package.json in repository root', fs.existsSync(path.join(ROOT_DIR, 'package.json')));
assertFalsy('26. No node_modules directory', fs.existsSync(path.join(ROOT_DIR, 'node_modules')));

// ---------------------------------------------------------------------------
// 27. README contains a Privacy section
// ---------------------------------------------------------------------------

assertTrue('27. README.md contains ## Privacy section', /^## Privacy/m.test(readmeContent));
assertTrue('27. README Privacy mentions local processing', /process(ed|es) (all text )?locally/i.test(readmeContent));
assertTrue('27. README Privacy mentions no data transmitted', /(not|never) (uploaded|transmitted|sent)/i.test(readmeContent));

// ---------------------------------------------------------------------------
// 28. PRIVACY.md exists
// ---------------------------------------------------------------------------

assertTrue('28. PRIVACY.md exists', fs.existsSync(path.join(ROOT_DIR, 'PRIVACY.md')));

// ---------------------------------------------------------------------------
// 29. PRIVACY.md includes local processing statement
// ---------------------------------------------------------------------------

if (fs.existsSync(path.join(ROOT_DIR, 'PRIVACY.md'))) {
  const privacyContent = read('PRIVACY.md');
  assertTrue('29. PRIVACY.md includes local processing statement', /locally/i.test(privacyContent));
  assertTrue('30. PRIVACY.md includes no data collection statement', /does not collect/i.test(privacyContent));
  assertTrue('31. PRIVACY.md includes no data sharing statement', /not shared|no.*shar/i.test(privacyContent));
} else {
  assert('29. PRIVACY.md exists (skip detail checks)', false, true);
  assert('30. PRIVACY.md no data collection', false, true);
  assert('31. PRIVACY.md no data sharing', false, true);
}

// ---------------------------------------------------------------------------
// 32. Protected entity checks remain present
// ---------------------------------------------------------------------------

const editorManagerJs = readSrc('content/editor-manager.js');
assertTrue('32. rangeIntersectsProtectedEntity remains in editor-manager.js',
  editorManagerJs.includes('rangeIntersectsProtectedEntity'));
assertTrue('32. PROTECTED_ENTITY_SELECTOR remains in editor-manager.js',
  editorManagerJs.includes('PROTECTED_ENTITY_SELECTOR'));

// ---------------------------------------------------------------------------
// 33. Plain-text URL protection remains present
// ---------------------------------------------------------------------------

assertTrue('33. rangeIntersectsUrlText remains in editor-manager.js',
  editorManagerJs.includes('rangeIntersectsUrlText'));
assertTrue('33. findUrlSpansInText remains in editor-manager.js',
  editorManagerJs.includes('findUrlSpansInText'));

const selectionManagerJs = readSrc('content/selection-manager.js');
assertTrue('33. Plain-text URL check remains in selection-manager.js',
  selectionManagerJs.includes('rangeIntersectsUrlText') || selectionManagerJs.includes('rangeIntersectsProtectedContent'));

// ---------------------------------------------------------------------------
// 34. One toolbar and one stylesheet protections remain present
// ---------------------------------------------------------------------------

const toolbarManagerJs = readSrc('content/toolbar-manager.js');
assertTrue('34. Single canonical toolbar guard remains in toolbar-manager.js',
  toolbarManagerJs.includes('data-linkedin-text-formatter'));
assertTrue('34. cleanupDuplicateToolbars remains in toolbar-manager.js',
  toolbarManagerJs.includes('cleanupDuplicateToolbars'));
assertTrue('34. ensureShadowToolbarStyles single-stylesheet guard remains',
  toolbarManagerJs.includes('ensureShadowToolbarStyles'));

// ---------------------------------------------------------------------------
// 35. Popup repository link is fixed and trusted
// ---------------------------------------------------------------------------

const popupJs = readSrc('popup/popup.js');
assertTrue('35. Popup reads href from static anchor attribute (not user input)',
  popupJs.includes("githubLink.getAttribute('href')"));
assertFalsy('35. Popup does not concatenate user input into URL',
  /url\s*\+/.test(popupJs) || /targetUrl\s*\+/.test(popupJs));

// The github link href is static in HTML
assertTrue('35. GitHub link href is hardcoded in popup HTML (not dynamic)',
  popupHtml.includes('href="https://github.com/HarshSoni200706/linkedin-text-formatter-extension"'));

// ---------------------------------------------------------------------------
// 36. No new permissions were introduced
// ---------------------------------------------------------------------------

assert('36. Manifest permissions array remains empty', (manifest.permissions || []).length, 0);
assert('36. No optional_permissions declared', (manifest.optional_permissions || []).length, 0);
assert('36. No host_permissions declared', (manifest.host_permissions || []).length, 0);

// ---------------------------------------------------------------------------
// 37. No message-passing between extension contexts
// ---------------------------------------------------------------------------

assertFalsy('37. No chrome.runtime.sendMessage in source', /chrome\.runtime\.sendMessage/.test(combinedSrcJs));
assertFalsy('37. No chrome.tabs.sendMessage in source', /chrome\.tabs\.sendMessage/.test(combinedSrcJs));
assertFalsy('37. No window.postMessage in source', /window\.postMessage/.test(combinedSrcJs));
assertFalsy('37. No BroadcastChannel in source', /new\s+BroadcastChannel/.test(combinedSrcJs));
assertFalsy('37. No MessageChannel in source', /new\s+MessageChannel/.test(combinedSrcJs));

// ---------------------------------------------------------------------------
// 38. All extension resources are local
// ---------------------------------------------------------------------------

// Popup HTML must not load remote resources via <img>, <script>, <link>
assertFalsy('38. No remote image src in popup HTML', /<img[^>]+src=["']https?:\/\//i.test(popupHtml));
assertFalsy('38. No iframe in popup HTML', /<iframe/i.test(popupHtml));

// Content scripts declared in manifest must all reference local paths
const contentScriptJsPaths = contentScripts.flatMap(cs => cs.js || []);
contentScriptJsPaths.forEach((jsPath) => {
  assertFalsy(`38. Content script path is local (no remote URL): ${jsPath}`,
    jsPath.startsWith('http://') || jsPath.startsWith('https://'));
  assertTrue(`38. Content script file exists on disk: ${jsPath}`,
    fs.existsSync(path.join(ROOT_DIR, jsPath)));
});

const contentScriptCssPaths = contentScripts.flatMap(cs => cs.css || []);
contentScriptCssPaths.forEach((cssPath) => {
  assertFalsy(`38. Content script CSS path is local: ${cssPath}`,
    cssPath.startsWith('http://') || cssPath.startsWith('https://'));
  assertTrue(`38. Content script CSS file exists on disk: ${cssPath}`,
    fs.existsSync(path.join(ROOT_DIR, cssPath)));
});

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function runSecurityTests() {
  return { passed, failed, results };
}

if (typeof process !== 'undefined' && process.argv) {
  const summary = runSecurityTests();
  console.log('========================================');
  console.log('Phase 12 Security & Privacy Test Suite Results:');
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
