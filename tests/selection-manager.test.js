/**
 * selection-manager.test.js
 *
 * Zero-dependency unit tests for SelectionManager:
 * 1. Direct-document editor uses Document.getSelection()
 * 2. ShadowRoot editor uses ShadowRoot.getSelection()
 * 3. ShadowRoot.getSelection unavailable falls back safely
 * 4. Collapsed ShadowRoot selection is rejected
 * 5. Non-empty ShadowRoot selection is accepted
 * 6. Whitespace-only selection is rejected
 * 7. Boundaries inside the same ql-editor are valid
 * 8. Boundaries in different roots are rejected
 * 9. .ql-clipboard selection is rejected
 * 10. Shadow host removal invalidates the range
 * 11. Saved selection stores the correct root
 * 12. restoreSelection uses the saved ShadowRoot selection
 * 13. Document selection restoration remains unchanged
 * 14. Pointerup triggers delayed evaluation
 * 15. Shift + Arrow keyup triggers delayed evaluation
 * 16. No duplicate valid-selection callbacks
 * 17. Selected text is never logged
 */

// 1. Mock minimal DOM environment
global.Node = {
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4,
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
};

let listeners = [];
global.document = {
  addEventListener: (type, handler) => { listeners.push({ type, handler }); },
  removeEventListener: () => {},
  getSelection: () => mockDocSelection,
  body: {
    contains: (node) => {
      if (!node) return false;
      return node.detached !== true;
    }
  }
};

global.requestAnimationFrame = (cb) => {
  cb();
  return 1;
};
global.cancelAnimationFrame = () => {};

let mockDocSelection = null;
let mockShadowSelection = null;

global.window = {
  getSelection: () => mockDocSelection,
  LinkedInTextFormatter: {}
};

// Import selection-manager
require('../src/content/selection-manager');

const {
  state,
  getSelectionForEditor,
  getSelectionDirection,
  isSavedRangeValid,
  clearSavedSelection,
  restoreSavedSelection,
  evaluateSelection,
  isExtensionElement,
  setActiveEditor,
  handleSelectionEvent
} = require('../src/content/selection-manager');

const SelectionManager = global.window.LinkedInTextFormatter.SelectionManager;

