/**
 * editor-detector.test.js
 *
 * Isolated, zero-dependency test suite for validating LinkedIn editor detection logic across:
 * - Direct-document post editors (/sharing/compose or modal dialogs)
 * - Verified open Shadow DOM post editors (DIV.ql-editor inside DIV#interop-outlet host)
 * - CAPTCHA and Quill helper exclusions (.ql-clipboard, g-recaptcha-response)
 */

const fs = require('fs');
const path = require('path');

// Mock global browser structures before requiring the script
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
};

global.window = {
  self: 1,
  top: 1,
  location: {
    hostname: 'www.linkedin.com',
    pathname: '/'
  }
};

const {
  getComposedParent,
  composedClosest,
  resolveEditableFromComposedPath,
  resolveToEditableRoot,
  isEditable,
  isExcludedControl,
  checkEditorSupport,
  isSupportedLinkedInPostEditor
} = require('../src/content/editor-manager');

// Helper to create a mock node tree with ShadowRoot support
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
    parentNode: null,
    getAttribute(name) {
      return this.attributes.get(name) || null;
    },
    getRootNode() {
      if (options.rootNode) return options.rootNode;
      let curr = this;
      while (curr.parentElement || (curr.parentNode && curr.parentNode.host)) {
        if (curr.parentNode && curr.parentNode.host) {
          curr = curr.parentNode;
          break;
        }
        curr = curr.parentElement || curr.parentNode;
      }
      return curr;
    }
  };

  if (options.parent) {
    node.parentElement = options.parent;
    node.parentNode = options.parent;
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
  function setPathname(pathStr) {
    global.window.location.pathname = pathStr;
  }

  // Reset pathname
  setPathname('/');

  // Manifest validation tests
  const manifestPath = path.join(__dirname, '../manifest.json');
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const contentScriptConfig = manifestContent.content_scripts[0];

  assert("Manifest matches only LinkedIn domains", contentScriptConfig.matches.includes("https://www.linkedin.com/*") && contentScriptConfig.matches.length === 1, true);
  assert("Manifest does not contain all_frames flag", contentScriptConfig.all_frames, undefined);

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

  // Test Case 7: Element inside messaging composer
  const msgEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true', 'aria-label': 'Write a message...' },
    parent: dialog
  });
  assert("Editor inside messaging is rejected", isSupportedLinkedInPostEditor(msgEditor), false);

  // Test Case 8: Element inside Pulse article editor
  setPathname('/pulse/write-article');
  const articleEditor = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: dialog
  });
  assert("Editor inside Pulse URL is rejected", isSupportedLinkedInPostEditor(articleEditor), false);
  setPathname('/');

  // --- Phase 8 Open Shadow DOM Composer Tests (Layout B) ---

  // Test 9: Verified Layout B Open Shadow DOM Composer
  setPathname('/feed/');
  const interopHost = createMockNode({
    tagName: 'DIV',
    id: 'interop-outlet',
    classList: ['theme--light']
  });
  const shadowRoot = {
    nodeType: Node.DOCUMENT_FRAGMENT_NODE,
    host: interopHost
  };
  const qlEditor = createMockNode({
    tagName: 'DIV',
    classList: ['ql-editor'],
    attributes: {
      contenteditable: 'true',
      role: 'textbox',
      'aria-multiline': 'true',
      'data-test-ql-editor-contenteditable': 'true'
    },
    rootNode: shadowRoot
  });
  qlEditor.parentNode = shadowRoot;

  assert("DIV.ql-editor inside Shadow DOM on /feed/ is accepted", isSupportedLinkedInPostEditor(qlEditor), true);
  assert("Layout B recognized as Shadow DOM post editor", checkEditorSupport(qlEditor).reason, "Supported LinkedIn Shadow DOM post editor (Layout B)");

  // Test 10: Nested paragraph inside ql-editor resolves to ql-editor
  const nestedPInQl = createMockNode({
    tagName: 'P',
    parent: qlEditor,
    rootNode: shadowRoot
  });
  assert("Nested P inside ql-editor resolves to ql-editor", resolveToEditableRoot(nestedPInQl), qlEditor);
  assert("Nested P inside ql-editor is accepted", isSupportedLinkedInPostEditor(nestedPInQl), true);

  // Test 11: Retargeted event composedPath contains ql-editor
  const mockEvent = {
    composedPath: () => [nestedPInQl, qlEditor, shadowRoot, interopHost]
  };
  assert("Retargeted event composedPath resolves to ql-editor", resolveEditableFromComposedPath(mockEvent), qlEditor);

  // Test 12: Quill internal clipboard (.ql-clipboard) -> Expected: rejected
  const qlClipboard = createMockNode({
    tagName: 'DIV',
    classList: ['ql-clipboard'],
    attributes: { contenteditable: 'true', 'aria-hidden': 'true' },
    rootNode: shadowRoot
  });
  assert(".ql-clipboard is rejected", isSupportedLinkedInPostEditor(qlClipboard), false);

  // Test 13: g-recaptcha-response textarea -> Expected: rejected
  const captchaTextarea = createMockNode({
    tagName: 'TEXTAREA',
    id: 'g-recaptcha-response-100',
    attributes: { contenteditable: 'true' }
  });
  assert("g-recaptcha-response textarea is rejected", isSupportedLinkedInPostEditor(captchaTextarea), false);

  // Test 14: Element inside .g-recaptcha-badge -> Expected: rejected
  const captchaBadge = createMockNode({
    classList: ['g-recaptcha-badge']
  });
  const captchaInner = createMockNode({
    tagName: 'DIV',
    attributes: { contenteditable: 'true' },
    parent: captchaBadge
  });
  assert("Element inside .g-recaptcha-badge is rejected", isSupportedLinkedInPostEditor(captchaInner), false);

  // Test 15: Shadow DOM comment editor -> Expected: rejected
  const shadowCommentContainer = createMockNode({
    classList: ['comments-comment-box'],
    rootNode: shadowRoot
  });
  const shadowCommentEditor = createMockNode({
    tagName: 'DIV',
    classList: ['ql-editor'],
    attributes: { contenteditable: 'true', role: 'textbox' },
    parent: shadowCommentContainer,
    rootNode: shadowRoot
  });
  assert("Shadow DOM comment editor is rejected", isSupportedLinkedInPostEditor(shadowCommentEditor), false);

  // Test 16: Shadow DOM messaging editor -> Expected: rejected
  const shadowMsgContainer = createMockNode({
    classList: ['msg-overlay-conversation-bubble'],
    rootNode: shadowRoot
  });
  const shadowMsgEditor = createMockNode({
    tagName: 'DIV',
    classList: ['ql-editor'],
    attributes: { contenteditable: 'true', role: 'textbox' },
    parent: shadowMsgContainer,
    rootNode: shadowRoot
  });
  assert("Shadow DOM messaging editor is rejected", isSupportedLinkedInPostEditor(shadowMsgEditor), false);

  setPathname('/'); // Reset path

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
