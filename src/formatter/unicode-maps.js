/**
 * unicode-maps.js
 *
 * Contains explicit character mappings for bold, italic, and bold-italic Unicode styles.
 * Visual consistent Serif family is selected.
 * 
 * Exceptions:
 * - Mathematical Serif Italic lowercase 'h' is U+210E (ℎ) Planck Constant. The standard
 *   sequential slot (U+1D455) is undefined in Unicode. This is handled explicitly.
 * - Digits are not styled for Italic and Bold Italic since mathematical Unicode does not
 *   define italic serif digits. Standard ASCII digits are preserved in these styles.
 */

// standard ASCII source structures
const ASCII_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ASCII_LOWER = "abcdefghijklmnopqrstuvwxyz";
const ASCII_DIGITS = "0123456789";

// Serif Bold (Mathematical Bold)
// A-Z: U+1D400 to U+1D419
// a-z: U+1D41A to U+1D433
// 0-9: U+1D7CE to U+1D7D7
const BOLD_UPPER = "\uD835\uDC00\uD835\uDC01\uD835\uDC02\uD835\uDC03\uD835\uDC04\uD835\uDC05\uD835\uDC06\uD835\uDC07\uD835\uDC08\uD835\uDC09\uD835\uDC0A\uD835\uDC0B\uD835\uDC0C\uD835\uDC0D\uD835\uDC0E\uD835\uDC0F\uD835\uDC10\uD835\uDC11\uD835\uDC12\uD835\uDC13\uD835\uDC14\uD835\uDC15\uD835\uDC16\uD835\uDC17\uD835\uDC18\uD835\uDC19";
const BOLD_LOWER = "\uD835\uDC1A\uD835\uDC1B\uD835\uDC1C\uD835\uDC1D\uD835\uDC1E\uD835\uDC1F\uD835\uDC20\uD835\uDC21\uD835\uDC22\uD835\uDC23\uD835\uDC24\uD835\uDC25\uD835\uDC26\uD835\uDC27\uD835\uDC28\uD835\uDC29\uD835\uDC2A\uD835\uDC2B\uD835\uDC2C\uD835\uDC2D\uD835\uDC2E\uD835\uDC2F\uD835\uDC30\uD835\uDC31\uD835\uDC32\uD835\uDC33";
const BOLD_DIGITS = "\uD835\uDFCE\uD835\uDFCF\uD835\uDFD0\uD835\uDFD1\uD835\uDFD2\uD835\uDFD3\uD835\uDFD4\uD835\uDFD5\uD835\uDFD6\uD835\uDFD7";

// Serif Italic (Mathematical Italic)
// A-Z: U+1D434 to U+1D44D
// a-z: U+1D44E to U+1D467 (Except 'h', which is U+210E 'ℎ')
const ITALIC_UPPER = "\uD835\uDC34\uD835\uDC35\uD835\uDC36\uD835\uDC37\uD835\uDC38\uD835\uDC39\uD835\uDC3A\uD835\uDC3B\uD835\uDC3C\uD835\uDC3D\uD835\uDC3E\uD835\uDC3F\uD835\uDC40\uD835\uDC41\uD835\uDC42\uD835\uDC43\uD835\uDC44\uD835\uDC45\uD835\uDC46\uD835\uDC47\uD835\uDC48\uD835\uDC49\uD835\uDC4A\uD835\uDC4B\uD835\uDC4C\uD835\uDC4D";
const ITALIC_LOWER = "\uD835\uDC4E\uD835\uDC4F\uD835\uDC50\uD835\uDC51\uD835\uDC52\uD835\uDC53\uD835\uDC54\u210E\uD835\uDC56\uD835\uDC57\uD835\uDC58\uD835\uDC59\uD835\uDC5A\uD835\uDC5B\uD835\uDC5C\uD835\uDC5D\uD835\uDC5E\uD835\uDC5F\uD835\uDC60\uD835\uDC61\uD835\uDC62\uD835\uDC63\uD835\uDC64\uD835\uDC65\uD835\uDC66\uD835\uDC67";

// Serif Bold Italic (Mathematical Bold Italic)
// A-Z: U+1D468 to U+1D481
// a-z: U+1D482 to U+1D49B
const BOLD_ITALIC_UPPER = "\uD835\uDC68\uD835\uDC69\uD835\uDC6A\uD835\uDC6B\uD835\uDC6C\uD835\uDC6D\uD835\uDC6E\uD835\uDC6F\uD835\uDC70\uD835\uDC71\uD835\uDC72\uD835\uDC73\uD835\uDC74\uD835\uDC75\uD835\uDC76\uD835\uDC77\uD835\uDC78\uD835\uDC79\uD835\uDC7A\uD835\uDC7B\uD835\uDC7C\uD835\uDC7D\uD835\uDC7E\uD835\uDC7F\uD835\uDC80\uD835\uDC81";
const BOLD_ITALIC_LOWER = "\uD835\uDC82\uD835\uDC83\uD835\uDC84\uD835\uDC85\uD835\uDC86\uD835\uDC87\uD835\uDC88\uD835\uDC89\uD835\uDC8A\uD835\uDC8B\uD835\uDC8C\uD835\uDC8D\uD835\uDC8E\uD835\uDC8F\uD835\uDC90\uD835\uDC91\uD835\uDC92\uD835\uDC93\uD835\uDC94\uD835\uDC95\uD835\uDC96\uD835\uDC97\uD835\uDC98\uD835\uDC99\uD835\uDC9A\uD835\uDC9B";

// Convert strings to arrays to safely handle surrogate pairs
const asciiUpperArr = Array.from(ASCII_UPPER);
const asciiLowerArr = Array.from(ASCII_LOWER);
const asciiDigitsArr = Array.from(ASCII_DIGITS);

const boldUpperArr = Array.from(BOLD_UPPER);
const boldLowerArr = Array.from(BOLD_LOWER);
const boldDigitsArr = Array.from(BOLD_DIGITS);

const italicUpperArr = Array.from(ITALIC_UPPER);
const italicLowerArr = Array.from(ITALIC_LOWER);

const boldItalicUpperArr = Array.from(BOLD_ITALIC_UPPER);
const boldItalicLowerArr = Array.from(BOLD_ITALIC_LOWER);

// Build translation maps
const FORWARD_MAPS = {
  bold: new Map(),
  italic: new Map(),
  'bold-italic': new Map()
};

const REVERSE_MAP = new Map();

function registerMapping(style, asciiArr, unicodeArr) {
  for (let i = 0; i < asciiArr.length; i++) {
    const ascii = asciiArr[i];
    const unicode = unicodeArr[i];
    FORWARD_MAPS[style].set(ascii, unicode);
    REVERSE_MAP.set(unicode, ascii);
  }
}

// Populate forward and reverse maps
registerMapping('bold', asciiUpperArr, boldUpperArr);
registerMapping('bold', asciiLowerArr, boldLowerArr);
registerMapping('bold', asciiDigitsArr, boldDigitsArr);

registerMapping('italic', asciiUpperArr, italicUpperArr);
registerMapping('italic', asciiLowerArr, italicLowerArr);

registerMapping('bold-italic', asciiUpperArr, boldItalicUpperArr);
registerMapping('bold-italic', asciiLowerArr, boldItalicLowerArr);

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    FORWARD_MAPS,
    REVERSE_MAP,
    ASCII_UPPER,
    ASCII_LOWER,
    ASCII_DIGITS
  };
}
