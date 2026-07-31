# Formatter Test Cases & Verification Suite

This document lists all 26 test cases implemented in the automated test suite, detailing their inputs, selected styles, expected results, purpose, and visual confirmation examples.

---

## Automated Test Cases

| # | Test Name / Purpose | Input | Style | Expected Output | Notes / Edge Cases |
|---|---|---|---|---|---|
| 1 | Null input formatted | `null` | `bold` | `""` | Safe fallback for empty selections or errors |
| 2 | Null input normalized | `null` | N/A | `""` | Safe fallback |
| 3 | Undefined input formatted | `undefined` | `bold` | `""` | Safe fallback |
| 4 | Undefined input normalized | `undefined` | N/A | `""` | Safe fallback |
| 5 | Non-string formatted (bold) | `12345` (number) | `bold` | `𝟏𝟐𝟑𝟒𝟓` | Converts non-string input safely |
| 6 | Non-string formatted (italic) | `12345` (number) | `italic` | `12345` | Italic style does not define digits; preserves ASCII digits |
| 7 | Empty string formatted | `""` | `bold` | `""` | Edge case handling |
| 8 | Lowercase word (bold) | `"hello"` | `bold` | `𝐡𝐞𝐥𝐥𝐨` | Basic standard mapping |
| 9 | Lowercase word (italic) | `"hello"` | `italic` | `ℎ𝑒𝑙𝑙𝑜` | Verifies `h` exception mapping (U+210E `ℎ` Planck Constant) |
| 10 | Lowercase word (bold-italic)| `"hello"` | `bold-italic` | `𝒉𝒆𝒍𝒍𝒐` | Basic bold-italic serif mapping |
| 11 | Lowercase word (underline) | `"hello"` | `underline` | `h̲e̲l̲l̲o̲` | Combines each character with U+0332 combining low line |
| 12 | Lowercase word (double-ul)| `"hello"` | `double-underline` | `h̳e̳l̳l̳o̳` | Combines each character with U+0333 combining double low line |
| 13 | Uppercase word (bold) | `"WORLD"` | `bold` | `𝐖𝐎𝐑𝐋𝐃` | Upper case bold mapping |
| 14 | Uppercase word (italic) | `"WORLD"` | `italic` | `𝑊𝑂𝑅𝐿𝐷` | Upper case italic mapping |
| 15 | Uppercase word (bold-italic)| `"WORLD"` | `bold-italic` | `𝑾𝑶𝑹𝑳𝑫` | Upper case bold-italic mapping |
| 16 | Mixed-case sentence bold | `"Hello World"` | `bold` | `𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝` | Mixed-case mapping with spaces preserved |
| 17 | Numbers bold | `"12345"` | `bold` | `𝟏𝟐𝟑𝟒𝟓` | Verifies digit mappings for bold |
| 18 | Numbers italic | `"12345"` | `italic` | `12345` | Preserves standard digits |
| 19 | Punctuation bold | `"hello!"` | `bold` | `𝐡𝐞𝐥𝐥𝐨!` | Punctuation character is not mapped, preserved as-is |
| 20 | Emojis bold | `"hello 👋 world"` | `bold` | `𝐡𝐞𝐥𝐥𝐨 👋 𝐰𝐨𝐫𝐥𝐝` | Emojis preserved intact, does not corrupt surrogate pair |
| 21 | Emojis underline | `"hello 👋 world"` | `underline` | `h̲e̲l̲l̲o̲ ̲👋 ̲w̲o̲r̲l̲d̲` | Emojis and trailing spaces are not underlined to prevent glitches |
| 22 | Hashtags bold | `"#cool"` | `bold` | `#𝐜𝐨𝐨𝐥` | `#` preserved, text formatted |
| 23 | Mentions bold | `"@user"` | `bold` | `@𝐮𝐬𝐞𝐫` | `@` preserved, text formatted |
| 24 | URLs bold | `"https://google.com"`| `bold` | `𝐡𝐭𝐭𝐩𝐬://𝐠𝐨𝐨𝐠𝐥𝐞.𝐜𝐨𝐦` | Punctuation (`:`, `/`, `.`) preserved, characters formatted |
| 25 | Multiline underline | `"Line 1\nLine 2"` | `underline` | `L̲i̲n̲e̲ ̲1̲\nL̲i̲n̲e̲ ̲2̲` | Newline character is NOT underlined |
| 26 | Unsupported char bold | `"Hello 国"` | `bold` | `𝐇𝐞𝐥𝐥𝐨 国` | Non-Latin character (Chinese) preserved as-is |
| 27 | Accented Latin bold | `"café"` | `bold` | `𝐜𝐚𝐟é` | Accented characters (e.g. `é`) preserved, standard characters bolded |
| 28 | Indian-language bold | `"नमस्ते"` | `bold` | `नमस्ते` | Hindi Devnagari characters preserved as-is |
| 29 | Idempotency bold | `"𝐡𝐞𝐥𝐥𝐨"` | `bold` | `𝐡𝐞𝐥𝐥𝐨` | Re-applying bold to bold yields same result |
| 30 | Idempotency italic | `"ℎ𝑒𝑙𝑙𝑜"` | `italic` | `ℎ𝑒𝑙𝑙𝑜` | Re-applying italic to italic yields same result |
| 31 | Idempotency bold-italic | `"𝒉𝒆𝒍𝒍𝒐"` | `bold-italic` | `𝒉𝒆𝒍𝒍𝒐` | Re-applying bold-italic yields same result |
| 32 | Idempotency underline | `"h̲e̲l̲l̲o̲"` | `underline` | `h̲e̲l̲l̲o̲` | Re-applying underline yields same result |
| 33 | Idempotency double-ul | `"h̳e̳l̳l̳o̳"` | `double-underline` | `h̳e̳l̳l̳o̳` | Re-applying double underline yields same result |
| 34 | Switching styles (bold -> italic)| `"𝐡𝐞𝐥𝐥𝐨"` | `italic` | `ℎ𝑒𝑙𝑙𝑜` | Normalizes bold to ASCII first, then applies italic |
| 35 | Switching styles (ul -> double-ul)| `"h̲e̲l̲l̲o̲"` | `double-underline` | `h̳e̳l̳l̳o̳` | Normalizes single underline to ASCII first, then applies double underline |
| 36 | Invalid style identifier | `"𝐡𝐞𝐥𝐥𝐨"` | `"invalid"` | `"hello"` | Normalizes text and falls back safely |

---

## Space-Handling Policy for Underline Styles
- Spaces (`U+0020`) receive combining underline marks so that the line remains continuous.
- Whitespace characters like tabs (`\t`) or newlines (`\n`, `\r`) do NOT receive underline marks to prevent rendering bugs in browsers and LinkedIn's editor.

---

## Visual Verification Cases for LinkedIn Copy-and-Paste

To verify that the generated Unicode text renders correctly on LinkedIn:

1. Copy the expected outputs from the table above (e.g., `𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝` or `h̲e̲l̲l̲o̲`).
2. Open [LinkedIn](https://www.linkedin.com/) in your browser.
3. Open the **Start a post** editor modal.
4. Paste the formatted text into the text area.
5. Confirm:
   - The text displays with correct serif bold, italic, bold-italic, single underline, or double underline styles.
   - Punctuation, emojis, and spaces render correctly.
   - The "Post" button is enabled, confirming LinkedIn accepts and indexes this Unicode text correctly.
