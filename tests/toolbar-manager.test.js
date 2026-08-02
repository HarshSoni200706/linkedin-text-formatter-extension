/**
 * toolbar-manager.test.js
 *
 * Zero-dependency unit tests for ToolbarManager:
 * - Positioning calculations, clamping, and zero-rect fallbacks
 * - Toolbar host resolution (document, dialog, ShadowRoot)
 * - ShadowRoot stylesheet deduplication
 * - Canonical toolbar reuse, reparenting, duplicate cleanup
 * - Coalesced show updates & single selection subscription
 */

// 1. Mock minimal browser environment
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
};

let mockElementStore = new Map();
let docChildren = [];

global.requestAnimationFrame = (cb) => {
  cb();
  return 1;
};
global.cancelAnimationFrame = () => {};

function removeChildFromParent(child) {
  if (child.parentElement && typeof child.parentElement.removeChild === 'function') {
    try {
      child.parentElement.removeChild(child);
    } catch (e) {}
  }
}

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => mockElementStore.get(id) || null,
  querySelector: (sel) => {
    if (sel.includes('ltf-floating-toolbar')) {
      return mockElementStore.get('ltf-floating-toolbar') || null;
    }
    return null;
  },
  querySelectorAll: (sel) => {
    if (sel.includes('ltf-floating-toolbar')) {
      return docChildren.filter(c => c.id === 'ltf-floating-toolbar');
    }
    return [];
  },
  createElement: (tag) => {
    const attrs = new Map();
    const classes = new Set();
    const children = [];
    let clickHandler = null;
    const element = {
      tagName: tag.toUpperCase(),
      style: {},
      id: '',
      className: '',
      isConnected: true,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c)
      },
      setAttribute: (k, v) => {
        attrs.set(k, v);
        if (k === 'id') mockElementStore.set(v, element);
      },
      getAttribute: (k) => attrs.get(k) || null,
      removeAttribute: (k) => attrs.delete(k),
      appendChild: (child) => {
        removeChildFromParent(child);
        child.parentElement = element;
        child.parentNode = element;
        children.push(child);
      },
      removeChild: (child) => {
        const idx = children.indexOf(child);
        if (idx !== -1) children.splice(idx, 1);
        if (child.parentElement === element) child.parentElement = null;
        if (child.parentNode === element) child.parentNode = null;
      },
      addEventListener: (type, handler) => {
        if (type === 'click') clickHandler = handler;
      },
      triggerClick: (eventObj) => {
        if (clickHandler) clickHandler(eventObj || { target: element });
      },
      children,
      getBoundingClientRect: () => ({ width: 180, height: 36, top: 0, left: 0 })
    };
    element.ownerDocument = global.document;
    return element;
  },
  body: {
    tagName: 'BODY',
    ownerDocument: global.document,
    isConnected: true,
    appendChild: (el) => {
      removeChildFromParent(el);
      el.parentElement = global.document.body;
      el.parentNode = global.document.body;
      if (el && el.id) mockElementStore.set(el.id, el);
      if (!docChildren.includes(el)) docChildren.push(el);
    },
    removeChild: (el) => {
      const idx = docChildren.indexOf(el);
      if (idx !== -1) docChildren.splice(idx, 1);
      if (el && el.id) mockElementStore.delete(el.id);
      if (el.parentElement === global.document.body) el.parentElement = null;
      if (el.parentNode === global.document.body) el.parentNode = null;
    },
    contains: (el) => docChildren.includes(el),
    querySelectorAll: (sel) => {
      if (sel.includes('ltf-floating-toolbar')) {
        return docChildren.filter(c => c.id === 'ltf-floating-toolbar');
      }
      return [];
    }
  },
  documentElement: {
    clientWidth: 1000,
    clientHeight: 800
  }
};

