/**
 * constants.js
 *
 * Shared project constants, including action names, formatting style keys, and DOM selectors.
 */

const FORMAT_STYLES = {
  BOLD: 'bold',
  ITALIC: 'italic',
  BOLD_ITALIC: 'bold-italic',
  UNDERLINE: 'underline',
  DOUBLE_UNDERLINE: 'double-underline'
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { FORMAT_STYLES };
}
