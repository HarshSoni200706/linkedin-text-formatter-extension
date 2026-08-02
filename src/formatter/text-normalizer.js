/**
 * text-normalizer.js
 *
 * Normalizes Unicode styled characters back into standard ASCII text.
 * Handles bold, italic, bold-italic, single underline, and double underline.
 */

(function() {
  let unicodeMaps;
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require === 'function') {
    try {
      unicodeMaps = require('./unicode-maps');
    } catch (e) {
      // Fallback in case require fails in browser
    }
  }

  function getReverseMap() {
    if (unicodeMaps && unicodeMaps.REVERSE_MAP) {
      return unicodeMaps.REVERSE_MAP;
    }
    if (typeof window !== 'undefined' && window.LinkedInTextFormatter && window.LinkedInTextFormatter.REVERSE_MAP) {
      return window.LinkedInTextFormatter.REVERSE_MAP;
    }
    if (typeof REVERSE_MAP !== 'undefined') {
      return REVERSE_MAP;
    }
    return new Map();
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

    const reverseMap = getReverseMap();
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

  // Expose on global namespace in browser environments
  if (typeof window !== 'undefined') {
    window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};
    window.LinkedInTextFormatter.normalizeText = normalizeText;
  }

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { normalizeText };
  }
})();
