# Updating Unicode Mappings

This guide explains how the LinkedIn Text Formatter engine converts plain text into styled Unicode output, how character normalization works, and how to safely maintain or update character mappings.

---

## 1. Engine Architecture & Storage Location

Character mapping logic is located in the `src/formatter/` directory:

- **`src/formatter/unicode-maps.js`** — Defines lookup tables and offset calculators for standard ASCII character ranges (`A-Z`, `a-z`, `0-9`).
- **`src/formatter/text-normalizer.js`** — Normalizes previously formatted Unicode characters back to standard ASCII characters before applying a new style.
- **`src/formatter/text-formatter.js`** — Main formatter engine entry point that accepts plain text and a target style key, performing normalization and mapping.

---

## 2. Supported Character Ranges

The formatter supports standard ASCII ranges across five formatting styles:

1. **Latin Uppercase (`A` – `Z`):** Code points `U+0041` – `U+005A`
2. **Latin Lowercase (`a` – `z`):** Code points `U+0061` – `U+007A`
3. **ASCII Digits (`0` – `9`):** Code points `U+0030` – `U+0039`

Unmapped characters (such as punctuation, symbols, whitespace, and non-Latin scripts) pass through unchanged.

---

## 3. Style-Specific Behavior & Mappings

### A. Mathematical Bold (`bold`)
- Uses Unicode **Mathematical Bold** block (`U+1D400` – `U+1D433`).
- Uppercase `A`-`Z` maps to `U+1D400` – `U+1D419` (`𝐀`–`𝐙`).
- Lowercase `a`-`z` maps to `U+1D41A` – `U+1D433` (`𝐚`–`𝐳`).
- Digits `0`-`9` map to Mathematical Bold Digits `U+1D7CE` – `U+1D7D7` (`𝟎`–`𝟗`).

### B. Mathematical Italic (`italic`)
- Uses Unicode **Mathematical Italic** block (`U+1D434` – `U+1D467`).
- Uppercase `A`-`Z` maps to `U+1D434` – `U+1D44D` (`𝐴`–`𝑍`).
- Lowercase `a`-`z` maps to `U+1D44E` – `U+1D467` (`𝑎`–`𝑧`), **except for lowercase 'h'**.
- **The Lowercase 'h' Exception:** Unicode standard reserves `U+1D455` for Planck constant symbol `ℎ`. The formatter explicitly maps lowercase 'h' to `U+1D455` (`ℎ`).
- **Digits:** Standard mathematical italic block does not define separate italic digits. Digits `0`-`9` remain ASCII numbers (`0`-`9`).

### C. Mathematical Bold Italic (`bold-italic`)
- Uses Unicode **Mathematical Bold Italic** block (`U+1D468` – `U+1D49B`).
- Uppercase `A`-`Z` maps to `U+1D468` – `U+1D481` (`𝑨`–`𝒁`).
- Lowercase `a`-`z` maps to `U+1D482` – `U+1D49B` (`𝒂`–`𝒛`).
- Digits `0`-`9` map to Mathematical Bold Digits `U+1D7CE` – `U+1D7D7` (`𝟎`–`𝟗`).

### D. Underline (`underline`)
- Appends **Combining Low Line** `U+0332` after every non-whitespace character.
- Example: `"Underline"` → `"U̲n̲d̲e̲r̲l̲i̲n̲e̲"`.

### E. Double Underline (`double-underline`)
- Appends **Combining Double Low Line** `U+0333` after every non-whitespace character.
- Example: `"Double Underline"` → `"D̳o̳u̳b̳l̳e̳ ̳U̳n̳d̳e̳r̳l̳i̳n̳e̳"`.
- *Note:* Every character in Double Underline must use `U+0333` rather than `U+0332`.

---

## 4. Text Normalization (`text-normalizer.js`)

When a user applies a style to text that was already formatted in another style (or re-formats text), `text-normalizer.js` decomposes all recognized Unicode mathematical characters back to standard ASCII first.

This prevents multi-level character encoding corruption (e.g. attempting to apply bold on top of italic characters directly).

---

## 5. How to Add or Modify Mappings

1. **Update `src/formatter/unicode-maps.js`:**
   Add new character ranges or exception overrides.
2. **Update `src/formatter/text-normalizer.js`:**
   Ensure any new Unicode range maps back to corresponding ASCII base characters in `text-normalizer.js`.
3. **Execute Formatter Tests:**
   Run `node tests/formatter.test.js` to verify exact character outputs.
4. **Execute QA Tests:**
   Run `node tests/quality-assurance.test.js` to ensure non-regression.
5. **Visual Verification:**
   Inspect rendered glyphs in Chrome to ensure OS fonts render the characters properly without missing glyph boxes ("tofu").

---

## 6. Accessibility & Compatibility Considerations

- **Screen Reader Impact:** Screen readers may read Unicode mathematical alphanumeric symbols character-by-character or pronounce them by Unicode code point names (e.g. "Mathematical Bold Capital A"). Keep formatting limited to short emphasis phrases.
- **Backward Compatibility:** Once formatted text is posted to LinkedIn, it exists in LinkedIn's database as standard UTF-8 Unicode codepoints. Changes to mapping logic in future extension releases will not alter previously published posts.
