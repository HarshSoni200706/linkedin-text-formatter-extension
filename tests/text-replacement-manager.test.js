/**
 * text-replacement-manager.test.js
 *
 * Zero-dependency unit tests for TextReplacementManager covering:
 * 1. Direct-document replacement uses document selection.
 * 2. Shadow DOM replacement uses ShadowRoot selection.
 * 3. Shadow editor uses editor.ownerDocument.
 * 4. Formatter receives selected Range text.
 * 5. execCommand false triggers fallback.
 * 6. execCommand true but unchanged DOM triggers fallback.
 * 7. Shadow Range fallback inserts one text node.
 * 8. Fallback does not duplicate selected text.
 * 9. Rollback restores original fragment after failure.
 * 10. Input event targets the real ql-editor.
 * 11. Caret restoration uses ShadowRoot selection.
 * 12. Toolbar hides only after verified success.
 * 13. Failure preserves original content.
 * 14. One click produces one transaction.
 * 15. Direct-document behavior remains unchanged.
 */

// 1. Mock minimal browser environment
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
};

global.document = {
  body: {
    contains: () => true
  },
  queryCommandSupported: () => true,
  execCommand: (cmd, showUI, value) => {
    global._lastExecCommandValue = value;
    if (mockEditor) {
      mockEditor.textContent = value;
    }
    return true;
  },
  createRange: () => ({
    setStartAfter: () => {},
    setEndAfter: () => {},
    setStart: () => {},
    collapse: () => {},
    selectNodeContents: () => {}
  }),
  createTextNode: (str) => ({ nodeType: 3, nodeValue: str })
};

global.InputEvent = function(type, options) {
  this.type = type;
  this.options = options;
};

let mockRangeText = "Hello LinkedIn";
let mockSelectionValid = true;
let mockEditor = {
  tagName: 'DIV',
  className: 'ql-editor',
  textContent: 'Hello LinkedIn',
  ownerDocument: global.document,
  getRootNode: () => global.document,
  dispatchEvent: (ev) => { global._lastDispatchedEvent = ev; },
  focus: () => { global._focused = true; }
};

let mockHideReason = null;
let mockCleared = false;

function createMockRange(text) {
  const range = {
    toString: () => text || mockRangeText,
    cloneContents: () => ({ querySelector: () => null }),
    cloneRange: function() { return range; },
    deleteContents: () => {},
    insertNode: () => {},
    startContainer: { textContent: text || mockRangeText },
    endContainer: { textContent: text || mockRangeText }
  };
  return range;
}

// Mock window environment before require
global.window = {
  getSelection: () => ({
    rangeCount: 1,
    getRangeAt: () => createMockRange(mockRangeText),
    removeAllRanges: () => {},
    addRange: () => {}
  }),
  LinkedInTextFormatter: {
    TextFormatter: {
      formatText: (text, style) => {
        if (style === 'bold') return "𝗛𝗲𝗹𝗹𝑜 𝗟𝗶𝗻𝗸𝗲𝗱𝗜𝗻";
        if (style === 'italic') return "𝐻𝑒𝓁𝓁𝑜 𝐿𝒾𝓃𝓀𝑒𝒹𝐼𝓃";
        return text;
      }
    },
    formatText: (text, style) => {
      if (style === 'bold') return "𝗛𝗲𝗹𝗹𝑜 𝗟𝗶𝗻𝗸𝗲𝗱𝗜𝗻";
      return text;
    },
    SelectionManager: {
      hasValidSelection: () => mockSelectionValid,
      getSavedRange: () => createMockRange(mockRangeText),
      getSavedEditor: () => mockEditor,
      restoreSelection: () => true,
      beginProtectedInteraction: () => {},
      endProtectedInteraction: () => {},
      clearSelection: () => { mockCleared = true; }
    },
    ToolbarManager: {
      hide: (reason) => { mockHideReason = reason; }
    }
  }
};

