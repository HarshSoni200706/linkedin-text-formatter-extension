/**
 * selection-manager.test.js
 *
 * Zero-dependency unit tests for validating SelectionManager's pure logic.
 * Updated to verify compatibility with the scored editor detection rules.
 */

// 1. Mock minimal DOM structures needed before importing SelectionManager
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4
};

global.document = {
  addEventListener: () => {},
  body: {
    contains: (node) => {
      // Mock body.contains to return true for nodes created in our tests
      return node && !node.detached;
    }
  }
};

global.window = {
  LinkedInTextFormatter: {
    resolveToEditableRoot: (node) => {
      if (!node) return null;
      return node.mockRoot || null;
    },
    isSupportedLinkedInPostEditor: (element) => {
      return element && element.supported;
    }
  },
  getSelection: () => {}
};

// Import selection-manager (executes IIFE and attaches to window.LinkedInTextFormatter)
require('../src/content/selection-manager');

// Retrieve selection-manager exports from mock Node env
const {
  getSelectionDirection,
  isSavedRangeValid,
  clearSavedSelection,
  isExtensionElement,
  state
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

  // Test 2: RTL/LTR Direction Detection
  const mockNodeA = { id: 'nodeA', compareDocumentPosition: () => 4 }; // nodeB is after A
  const mockNodeB = { id: 'nodeB', compareDocumentPosition: () => 2 }; // nodeA is before B

  // Same node, focusOffset >= anchorOffset => forward
  const sel1 = { anchorNode: mockNodeA, anchorOffset: 5, focusNode: mockNodeA, focusOffset: 8 };
  assert("Direction: Same node forward", getSelectionDirection(sel1), "forward");

  // Same node, focusOffset < anchorOffset => backward
  const sel2 = { anchorNode: mockNodeA, anchorOffset: 5, focusNode: mockNodeA, focusOffset: 2 };
  assert("Direction: Same node backward", getSelectionDirection(sel2), "backward");

  // Different nodes, focus Node follows anchor Node => forward
  const sel3 = {
    anchorNode: mockNodeA,
    focusNode: mockNodeB,
    anchorOffset: 0,
    focusOffset: 0
  };
  mockNodeA.compareDocumentPosition = (other) => other === mockNodeB ? Node.DOCUMENT_POSITION_FOLLOWING : 0;
  assert("Direction: Different nodes forward", getSelectionDirection(sel3), "forward");

  // Different nodes, focus Node precedes anchor Node => backward
  const sel4 = {
    anchorNode: mockNodeB,
    focusNode: mockNodeA,
    anchorOffset: 0,
    focusOffset: 0
  };
  mockNodeB.compareDocumentPosition = (other) => other === mockNodeA ? Node.DOCUMENT_POSITION_PRECEDING : 0;
  assert("Direction: Different nodes backward", getSelectionDirection(sel4), "backward");

  // Test 3: Protected Interaction State
  assert("Protected active initially false", SelectionManager.isProtectedInteractionActive(), false);
  SelectionManager.beginProtectedInteraction();
  assert("Protected active after begin", SelectionManager.isProtectedInteractionActive(), true);
  SelectionManager.endProtectedInteraction();
  assert("Protected active after end", SelectionManager.isProtectedInteractionActive(), false);

  // Test 4: Extension element identification
  const toolbarEl = {
    getAttribute: (attr) => attr === 'data-linkedin-text-formatter' ? 'true' : null,
    parentElement: null
  };
  const toolbarChild = {
    parentElement: toolbarEl
  };
  const ordinaryEl = {
    getAttribute: () => null,
    parentElement: null
  };
  assert("Extension element matched by data-attribute", isExtensionElement(toolbarEl), true);
  assert("Extension child inherits match", isExtensionElement(toolbarChild), true);
  assert("Ordinary element is not matched", isExtensionElement(ordinaryEl), false);

  // Test 5: Range validation (isSavedRangeValid)
  SelectionManager.clearSelection();
  assert("No selection initially valid", SelectionManager.hasValidSelection(), false);

  // Set mock state directly
  const mockEditor = { supported: true, name: 'Editor' };
  const mockRange = {
    startContainer: { mockRoot: mockEditor },
    endContainer: { mockRoot: mockEditor }
  };
  state.savedRange = mockRange;
  state.editor = mockEditor;

  assert("Saved selection is valid under mocked config", isSavedRangeValid(), true);

  // Simulate editor disconnected
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
