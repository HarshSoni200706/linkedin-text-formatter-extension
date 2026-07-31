/**
 * formatter.test.js
 *
 * Isolated, zero-dependency test suite for validating text formatting and normalization.
 * Supports execution in both Node.js and browser contexts.
 */

// Environment check & imports
let testFormatter;
let testNormalizer;

if (typeof require !== 'undefined') {
  testFormatter = require('../src/formatter/text-formatter');
  testNormalizer = require('../src/formatter/text-normalizer');
} else {
  // Browser fallback
  if (typeof formatText !== 'undefined') {
    testFormatter = { formatText };
  }
  if (typeof normalizeText !== 'undefined') {
    testNormalizer = { normalizeText };
  }
}

/**
 * Executes the formatting test suite.
 * @returns {Object} Test results object with pass/fail counts and details.
 */
function runTests() {
  const format = (testFormatter && testFormatter.formatText) || ((t, s) => t);
  const normalize = (testNormalizer && testNormalizer.normalizeText) || ((t) => t);

  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(name, actual, expected) {
    const isPass = actual === expected;
    if (isPass) {
      passed++;
      results.push({ name, status: 'PASS', actual, expected });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', actual, expected });
    }
  }

  // 1. Null input
  assert("Null input formatted", format(null, "bold"), "");
  assert("Null input normalized", normalize(null), "");

  // 2. Undefined input
  assert("Undefined input formatted", format(undefined, "bold"), "");
  assert("Undefined input normalized", normalize(undefined), "");

  // 3. Non-string input (number)
  assert("Non-string input formatted (bold digits)", format(12345, "bold"), "𝟏𝟐𝟑𝟒𝟓");
  assert("Non-string input formatted (italic preserves digits)", format(12345, "italic"), "12345");

  // 4. Empty string
  assert("Empty string", format("", "bold"), "");

  // 5. Single lowercase word
  assert("Single lowercase word bold", format("hello", "bold"), "𝐡𝐞𝐥𝐥𝐨");
  assert("Single lowercase word italic (with h exception)", format("hello", "italic"), "ℎ𝑒𝑙𝑙𝑜");
  assert("Single lowercase word bold-italic", format("hello", "bold-italic"), "𝒉𝒆𝒍𝒍𝒐");
  assert("Single lowercase word underline", format("hello", "underline"), "h̲e̲l̲l̲o̲");
  assert("Single lowercase word double-underline", format("hello", "double-underline"), "h̳e̳l̳l̳o̳");

  // 6. Single uppercase word
  assert("Single uppercase word bold", format("WORLD", "bold"), "𝐖𝐎𝐑𝐋𝐃");
  assert("Single uppercase word italic", format("WORLD", "italic"), "𝑊𝑂𝑅𝐿𝐷");
  assert("Single uppercase word bold-italic", format("WORLD", "bold-italic"), "𝑾𝑶𝑹𝑳𝑫");

  // 7. Mixed-case sentence
  assert("Mixed-case sentence bold", format("Hello World", "bold"), "𝐇𝐞𝐥𝐥𝐨 𝐖𝐨𝐫𝐥𝐝");

  // 8. Numbers
  assert("Numbers bold", format("12345", "bold"), "𝟏𝟐𝟑𝟒𝟓");
  assert("Numbers italic (preserves digits)", format("12345", "italic"), "12345");

  // 9. Punctuation
  assert("Punctuation bold", format("hello!", "bold"), "𝐡𝐞𝐥𝐥𝐨!");

  // 10. Emojis
  assert("Emojis bold (preserves emoji)", format("hello 👋 world", "bold"), "𝐡𝐞𝐥𝐥𝐨 👋 𝐰𝐨𝐫𝐥𝐝");
  assert("Emojis underline (does not underline emoji)", format("hello 👋 world", "underline"), "h̲e̲l̲l̲o̲ ̲👋 ̲w̲o̲r̲l̲d̲");

  // 11. Hashtags
  assert("Hashtags bold (preserves #)", format("#cool", "bold"), "#𝐜𝐨𝐨𝐥");

  // 12. Mentions
  assert("Mentions bold (preserves @)", format("@user", "bold"), "@𝐮𝐬𝐞𝐫");

  // 13. URLs
  assert("URLs bold (preserves punctuation)", format("https://google.com", "bold"), "𝐡𝐭𝐭𝐩𝐬://𝐠𝐨𝐨𝐠𝐥𝐞.𝐜𝐨𝐦");

  // 14. Multiline text
  assert("Multiline text underline (does not underline newlines)", format("Line 1\nLine 2", "underline"), "L̲i̲n̲e̲ ̲1̲\nL̲i̲n̲e̲ ̲2̲");

  // 15. Unsupported characters (Non-Latin alphabet Chinese characters)
  assert("Unsupported characters bold", format("Hello 国", "bold"), "𝐇𝐞𝐥𝐥𝐨 国");

  // 16. Accented Latin characters
  assert("Accented Latin characters bold (preserves accented)", format("café", "bold"), "𝐜𝐚𝐟é");

  // 17. Indian-language characters (Hindi)
  assert("Indian-language characters bold (preserves Devnagari)", format("नमस्ते", "bold"), "नमस्ते");

  // 18. Already bold text
  assert("Already bold text to bold (idempotent)", format("𝐡𝐞𝐥𝐥𝐨", "bold"), "𝐡𝐞𝐥𝐥𝐨");

  // 19. Already italic text to italic (idempotent)
  assert("Already italic text to italic (idempotent)", format("ℎ𝑒𝑙𝑙𝑜", "italic"), "ℎ𝑒𝑙𝑙𝑜");

  // 20. Already bold-italic text to bold-italic (idempotent)
  assert("Already bold-italic text to bold-italic (idempotent)", format("𝒉𝒆𝒍𝒍𝒐", "bold-italic"), "𝒉𝒆𝒍𝒍𝒐");

  // 21. Already underlined text to underline (idempotent)
  assert("Already underlined text to underline (idempotent)", format("h̲e̲l̲l̲o̲", "underline"), "h̲e̲l̲l̲o̲");

  // 22. Already double-underlined text to double-underline (idempotent)
  assert("Already double-underlined text to double-underline (idempotent)", format("h̳e̳l̳l̳o̳", "double-underline"), "h̳e̳l̳l̳o̳");

  // 23. Switching from bold to italic
  assert("Switching from bold to italic", format("𝐡𝐞𝐥𝐥𝐨", "italic"), "ℎ𝑒𝑙𝑙𝑜");
  assert("Switching from italic to bold", format("ℎ𝑒𝑙𝑙𝑜", "bold"), "𝐡𝐞𝐥𝐥𝐨");

  // 24. Switching from underline to double underline
  assert("Switching from underline to double underline", format("h̲e̲l̲l̲o̲", "double-underline"), "h̳e̳l̳l̳o̳");
  assert("Switching from double underline to underline", format("h̳e̳l̳l̳o̳", "underline"), "h̲e̲l̲l̲o̲");

  // 25. Reapplying same style
  assert("Reapplying underline style to underlined", format("h̲e̲l̲l̲o̲", "underline"), "h̲e̲l̲l̲o̲");

  // 26. Invalid style identifier (returns normalized text)
  assert("Invalid style identifier", format("𝐡𝐞𝐥𝐥𝐨", "invalid-style"), "hello");

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runTests();
  console.log(`========================================`);
  console.log(`Formatter Test Suite Results:`);
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
