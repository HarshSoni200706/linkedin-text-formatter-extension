/**
 * editor-detector.test.js
 *
 * Isolated, zero-dependency test suite for validating LinkedIn editor detection logic.
 * Mocks the necessary DOM node structure to run in a Node.js environment.
 */

// Mock global browser structures before requiring the script
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3
};

global.window = {
  location: {
    pathname: '/'
  }
};

const {
  resolveToEditableRoot,
  isEditable,
  checkEditorSupport,
  isSupportedLinkedInPostEditor
} = require('../src/content/editor-manager');

// Helper to create a mock node tree
function createMockNode(options = {}) {
  const node = {
    nodeType: options.nodeType || Node.ELEMENT_NODE,
    tagName: options.tagName || 'DIV',
    attributes: new Map(Object.entries(options.attributes || {})),
    classList: {
      contains(cls) {
        return (options.classList || []).includes(cls);
      },
      [Symbol.iterator]() {
        return (options.classList || [])[Symbol.iterator]();
      }
    },
    id: options.id || '',
    parentElement: null,
    getAttribute(name) {
      return this.attributes.get(name) || null;
    }
  };

  if (options.parent) {
    node.parentElement = options.parent;
  }
  return node;
}

function runEditorDetectorTests() {
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

  // Set window location pathname helper
  function setPathname(path) {
    global.window.location.pathname = path;
  }

  // Reset pathname
  setPathname('/');

  // Test Case 1: Null element
  assert("Null element is rejected", isSupportedLinkedInPostEditor(null), false);
  assert("Null element rejection reason", checkEditorSupport(null).reason, "Element is null or undefined");

  // Test Case 2: Standard non-editable node
  const normalDiv = createMockNode({ tagName: 'DIV' });
  assert("Normal non-editable div is rejected", isSupportedLinkedInPostEditor(normalDiv), false);
  assert("Normal div rejection reason", checkEditorSupport(normalDiv).reason, "Not a contenteditable element or nested inside one");

  // Test Case 3: Input element
  const inputEl = createMockNode({
    tagName: 'INPUT',
    attributes: { contenteditable: 'true' }
  });
  assert("Input element is rejected", isSupportedLinkedInPostEditor(inputEl), false);
  assert("Input element rejection reason", checkEditorSupport(inputEl).reason, "Inputs and textareas are not supported post editors");

  // Test Case 4: Text node inside contenteditable inside supported dialog
  const dialog = createMockNode({
    attributes: { role: 'dialog' }
  });
  const editor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: dialog
  });
  const textNode = createMockNode({
    nodeType: Node.TEXT_NODE,
    tagName: '#text',
    parent: editor
  });
  assert("Text node inside supported editor is resolved and accepted", isSupportedLinkedInPostEditor(textNode), true);
  assert("Supported editor check reason", checkEditorSupport(textNode).reason, "Supported LinkedIn post editor");

  // Test Case 5: Element inside search nav
  const searchContainer = createMockNode({
    attributes: { role: 'search' }
  });
  const searchEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: searchContainer
  });
  assert("Editor inside search is rejected", isSupportedLinkedInPostEditor(searchEditor), false);
  assert("Search editor rejection reason", checkEditorSupport(searchEditor).reason, "Element is inside search or navigation");

  // Test Case 6: Element inside comment composer
  const commentBox = createMockNode({
    classList: ['comments-comment-box']
  });
  const commentEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: commentBox
  });
  assert("Editor inside comment composer is rejected", isSupportedLinkedInPostEditor(commentEditor), false);
  assert("Comment editor rejection reason", checkEditorSupport(commentEditor).reason, "Element is inside a comment composer");

  // Test Case 7: Element inside messaging composer
  const msgEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true', 'aria-label': 'Write a message...' },
    parent: dialog
  });
  assert("Editor inside messaging is rejected", isSupportedLinkedInPostEditor(msgEditor), false);
  assert("Messaging editor rejection reason", checkEditorSupport(msgEditor).reason, "Element is inside a messaging composer");

  // Test Case 8: Element inside Pulse article editor
  setPathname('/pulse/write-article');
  const articleEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: dialog
  });
  assert("Editor inside Pulse URL is rejected", isSupportedLinkedInPostEditor(articleEditor), false);
  assert("Pulse editor rejection reason", checkEditorSupport(articleEditor).reason, "Element is inside an article or newsletter editor");
  setPathname('/');

  // Test Case 9: Element inside excluded dialog modal
  const settingsDialog = createMockNode({
    attributes: { role: 'dialog', 'aria-label': 'Post Settings' }
  });
  const settingsEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: settingsDialog
  });
  assert("Editor inside settings dialog is rejected", isSupportedLinkedInPostEditor(settingsEditor), false);
  assert("Settings editor rejection reason", checkEditorSupport(settingsEditor).reason, "Element is inside an excluded dialog modal (settings, filter, profile)");

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runEditorDetectorTests();
  console.log(`========================================`);
  console.log(`Editor Detector Test Suite Results:`);
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