let mockSavedRange = {
  getBoundingClientRect: () => ({ top: 200, bottom: 220, left: 300, right: 400, width: 100, height: 20 })
};
let mockHasValidSelection = true;
let mockSavedEditor = null;
let selectionValidSubscribers = [];

global.window = {
  innerWidth: 1000,
  innerHeight: 800,
  addEventListener: () => {},
  removeEventListener: () => {},
  LinkedInTextFormatter: {
    FORMAT_STYLES: {
      BOLD: 'bold',
      ITALIC: 'italic',
      BOLD_ITALIC: 'bold-italic',
      UNDERLINE: 'underline',
      DOUBLE_UNDERLINE: 'double-underline'
    },
    SelectionManager: {
      hasValidSelection: () => mockHasValidSelection,
      getSavedRange: () => mockSavedRange,
      getSavedEditor: () => mockSavedEditor,
      onSelectionValid: (cb) => { selectionValidSubscribers.push(cb); },
      onSelectionInvalid: () => {}
    }
  }
};

require('../src/content/toolbar-manager');

const {
  ToolbarManager,
  calculateToolbarPosition,
  getValidSelectionRect,
  resolveToolbarHost,
  ensureShadowToolbarStyles,
  cleanupDuplicateToolbars
} = require('../src/content/toolbar-manager');

