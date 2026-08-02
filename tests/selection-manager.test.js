/**
 * selection-manager.test.js
 *
 * Zero-dependency unit tests for SelectionManager:
 * - Direction detection
 * - State protection API
 * - Extension element matching with composedPath and closest
 * - Range validation under mock conditions
 * - State clearing
 */

// 1. Mock minimal DOM environment
global.Node = {
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4,
  ELEMENT_NODE: 1,
  TEXT_NODE: 3
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  body: {
    contains: (node) => {
      if (!node) return false;
      return node.detached !== true;
    }
  }
};

let mockSelection = null;
global.window = {
  getSelection: () => mockSelection,
  LinkedInTextFormatter: {}
};

// Import selection-manager
require('../src/content/selection-manager');

const {
  state,
  getSelectionDirection,
  isSavedRangeValid,
  clearSavedSelection,
  isExtensionElement
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

  // Test 1: API Exports
  assert("API: getSavedRange is a function", typeof SelectionManager.getSavedRange, "function");
  assert("API: getSavedEditor is a function", typeof SelectionManager.getSavedEditor, "function");
  assert("API: hasValidSelection is a function", typeof SelectionManager.hasValidSelection, "function");
  assert("API: restoreSelection is a function", typeof SelectionManager.restoreSelection, "function");
  assert("API: clearSelection is a function", typeof SelectionManager.clearSelection, "function");
  assert("API: validateSavedRange is a function", typeof SelectionManager.validateSavedRange, "function");
  assert("API: beginProtectedInteraction is a function", typeof SelectionManager.beginProtectedInteraction, "function");
  assert("API: endProtectedInteraction is a function", typeof SelectionManager.endProtectedInteraction, "function");
  assert("API: isProtectedInteractionActive is a function", typeof SelectionManager.isProtectedInteractionActive, "function");

  // Test 2: Direction Detection
  const sameNode = { id: 'text-1' };
  const sel1 = { anchorNode: sameNode, focusNode: sameNode, anchorOffset: 0, focusOffset: 5 };
  const sel2 = { anchorNode: sameNode, focusNode: sameNode, anchorOffset: 5, focusOffset: 0 };
  assert("Direction: Same node forward", getSelectionDirection(sel1), 'forward');
  assert("Direction: Same node backward", getSelectionDirection(sel2), 'backward');

  const nodeA = { compareDocumentPosition: (other) => (other === nodeB ? Node.DOCUMENT_POSITION_FOLLOWING : 0) };
  const nodeB = { compareDocumentPosition: (other) => (other === nodeA ? Node.DOCUMENT_POSITION_PRECEDING : 0) };
  const sel3 = { anchorNode: nodeA, focusNode: nodeB };
  const sel4 = { anchorNode: nodeB, focusNode: nodeA };
  assert("Direction: Different nodes forward", getSelectionDirection(sel3), 'forward');
  assert("Direction: Different nodes backward", getSelectionDirection(sel4), 'backward');

  // Test 3: Protection State Locking
  assert("Protected active initially false", SelectionManager.isProtectedInteractionActive(), false);
  SelectionManager.beginProtectedInteraction();
  assert("Protected active after begin", SelectionManager.isProtectedInteractionActive(), true);
  SelectionManager.endProtectedInteraction();
  assert("Protected active after end", SelectionManager.isProtectedInteractionActive(), false);

  // Test 4: Extension Element Detection
  const extensionNode = {
    getAttribute: (attr) => (attr === 'data-linkedin-text-formatter' ? 'true' : null),
    parentElement: null
  };
  const childNode = {
    getAttribute: () => null,
    parentElement: extensionNode,
    closest: (sel) => (sel.includes('data-linkedin-text-formatter') ? extensionNode : null)
  };
  const ordinaryNode = {
    getAttribute: () => null,
    parentElement: null,
    closest: () => null
  };

  assert("Extension element matched by data-attribute", isExtensionElement(extensionNode), true);
  assert("Extension child inherits match via closest/parent", isExtensionElement(childNode), true);
  assert("Ordinary element is not matched", isExtensionElement(ordinaryNode), false);

  // Composed path matching test
  const mockEventWithPath = {
    composedPath: () => [childNode, extensionNode, global.document.body]
  };
  assert("ComposedPath containing toolbar is matched", isExtensionElement(childNode, mockEventWithPath), true);

  // Test 5: Selection Validation Logic under Mocked Resolvers
  assert("No selection initially valid", isSavedRangeValid(), false);

  const mockEditor = { supported: true, detached: false };
  const mockRange = {
    startContainer: { mockRoot: mockEditor, detached: false },
    endContainer: { mockRoot: mockEditor, detached: false }
  };

  // Mock global extension functions
  window.LinkedInTextFormatter.resolveToEditableRoot = (node) => node.mockRoot || null;
  window.LinkedInTextFormatter.isSupportedLinkedInPostEditor = (ed) => ed.supported === true;

  // Set mock state
  state.savedRange = mockRange;
  state.editor = mockEditor;

  assert("Saved selection is valid under mocked config", isSavedRangeValid(), true);

  // Simulate detached editor
  mockEditor.detached = true;
  assert("Selection invalid if editor detached", isSavedRangeValid(), false);
  mockEditor.detached = false; // restore

  // Simulate boundary container disconnected
  mockRange.startContainer.detached = true;
  assert("Selection invalid if startContainer detached", isSavedRangeValid(), false);
  mockRange.startContainer.detached = false; // restore

  // Simulate boundary resolved to different editor
  const otherEditor = { supported: true };
  mockRange.endContainer.mockRoot = otherEditor;
  assert("Selection invalid if endContainer resolved to different editor", isSavedRangeValid(), false);
  mockRange.endContainer.mockRoot = mockEditor; // restore

  // Simulate editor becomes unsupported
  mockEditor.supported = false;
  assert("Selection invalid if editor becomes unsupported", isSavedRangeValid(), false);
  mockEditor.supported = true; // restore

  // Test 6: Clear Selection
  SelectionManager.clearSelection();
  assert("State editor cleared after clearSelection()", state.editor, null);
  assert("State range cleared after clearSelection()", state.savedRange, null);

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