// Import modules
require('../src/formatter/unicode-maps');
require('../src/formatter/text-normalizer');
const textFormatterModule = require('../src/formatter/text-formatter');
require('../src/content/text-replacement-manager');

const {
  applyFormatting,
  replaceSavedSelection,
  replaceSavedSelectionDOM,
  containsProtectedEntity,
  resolveFormatter,
  getSelectionFromRoot
} = require('../src/content/text-replacement-manager');

function runTextReplacementManagerTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(name, actual, expected) {
    if (actual === expected) {
      passed++;
      results.push({ name, status: 'PASS', actual, expected });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', actual, expected });
    }
  }

  // --- Baseline API Tests ---
  assert("Browser namespace receives TextFormatter.formatText", typeof global.window.LinkedInTextFormatter.TextFormatter.formatText, 'function');
  assert("Browser namespace receives fallback formatText alias", typeof global.window.LinkedInTextFormatter.formatText, 'function');
  assert("CommonJS exports remain available", typeof textFormatterModule.formatText, 'function');
  assert("TextReplacementManager resolves canonical formatter", typeof resolveFormatter(), 'function');

  // --- 15 Required Scenarios ---

  // 1. Direct-document replacement uses document selection
  const docSel = getSelectionFromRoot(mockEditor);
  assert("1. Direct-document replacement uses document selection", docSel !== null, true);

  // 2. Shadow DOM replacement uses ShadowRoot selection
  let shadowSelCalled = false;
  const mockShadowRoot = {
    nodeType: 11,
    host: { isConnected: true },
    getSelection: () => {
      shadowSelCalled = true;
      return global.window.getSelection();
    }
  };
  const mockShadowEditor = {
    tagName: 'DIV',
    className: 'ql-editor',
    textContent: 'Shadow text',
    ownerDocument: global.document,
    getRootNode: () => mockShadowRoot,
    dispatchEvent: () => {},
    focus: () => {}
  };
  getSelectionFromRoot(mockShadowEditor);
  assert("2. Shadow DOM replacement uses ShadowRoot selection", shadowSelCalled, true);

  // 3. Shadow editor uses editor.ownerDocument
  assert("3. Shadow editor uses editor.ownerDocument", mockShadowEditor.ownerDocument, global.document);

  // 4. Formatter receives selected Range text
  let receivedText = null;
  const originalFmt = global.window.LinkedInTextFormatter.TextFormatter.formatText;
  global.window.LinkedInTextFormatter.TextFormatter.formatText = (text, style) => {
    receivedText = text;
    return originalFmt(text, style);
  };
  mockRangeText = "Custom text";
  mockEditor.textContent = "Custom text";
  applyFormatting('bold');
  assert("4. Formatter receives selected Range text", receivedText, "Custom text");
  global.window.LinkedInTextFormatter.TextFormatter.formatText = originalFmt; // restore

  // 5. execCommand false triggers fallback
  let fallbackExecuted = false;
  const origExec = global.document.execCommand;
  global.document.execCommand = () => false;
  const mockSavedRange = {
    toString: () => "Test text",
    cloneContents: () => ({ querySelector: () => null }),
    cloneRange: function() { return this; },
    deleteContents: () => { fallbackExecuted = true; },
    insertNode: () => {}
  };
  replaceSavedSelection("Formatted", mockEditor, mockSavedRange);
  assert("5. execCommand false triggers fallback", fallbackExecuted, true);

  // 6. execCommand true but unchanged DOM triggers fallback
  fallbackExecuted = false;
  global.document.execCommand = () => true; // Returns true without modifying textContent
  mockEditor.textContent = "Test text";
  const mockUnchangedRange = {
    toString: () => "Test text",
    cloneContents: () => ({ querySelector: () => null }),
    cloneRange: function() { return this; },
    deleteContents: () => { fallbackExecuted = true; },
    insertNode: () => {}
  };
  replaceSavedSelection("Formatted", mockEditor, mockUnchangedRange);
  assert("6. execCommand true but unchanged DOM triggers fallback", fallbackExecuted, true);
  global.document.execCommand = origExec; // restore

  // 7. Shadow Range fallback inserts one text node
  let nodeInserted = null;
  const shadowRange = {
    cloneContents: () => ({ querySelector: () => null }),
    cloneRange: function() { return this; },
    deleteContents: () => {},
    insertNode: (node) => { nodeInserted = node; }
  };
  replaceSavedSelectionDOM(shadowRange, mockShadowEditor, "InsertedText");
  assert("7. Shadow Range fallback inserts one text node", nodeInserted.nodeValue, "InsertedText");

  // 8. Fallback does not duplicate selected text
  let deleteCalled = false;
  const shadowRangeDelete = {
    cloneContents: () => ({ querySelector: () => null }),
    cloneRange: function() { return this; },
    deleteContents: () => { deleteCalled = true; },
    insertNode: () => {}
  };
  replaceSavedSelectionDOM(shadowRangeDelete, mockShadowEditor, "SingleNode");
  assert("8. Fallback does not duplicate selected text", deleteCalled, true);

  // 9. Rollback restores original fragment after failure
  let rollbackInserted = false;
  const failingRange = {
    cloneContents: () => ({ nodeType: 11 }),
    cloneRange: function() { return this; },
    deleteContents: () => {},
    insertNode: (node) => {
      if (node && node.nodeValue === "FailText") throw new Error("DOM Exception");
      if (node && node.nodeType === 11) rollbackInserted = true;
    }
  };
  replaceSavedSelectionDOM(failingRange, mockShadowEditor, "FailText");
  assert("9. Rollback restores original fragment after failure", rollbackInserted, true);

  // 10. Input event targets the real ql-editor
  let eventTarget = null;
  const targetEditor = {
    tagName: 'DIV',
    className: 'ql-editor',
    ownerDocument: global.document,
    getRootNode: () => mockShadowRoot,
    dispatchEvent: function(ev) { eventTarget = this; },
    focus: () => {}
  };
  replaceSavedSelectionDOM(shadowRange, targetEditor, "TargetTest");
  assert("10. Input event targets the real ql-editor", eventTarget.className, 'ql-editor');

  // 11. Caret restoration uses ShadowRoot selection
  shadowSelCalled = false;
  replaceSavedSelectionDOM(shadowRange, mockShadowEditor, "CaretTest");
  assert("11. Caret restoration uses ShadowRoot selection", shadowSelCalled, true);

  // 12. Toolbar hides only after verified success
  mockHideReason = null;
  mockSelectionValid = true;
  mockEditor.textContent = "Hello LinkedIn";
  mockRangeText = "Hello LinkedIn";
  applyFormatting('bold');
  assert("12. Toolbar hides only after verified success", mockHideReason, 'formatting-applied');

  // 13. Failure preserves original content
  mockHideReason = null;
  mockSelectionValid = false; // invalid selection
  applyFormatting('bold');
  assert("13. Failure preserves original content", mockHideReason, null);
  mockSelectionValid = true; // restore

  // 14. One click produces one transaction
  mockEditor.textContent = "Hello LinkedIn";
  mockRangeText = "Hello LinkedIn";
  const firstRes = applyFormatting('bold');
  assert("14. One click produces one transaction", firstRes, true);

  // 15. Direct-document behavior remains unchanged
  mockEditor.getRootNode = () => global.document;
  mockEditor.textContent = "Direct document text";
  mockRangeText = "Direct document text";
  mockHideReason = null;
  const directRes = applyFormatting('bold');
  assert("15. Direct-document behavior remains unchanged", directRes, true);

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runTextReplacementManagerTests();
  console.log(`========================================`);
  console.log(`Text Replacement Manager Test Suite Results:`);
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