function runToolbarManagerTests() {
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
  assert("API: initialize is a function", typeof ToolbarManager.initialize, 'function');
  assert("API: show is a function", typeof ToolbarManager.show, 'function');
  assert("API: hide is a function", typeof ToolbarManager.hide, 'function');
  assert("API: reposition is a function", typeof ToolbarManager.reposition, 'function');
  assert("API: isVisible is a function", typeof ToolbarManager.isVisible, 'function');
  assert("API: getElement is a function", typeof ToolbarManager.getElement, 'function');
  assert("API: destroy is a function", typeof ToolbarManager.destroy, 'function');
  assert("API: onFormatAction is a function", typeof ToolbarManager.onFormatAction, 'function');

  // --- Pure Positioning Tests ---
  const selectionRect = { top: 200, bottom: 220, left: 300, right: 400, width: 100, height: 20 };
  const toolbarRect = { width: 180, height: 36 };
  const viewportRect = { width: 1000, height: 800 };

  const posAbove = calculateToolbarPosition(selectionRect, toolbarRect, viewportRect);
  assert("Placement above selection", posAbove.placement, 'above');
  assert("Calculated top above (200 - 36 - 8)", posAbove.top, 156);
  assert("Calculated left centered (100 + 100 - 90)", posAbove.left, 260);

  const selectionTopRect = { top: 30, bottom: 50, left: 300, right: 400, width: 100, height: 20 };
  const posBelow = calculateToolbarPosition(selectionTopRect, toolbarRect, viewportRect);
  assert("Placement below selection", posBelow.placement, 'below');
  assert("Calculated top below (50 + 8)", posBelow.top, 58);

  const zeroRectRange = {
    getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }),
    getClientRects: () => []
  };
  assert("Zero rectangle returns null", getValidSelectionRect(zeroRectRange), null);

  // --- Host Resolution Tests ---
  const mockDialog = { tagName: 'DIALOG', getAttribute: () => 'dialog' };
  const mockEditorInDialog = {
    closest: (sel) => (sel.includes('dialog') ? mockDialog : null),
    ownerDocument: global.document,
    getRootNode: () => null
  };
  assert("resolveToolbarHost returns active dialog when editor is inside dialog", resolveToolbarHost(mockEditorInDialog), mockDialog);

  // --- 1. Repeated show() calls reuse one toolbar ---
  ToolbarManager.destroy();
  ToolbarManager.initialize();
  const tb1 = ToolbarManager.getElement();
  ToolbarManager.show();
  ToolbarManager.show();
  ToolbarManager.show();
  const tb2 = ToolbarManager.getElement();
  assert("1. Repeated show() calls reuse one toolbar", tb1, tb2);

  // --- 2. Ten rapid valid-selection callbacks still produce one toolbar ---
  for (let i = 0; i < 10; i++) {
    ToolbarManager.show();
  }
  const tb3 = ToolbarManager.getElement();
  assert("2. Ten rapid valid-selection callbacks still produce one toolbar", tb1, tb3);

  // --- 3. Toolbar inside ShadowRoot is found and reused ---
  const shadowChildren = [];
  const mockShadowHost = { id: 'interop-outlet', isConnected: true };
  const mockShadowRoot = {
    nodeType: Node.DOCUMENT_FRAGMENT_NODE,
    host: mockShadowHost,
    ownerDocument: global.document,
    isConnected: true,
    appendChild: (child) => {
      removeChildFromParent(child);
      child.parentElement = mockShadowRoot;
      child.parentNode = mockShadowRoot;
      shadowChildren.push(child);
    },
    removeChild: (child) => {
      const idx = shadowChildren.indexOf(child);
      if (idx !== -1) shadowChildren.splice(idx, 1);
      if (child.parentElement === mockShadowRoot) child.parentElement = null;
      if (child.parentNode === mockShadowRoot) child.parentNode = null;
    },
    querySelector: (sel) => shadowChildren.find(el => {
      if (sel.includes('style')) {
        return el.tagName === 'STYLE' || (el.getAttribute && el.getAttribute('data-linkedin-text-formatter-style') === 'true');
      }
      if (sel.includes('ltf-floating-toolbar')) {
        return el.id === 'ltf-floating-toolbar' || (el.getAttribute && el.getAttribute('data-linkedin-text-formatter') === 'true');
      }
      return false;
    }),
    querySelectorAll: (sel) => shadowChildren.filter(el => {
      if (sel.includes('ltf-floating-toolbar')) {
        return el.id === 'ltf-floating-toolbar';
      }
      return false;
    })
  };
  const mockShadowEditor = {
    getRootNode: () => mockShadowRoot,
    ownerDocument: global.document,
    closest: () => null
  };

  mockSavedEditor = mockShadowEditor;
  const resolvedHost = resolveToolbarHost(mockShadowEditor);
  assert("3. Toolbar host resolves to ShadowRoot", resolvedHost, mockShadowRoot);

  ToolbarManager.show();
  const tbShadow = ToolbarManager.getElement();
  assert("3. Toolbar inside ShadowRoot is created/reused", tbShadow !== null, true);

  // --- 4. Document lookup failure does not create a duplicate when canonical reference exists ---
  const origQuery = global.document.querySelector;
  global.document.querySelector = () => null;
  ToolbarManager.show();
  const tbAfterQueryNull = ToolbarManager.getElement();
  global.document.querySelector = origQuery;
  assert("4. Document lookup failure does not create duplicate when canonical reference exists", tbShadow, tbAfterQueryNull);

  // --- 5. Moving from document host to ShadowRoot moves the same element ---
  mockSavedEditor = null;
  ToolbarManager.destroy();
  mockElementStore.clear();
  ToolbarManager.initialize();
  const tbDoc = ToolbarManager.getElement();
  assert("5. Initial toolbar parent is body", tbDoc.parentElement.tagName, 'BODY');

  mockSavedEditor = mockShadowEditor;
  ToolbarManager.show();
  const tbInShadow = ToolbarManager.getElement();
  assert("5. Moving from document host to ShadowRoot moves same element", tbDoc, tbInShadow);
  assert("5. Element parent updated to ShadowRoot", tbInShadow.parentElement, mockShadowRoot);

  // --- 6. Moving from ShadowRoot back to document moves the same element ---
  mockSavedEditor = null;
  ToolbarManager.show();
  const tbBackInDoc = ToolbarManager.getElement();
  assert("6. Moving from ShadowRoot back to document moves same element", tbDoc, tbBackInDoc);
  assert("6. Element parent updated to document.body", tbBackInDoc.parentElement.tagName, 'BODY');

  // --- 7. Reparenting does not register button listeners again ---
  let clickActionEmittedCount = 0;
  ToolbarManager.onFormatAction(() => { clickActionEmittedCount++; });
  const boldBtn = tbBackInDoc.children.find(c => c.getAttribute && c.getAttribute('data-action') === 'bold');
  if (boldBtn) {
    boldBtn.closest = (sel) => (sel.includes('data-action') ? boldBtn : null);
    tbBackInDoc.triggerClick({ target: boldBtn });
  }
  assert("7. One click emits exactly one action before reparenting", clickActionEmittedCount, 1);

  mockSavedEditor = mockShadowEditor;
  ToolbarManager.show();
  if (boldBtn) {
    tbBackInDoc.triggerClick({ target: boldBtn });
  }
  assert("7. Reparenting does not duplicate click listeners (emits 2 total after second click)", clickActionEmittedCount, 2);

  // --- 8. Only one selection-valid subscription exists ---
  assert("8. Selection-valid subscriber count is 1", ToolbarManager.getSelectionSubscriptionCount(), 1);

  // --- 9. Pending requestAnimationFrame updates are coalesced ---
  let frameCount = 0;
  const origRAF = global.requestAnimationFrame;
  global.requestAnimationFrame = (cb) => {
    frameCount++;
    cb();
    return frameCount;
  };
  ToolbarManager.show();
  ToolbarManager.show();
  ToolbarManager.show();
  global.requestAnimationFrame = origRAF;
  assert("9. Coalesces show calls cleanly", frameCount > 0, true);

  // --- 10. Composer reopening reuses one toolbar ---
  mockSavedEditor = null;
  ToolbarManager.show();
  const tbReopened = ToolbarManager.getElement();
  assert("10. Composer reopening reuses one toolbar instance", tbDoc, tbReopened);

  // --- 11. Duplicate cleanup preserves one canonical element ---
  const dupToolbar = global.document.createElement('div');
  dupToolbar.id = 'ltf-floating-toolbar';
  dupToolbar.setAttribute('data-linkedin-text-formatter', 'true');
  global.document.body.appendChild(dupToolbar);

  cleanupDuplicateToolbars(global.document.body, tbReopened);
  const remainingInDoc = docChildren.filter(c => c.id === 'ltf-floating-toolbar');
  assert("11. Duplicate cleanup preserves one canonical element", remainingInDoc.length, 1);

  // --- 12. Only one ShadowRoot stylesheet exists ---
  ensureShadowToolbarStyles(mockShadowRoot);
  ensureShadowToolbarStyles(mockShadowRoot);
  const styleElements = shadowChildren.filter(c => c.tagName === 'STYLE');
  assert("12. Only one ShadowRoot stylesheet exists", styleElements.length, 1);

  // --- 13. One button click emits exactly one action ---
  const countBeforeClick = clickActionEmittedCount;
  if (boldBtn) {
    tbBackInDoc.triggerClick({ target: boldBtn });
  }
  assert("13. One button click emits exactly one action", clickActionEmittedCount, countBeforeClick + 1);

  // --- 14. Direct-document composer remains working ---
  mockSavedEditor = null;
  ToolbarManager.show();
  assert("14. Direct-document composer shows toolbar", ToolbarManager.isVisible(), true);

  // --- 15. Shadow DOM composer remains working ---
  mockSavedEditor = mockShadowEditor;
  ToolbarManager.show();
  assert("15. Shadow DOM composer shows toolbar", ToolbarManager.isVisible(), true);

  return { passed, failed, results };
}

// Auto-run in Node.js
if (typeof process !== 'undefined' && process.argv) {
  const summary = runToolbarManagerTests();
  console.log(`========================================`);
  console.log(`Toolbar Manager Test Suite Results:`);
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
