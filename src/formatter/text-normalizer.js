/**
 * text-normalizer.js
 *
 * Normalizes Unicode styled characters back into standard ASCII text.
 * Handles bold, italic, bold-italic, single underline, and double underline.
 */

let unicodeMaps;
if (typeof require !== 'undefined') {
  unicodeMaps = require('./unicode-maps');
} else if (typeof REVERSE_MAP !== 'undefined') {
  unicodeMaps = { REVERSE_MAP };
}

/**
 * Normalizes a string containing supported Unicode formatted text back to standard ASCII.
 *
 * @param {string} input - The input string to normalize.
 * @returns {string} The normalized ASCII string.
 */
function normalizeText(input) {
  if (input === null || input === undefined) {
    return "";
  }
  if (typeof input !== 'string') {
    return String(input);
  }

  const reverseMap = (unicodeMaps && unicodeMaps.REVERSE_MAP) || new Map();
  let result = "";

  for (const char of input) {
    // Remove Single Underline (U+0332) and Double Underline (U+0333) combining marks
    if (char === '\u0332' || char === '\u0333') {
      continue;
    }

    // Convert styled bold/italic/bold-italic character back to standard ASCII
    if (reverseMap.has(char)) {
      result += reverseMap.get(char);
    } else {
      result += char;
    }
  }

  return result;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { normalizeText };
}