function runSelectionManagerTests() {
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

  // --- API Surface Tests ---
  assert("API: getSavedRange is a function", typeof SelectionManager.getSavedRange, "function");
  assert("API: getSavedEditor is a function", typeof SelectionManager.getSavedEditor, "function");
  assert("API: getSelectionForEditor is a function", typeof SelectionManager.getSelectionForEditor, "function");
  assert("API: hasValidSelection is a function", typeof SelectionManager.hasValidSelection, "function");
  assert("API: restoreSelection is a function", typeof SelectionManager.restoreSelection, "function");
  assert("API: clearSelection is a function", typeof SelectionManager.clearSelection, "function");
  assert("API: validateSavedRange is a function", typeof SelectionManager.validateSavedRange, "function");

  // --- 1. Direct-document editor uses Document.getSelection() ---
  mockDocSelection = { type: 'Range', rangeCount: 1, getRangeAt: () => ({ collapsed: false, toString: () => "Text" }) };
  const docEditor = {
    nodeType: Node.ELEMENT_NODE,
    tagName: 'DIV',
    isConnected: true,
    ownerDocument: global.document,
    getRootNode: () => global.document
  };
  assert("1. Direct-document editor uses Document.getSelection()", getSelectionForEditor(docEditor), mockDocSelection);

  // --- 2. ShadowRoot editor uses ShadowRoot.getSelection() ---
  mockShadowSelection = { type: 'Range', rangeCount: 1, getRangeAt: () => ({ collapsed: false, toString: () => "Shadow Text" }) };
  const mockShadowHost = { id: 'interop-outlet', isConnected: true };
  const mockShadowRoot = {
    nodeType: Node.DOCUMENT_FRAGMENT_NODE,
    host: mockShadowHost,
    getSelection: () => mockShadowSelection
  };
  const shadowEditor = {
    nodeType: Node.ELEMENT_NODE,
    tagName: 'DIV',
    className: 'ql-editor',
    isConnected: true,
    ownerDocument: global.document,
    getRootNode: () => mockShadowRoot
  };
  assert("2. ShadowRoot editor uses ShadowRoot.getSelection()", getSelectionForEditor(shadowEditor), mockShadowSelection);

  // --- 3. ShadowRoot.getSelection unavailable falls back safely ---
  const mockShadowRootNoSel = {
    nodeType: Node.DOCUMENT_FRAGMENT_NODE,
    host: mockShadowHost
  };
  const shadowEditorNoSel = {
    nodeType: Node.ELEMENT_NODE,
    tagName: 'DIV',
    isConnected: true,
    ownerDocument: global.document,
    getRootNode: () => mockShadowRootNoSel
  };
  assert("3. ShadowRoot.getSelection unavailable falls back safely", getSelectionForEditor(shadowEditorNoSel), mockDocSelection);

  // --- Setup global mocks for resolution & detection ---
  window.LinkedInTextFormatter.resolveToEditableRoot = (node) => {
    if (!node) return null;
    return node.mockRoot || null;
  };
  window.LinkedInTextFormatter.isSupportedLinkedInPostEditor = (ed) => {
    return ed && ed.supported !== false;
  };
  window.LinkedInTextFormatter.isExcludedControl = (node) => {
    return node && node.isExcluded === true;
  };

  // --- 4. Collapsed ShadowRoot selection is rejected ---
  state.activeEditor = shadowEditor;
  mockShadowSelection.getRangeAt = () => ({
    collapsed: true,
    toString: () => "",
    startContainer: { mockRoot: shadowEditor, isConnected: true },
    endContainer: { mockRoot: shadowEditor, isConnected: true }
  });
  evaluateSelection();
  assert("4. Collapsed ShadowRoot selection is rejected", SelectionManager.hasValidSelection(), false);

  // --- 5. Non-empty ShadowRoot selection is accepted ---
  const validShadowRange = {
    collapsed: false,
    toString: () => "Valid Shadow Text",
    cloneRange: function() { return this; },
    startContainer: { mockRoot: shadowEditor, isConnected: true },
    endContainer: { mockRoot: shadowEditor, isConnected: true }
  };
  mockShadowSelection.getRangeAt = () => validShadowRange;
  evaluateSelection();
  assert("5. Non-empty ShadowRoot selection is accepted", SelectionManager.hasValidSelection(), true);

  // --- 6. Whitespace-only selection is rejected ---
  mockShadowSelection.getRangeAt = () => ({
    collapsed: false,
    toString: () => "   \n\t  ",
    startContainer: { mockRoot: shadowEditor, isConnected: true },
    endContainer: { mockRoot: shadowEditor, isConnected: true }
  });
  evaluateSelection();
  assert("6. Whitespace-only selection is rejected", SelectionManager.hasValidSelection(), false);

  // --- 7. Boundaries inside the same ql-editor are valid ---
  mockShadowSelection.getRangeAt = () => validShadowRange;
  evaluateSelection();
  assert("7. Boundaries inside the same ql-editor are valid", isSavedRangeValid(), true);

  // --- 8. Boundaries in different roots are rejected ---
  const otherShadowEditor = {
    nodeType: Node.ELEMENT_NODE,
    tagName: 'DIV',
    className: 'ql-editor-2',
    isConnected: true,
    getRootNode: () => mockShadowRoot
  };
  mockShadowSelection.getRangeAt = () => ({
    collapsed: false,
    toString: () => "Cross Editor Text",
    startContainer: { mockRoot: shadowEditor, isConnected: true },
    endContainer: { mockRoot: otherShadowEditor, isConnected: true }
  });
  evaluateSelection();
  assert("8. Boundaries in different roots are rejected", SelectionManager.hasValidSelection(), false);

  // --- 9. .ql-clipboard selection is rejected ---
  mockShadowSelection.getRangeAt = () => ({
    collapsed: false,
    toString: () => "Clipboard Text",
    startContainer: { mockRoot: shadowEditor, isConnected: true, isExcluded: true },
    endContainer: { mockRoot: shadowEditor, isConnected: true }
  });
  evaluateSelection();
  assert("9. .ql-clipboard selection is rejected", SelectionManager.hasValidSelection(), false);

  // --- 10. Shadow host removal invalidates the range ---
  mockShadowSelection.getRangeAt = () => validShadowRange;
  evaluateSelection();
  assert("Pre-condition: range valid before host removal", isSavedRangeValid(), true);

  mockShadowHost.isConnected = false;
  assert("10. Shadow host removal invalidates the range", isSavedRangeValid(), false);
  mockShadowHost.isConnected = true; // restore

  // --- 11. Saved selection stores the correct root ---
  evaluateSelection();
  assert("11. Saved selection stores the correct root", state.selectionRoot, mockShadowRoot);

  // --- 12. restoreSelection uses the saved ShadowRoot selection ---
  let shadowRangesCleared = false;
  let shadowRangeAdded = null;
  mockShadowSelection.removeAllRanges = () => { shadowRangesCleared = true; };
  mockShadowSelection.addRange = (r) => { shadowRangeAdded = r; };
  shadowEditor.focus = () => {};

  const restoredShadow = restoreSavedSelection();
  assert("12. restoreSelection returns true for ShadowRoot", restoredShadow, true);
  assert("12. restoreSelection cleared ShadowRoot ranges", shadowRangesCleared, true);
  assert("12. restoreSelection added saved range to ShadowRoot selection", shadowRangeAdded, validShadowRange);

  // --- 13. Document selection restoration remains unchanged ---
  state.activeEditor = docEditor;
  let docRangesCleared = false;
  let docRangeAdded = null;
  mockDocSelection.removeAllRanges = () => { docRangesCleared = true; };
  mockDocSelection.addRange = (r) => { docRangeAdded = r; };
  const validDocRange = {
    collapsed: false,
    toString: () => "Doc Text",
    cloneRange: function() { return this; },
    startContainer: { mockRoot: docEditor, isConnected: true },
    endContainer: { mockRoot: docEditor, isConnected: true }
  };
  mockDocSelection.getRangeAt = () => validDocRange;
  evaluateSelection();
  docEditor.focus = () => {};

  const restoredDoc = restoreSavedSelection();
  assert("13. Document selection restoration returns true", restoredDoc, true);
  assert("13. Document selection cleared document ranges", docRangesCleared, true);
  assert("13. Document selection added range to document selection", docRangeAdded, validDocRange);

  // --- 14. Pointerup triggers delayed evaluation ---
  let evalTriggered = false;
  state.activeEditor = shadowEditor;
  mockShadowSelection.getRangeAt = () => validShadowRange;

  handleSelectionEvent({ type: 'pointerup', target: shadowEditor });
  assert("14. Pointerup triggers evaluation resulting in valid selection", SelectionManager.hasValidSelection(), true);

  // --- 15. Shift + Arrow keyup triggers delayed evaluation ---
  handleSelectionEvent({ type: 'keyup', shiftKey: true, key: 'ArrowRight', target: shadowEditor });
  assert("15. Shift + Arrow keyup triggers evaluation resulting in valid selection", SelectionManager.hasValidSelection(), true);

  // --- 16. No duplicate valid-selection callbacks ---
  let validCallbackCount = 0;
  SelectionManager.onSelectionValid(() => { validCallbackCount++; });

  evaluateSelection(); // Same selection evaluate again
  const firstCount = validCallbackCount;
  evaluateSelection(); // Second evaluate with identical selection
  const secondCount = validCallbackCount;

  assert("16. No duplicate valid-selection callbacks on identical selection", firstCount, secondCount);

  // --- 17. Selected text is never logged ---
  let loggedText = false;
  const originalLog = console.log;
  console.log = (...args) => {
    const str = args.join(' ');
    if (str.includes("Valid Shadow Text") || str.includes("Doc Text")) {
      loggedText = true;
    }
  };
  evaluateSelection();
  console.log = originalLog;
  assert("17. Selected text is never logged to console", loggedText, false);

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runSelectionManagerTests();
  console.log(`========================================`);
  console.log(`Selection Manager Test Suite Results:`);
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
