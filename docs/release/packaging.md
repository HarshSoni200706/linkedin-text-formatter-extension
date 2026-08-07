# Release & Packaging Guide

This guide describes the step-by-step release process for packaging the LinkedIn Text Formatter Chrome extension for distribution or Chrome Web Store submission.

---

## Release Checklist

Complete these steps in order before packaging a release:

1. **Update Manifest Version:**
   Check `manifest.json` and ensure `"version"` matches the release version (e.g. `"0.1.0"`).

2. **Update CHANGELOG.md:**
   Move `[Unreleased]` items under a new version heading `[0.1.0]` with completed details.

3. **Run All Automated Test Suites:**
   Execute all Node test suites to verify 100% pass rate:
   ```bash
   for suite in tests/*.test.js; do node "$suite"; done
   ```

4. **Complete Manual Testing Checklist:**
   Follow `docs/testing/manual-testing-checklist.md` across both Layout A and Layout B composers in Chrome.

5. **Verify PRIVACY.md & README:**
   Ensure privacy disclosures remain accurate and consistent.

6. **Verify Permissions & Host Access:**
   Confirm `manifest.json` declares zero permissions (`"permissions": []`) and restricted host access (`"https://www.linkedin.com/*"`).

7. **Verify Debug Output Silencing:**
   Confirm `const DEBUG = false` in all content script files:
   - `src/content/content-script.js`
   - `src/content/toolbar-manager.js`
   - `src/content/selection-manager.js`
   - `src/content/text-replacement-manager.js`

8. **Confirm Local Assets Only:**
   Verify no remote scripts, stylesheets, fonts, or images are imported.

9. **Create Clean Release Archive:**
   Package the extension zip file ensuring `manifest.json` is at the root.

10. **Test Archive as Unpacked Extension:**
    Unzip the package into a temporary directory and test loading it in `chrome://extensions/`.

11. **Prepare Store Listing Material:**
    Prepare description text, privacy policy link, and sanitized promotional screenshots.

---

## Linux Release Packaging Command

Run this command from the repository root to create a clean release zip archive:

```bash
zip -r linkedin-text-formatter-v0.1.0.zip . \
  -x "*.git*" \
  -x "*.vscode*" \
  -x "*.idea*" \
  -x "*DS_Store*" \
  -x "*.tmp*" \
  -x "*.log*" \
  -x "linkedin-text-formatter-*.zip"
```

### Archive Structure Verification

Verify that `manifest.json` is located at the archive root:

```bash
unzip -l linkedin-text-formatter-v0.1.0.zip | head -15
```

Expected root structure inside the zip:
```
manifest.json
README.md
PRIVACY.md
LICENSE
assets/
src/
```
