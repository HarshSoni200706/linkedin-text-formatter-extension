/**
 * text-formatter.js
 *
 * Core text conversion module.
 * Converts standard input text into styled Unicode formats (bold, italic, bold-italic, underline, double-underline).
 * Safely normalizes text first to prevent double-formatting or corruption.
 */

let unicodeMaps;
let textNormalizer;
let sharedConstants;

if (typeof require !== 'undefined') {
  unicodeMaps = require('./unicode-maps');
  textNormalizer = require('./text-normalizer');
  sharedConstants = require('../shared/constants');
} else {
  // Browser global fallback
  if (typeof FORWARD_MAPS !== 'undefined') {
    unicodeMaps = { FORWARD_MAPS };
  }
  if (typeof normalizeText !== 'undefined') {
    textNormalizer = { normalizeText };
  }
  if (typeof FORMAT_STYLES !== 'undefined') {
    sharedConstants = { FORMAT_STYLES };
  }
}

const styles = (sharedConstants && sharedConstants.FORMAT_STYLES) || {
  BOLD: 'bold',
  ITALIC: 'italic',
  BOLD_ITALIC: 'bold-italic',
  UNDERLINE: 'underline',
  DOUBLE_UNDERLINE: 'double-underline'
};

/**
 * Checks if a character is a standard emoji or symbols that should not be underlined.
 *
 * @param {string} char - Single character.
 * @returns {boolean} True if the character is an emoji.
 */
function isEmoji(char) {
  if (!char) return false;
  const cp = char.codePointAt(0);
  return (
    (cp >= 0x1F300 && cp <= 0x1F9FF) || // Symbols & Pictographs
    (cp >= 0x1F600 && cp <= 0x1F64F) || // Emoticons
    (cp >= 0x1F680 && cp <= 0x1F6FF) || // Transport & Map Symbols
    (cp >= 0x2600 && cp <= 0x27BF) ||   // Miscellaneous Symbols & Dingbats
    (cp >= 0x1F1E6 && cp <= 0x1F1FF) || // Flags
    (cp >= 0x1F900 && cp <= 0x1F9FF) || // Supplemental Symbols
    (cp >= 0x1FA70 && cp <= 0x1FAFF)    // Symbols and Pictographs Extended-A
  );
}

/**
 * Formats the given input text into the requested style.
 *
 * @param {string} input - The input text to format.
 * @param {string} style - The style identifier ('bold', 'italic', 'bold-italic', 'underline', 'double-underline').
 * @returns {string} The formatted Unicode string.
 */
function formatText(input, style) {
  // Handle null or undefined safely
  if (input === null || input === undefined) {
    return "";
  }

  // Handle non-string input safely
  if (typeof input !== 'string') {
    input = String(input);
  }

  // Handle empty string
  if (input === "") {
    return "";
  }

  const normalizeFn = (textNormalizer && textNormalizer.normalizeText) || ((t) => t);
  const forwardMaps = (unicodeMaps && unicodeMaps.FORWARD_MAPS) || {};

  // Always normalize first to ensure idempotency and prevent stacked formatting
  const normalized = normalizeFn(input);

  // Return unchanged normalized text for unsupported style identifiers
  if (
    style !== styles.BOLD &&
    style !== styles.ITALIC &&
    style !== styles.BOLD_ITALIC &&
    style !== styles.UNDERLINE &&
    style !== styles.DOUBLE_UNDERLINE
  ) {
    return normalized;
  }

  // Handle underline styles
  if (style === styles.UNDERLINE || style === styles.DOUBLE_UNDERLINE) {
    const mark = style === styles.UNDERLINE ? '\u0332' : '\u0333';
    let result = "";

    for (const char of normalized) {
      // Do not apply underline mark to newline or carriage return characters
      if (char === '\n' || char === '\r') {
        result += char;
        continue;
      }

      // Do not apply underline mark to emojis
      if (isEmoji(char)) {
        result += char;
        continue;
      }

      // Apply one combining low-line or double-low-line mark to eligible characters
      // (Spaces U+0020 are underlined to preserve visual continuity)
      result += char + mark;
    }

    return result;
  }

  // Handle alphabet mapping styles (bold, italic, bold-italic)
  const forwardMap = forwardMaps[style];
  let result = "";

  for (const char of normalized) {
    if (forwardMap && forwardMap.has(char)) {
      result += forwardMap.get(char);
    } else {
      result += char;
    }
  }

  return result;
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { formatText };
}
