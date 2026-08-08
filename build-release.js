/**
 * build-release.js
 *
 * Builds the release staging directory and ZIP for linkedin-text-formatter-v1.0.0.
 * Run from the repository root:
 *   node build-release.js
 *
 * Requires: Node.js built-in `fs`, `path`, `child_process` only (zero npm deps).
 * Produces:
 *   release/linkedin-text-formatter-v1.0.0/   (staging directory)
 *   linkedin-text-formatter-v1.0.0.zip        (release archive)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = __dirname;
const VERSION = '1.0.0';
const STAGE_DIR = path.join(ROOT, 'release', `linkedin-text-formatter-v${VERSION}`);
const ZIP_NAME = `linkedin-text-formatter-v${VERSION}.zip`;
const ZIP_PATH = path.join(ROOT, ZIP_NAME);

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Clean and create staging dir
// ---------------------------------------------------------------------------
console.log(`Creating staging directory: ${STAGE_DIR}`);
if (fs.existsSync(STAGE_DIR)) {
  fs.rmSync(STAGE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 2. Copy runtime-required files
// ---------------------------------------------------------------------------
// manifest.json (required at ZIP root)
fs.copyFileSync(path.join(ROOT, 'manifest.json'), path.join(STAGE_DIR, 'manifest.json'));
console.log('  Copied manifest.json');

// src/ (all content scripts, formatter, popup, shared, styles)
copyDir(path.join(ROOT, 'src'), path.join(STAGE_DIR, 'src'));
console.log('  Copied src/');

// assets/icons/ (required by manifest icon declarations)
copyDir(path.join(ROOT, 'assets', 'icons'), path.join(STAGE_DIR, 'assets', 'icons'));
console.log('  Copied assets/icons/');

// ---------------------------------------------------------------------------
// 3. List staging contents
// ---------------------------------------------------------------------------
console.log('\n=== Staging directory contents ===');
function listDir(dir, indent) {
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const rel = path.relative(STAGE_DIR, full);
    if (fs.statSync(full).isDirectory()) {
      console.log(`${'  '.repeat(indent)}${entry}/`);
      listDir(full, indent + 1);
    } else {
      const size = fs.statSync(full).size;
      console.log(`${'  '.repeat(indent)}${entry}  (${size} bytes)`);
    }
  }
}
listDir(STAGE_DIR, 0);

// ---------------------------------------------------------------------------
// 4. Create ZIP from staging directory
// ---------------------------------------------------------------------------
// Change into the staging dir's parent so zip root = staging dir name
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
  console.log(`\nRemoved existing ${ZIP_NAME}`);
}

const stageParent = path.dirname(STAGE_DIR);
const stageName = path.basename(STAGE_DIR);
// zip -r ../../linkedin-text-formatter-v1.0.0.zip . (from inside staging dir)
// We want manifest.json at the root of the ZIP, so zip from INSIDE staging dir
const zipCmd = `cd "${STAGE_DIR}" && zip -r "${ZIP_PATH}" . --exclude "*.DS_Store" "*/Thumbs.db"`;
console.log(`\nCreating ZIP: ${ZIP_NAME}`);
execSync(zipCmd, { stdio: 'inherit' });

// ---------------------------------------------------------------------------
// 5. Report ZIP stats
// ---------------------------------------------------------------------------
const zipStat = fs.statSync(ZIP_PATH);
const zipHash = crypto.createHash('sha256').update(fs.readFileSync(ZIP_PATH)).digest('hex');

console.log('\n=== Release ZIP ===');
console.log(`Path:   ${ZIP_PATH}`);
console.log(`Size:   ${zipStat.size} bytes`);
console.log(`SHA-256: ${zipHash}`);

// Count files in ZIP
const zipList = execSync(`unzip -l "${ZIP_PATH}"`).toString();
const fileLines = zipList.split('\n').filter(l => l.match(/^\s+\d+\s+\d{4}-\d{2}-\d{2}/));
console.log(`Files:  ${fileLines.length}`);

console.log('\n=== Done. Verify the ZIP by loading the staging directory in chrome://extensions/ ===');
