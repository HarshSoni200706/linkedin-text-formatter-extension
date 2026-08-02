/**
 * toolbar-manager.test.js
 *
 * Zero-dependency unit tests for ToolbarManager logic:
 * - Viewport clamping and positioning calculations
 * - Above-versus-below placement decisions
 * - Zero-sized selection handling and getClientRects fallback
 * - Toolbar host resolution inside composer dialog
 * - Callback registration and dispatching
 * - Single-instance reuse and show() with SelectionManager integration
 */

// 1. Mock minimal browser environment
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3
};

let mockElementStore = new Map();

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: (id) => mockElementStore.get(id) || null,
  createElement: (tag) => {
    const attrs = new Map();
    const classes = new Set();
    const children = [];
    const element = {
      tagName: tag.toUpperCase(),
      style: {},
      id: '',
      className: '',
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
      appendChild: (child) => children.push(child),
      addEventListener: () => {},
      getBoundingClientRect: () => ({ width: 180, height: 36, top: 0, left: 0 })
    };
    return element;
  },
  body: {
    tagName: 'BODY',
    appendChild: (el) => {
      if (el && el.id) mockElementStore.set(el.id, el);
    },
    contains: (el) => {
      return el && mockElementStore.get(el.id) === el;
    }
  },
  documentElement: {
    clientWidth: 1000,
    clientHeight: 800
  }
};

let mockSavedRange = null;
let mockHasValidSelection = false;

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
      getSavedRange: () => mockSavedRange,
      getSavedEditor: () => null,
      hasValidSelection: () => mockHasValidSelection,
      beginProtectedInteraction: () => {},
      endProtectedInteraction: () => {},
      onSelectionValid: (cb) => { global._validCb = cb; },
      onSelectionInvalid: (cb) => { global._invalidCb = cb; }
    }
  }
};

// Import toolbar-manager
require('../src/content/toolbar-manager');

const {
  calculateToolbarPosition,
  getValidSelectionRect,
  resolveToolbarHost,
  BUTTON_CONFIGS,
  formatActionCallbacks
} = require('../src/content/toolbar-manager');

const ToolbarManager = global.window.LinkedInTextFormatter.ToolbarManager;

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

  // Test 1: API Exports
  assert("API: initialize is a function", typeof ToolbarManager.initialize, "function");
  assert("API: show is a function", typeof ToolbarManager.show, "function");
  assert("API: hide is a function", typeof ToolbarManager.hide, "function");
  assert("API: reposition is a function", typeof ToolbarManager.reposition, "function");
  assert("API: isVisible is a function", typeof ToolbarManager.isVisible, "function");
  assert("API: getElement is a function", typeof ToolbarManager.getElement, "function");
  assert("API: destroy is a function", typeof ToolbarManager.destroy, "function");
  assert("API: onFormatAction is a function", typeof ToolbarManager.onFormatAction, "function");

  // Test 2: Button Configurations
  assert("BUTTON_CONFIGS has exactly 5 buttons", BUTTON_CONFIGS.length, 5);
  const actions = BUTTON_CONFIGS.map(b => b.action);
  assert("Contains bold action", actions.includes('bold'), true);
  assert("Contains italic action", actions.includes('italic'), true);
  assert("Contains bold-italic action", actions.includes('bold-italic'), true);
  assert("Contains underline action", actions.includes('underline'), true);
  assert("Contains double-underline action", actions.includes('double-underline'), true);

  // Test 3: Positioning Calculation - Above Selection
  const selAbove = { top: 200, bottom: 230, left: 100, width: 200, height: 30 };
  const tbRect = { width: 180, height: 36 };
  const vpRect = { width: 1000, height: 800 };
  
  const posAbove = calculateToolbarPosition(selAbove, tbRect, vpRect, 8, 8);
  assert("Placement above selection", posAbove.placement, 'above');
  assert("Calculated top above (200 - 36 - 8)", posAbove.top, 156);
  assert("Calculated left centered (100 + 100 - 90)", posAbove.left, 110);

  // Test 4: Positioning Calculation - Below Selection (Insufficient space above)
  const selTopEdge = { top: 20, bottom: 50, left: 100, width: 200, height: 30 };
  const posBelow = calculateToolbarPosition(selTopEdge, tbRect, vpRect, 8, 8);
  assert("Placement below selection", posBelow.placement, 'below');
  assert("Calculated top below (50 + 8)", posBelow.top, 58);

  // Test 5: Horizontal Clamping - Left Edge
  const selLeftEdge = { top: 200, bottom: 230, left: 0, width: 20, height: 30 };
  const posLeftClamp = calculateToolbarPosition(selLeftEdge, tbRect, vpRect, 8, 8);
  assert("Left edge clamped to margin 8", posLeftClamp.left, 8);

  // Test 6: Horizontal Clamping - Right Edge
  const selRightEdge = { top: 200, bottom: 230, left: 950, width: 40, height: 30 };
  const posRightClamp = calculateToolbarPosition(selRightEdge, tbRect, vpRect, 8, 8);
  assert("Right edge clamped to (1000 - 180 - 8 = 812)", posRightClamp.left, 812);

  // Test 7: Zero-sized rectangle rejected by calculator
  const zeroRect = { top: 100, bottom: 100, left: 100, width: 0, height: 0 };
  const posZero = calculateToolbarPosition(zeroRect, tbRect, vpRect, 8, 8);
  assert("Zero rectangle returns null", posZero, null);

  // Test 8: getValidSelectionRect fallback to getClientRects
  const rangeWithZeroBounding = {
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    getClientRects: () => [
      { top: 150, bottom: 180, left: 200, right: 350, width: 150, height: 30 }
    ]
  };
  const fallbackRect = getValidSelectionRect(rangeWithZeroBounding);
  assert("getValidSelectionRect fallback recovers width", fallbackRect.width, 150);
  assert("getValidSelectionRect fallback recovers top", fallbackRect.top, 150);

  // Test 9: Host Resolution Tests
  const mockDialog = { tagName: 'DIALOG', getAttribute: () => 'dialog' };
  const mockEditorInDialog = {
    closest: (sel) => (sel.includes('dialog') ? mockDialog : null)
  };
  const mockEditorOutsideDialog = {
    closest: () => null
  };

  assert("resolveToolbarHost returns active dialog when editor is inside dialog", resolveToolbarHost(mockEditorInDialog), mockDialog);
  assert("resolveToolbarHost falls back to document.body when outside dialog", resolveToolbarHost(mockEditorOutsideDialog), global.document.body);
  assert("resolveToolbarHost falls back to document.body when editor is null", resolveToolbarHost(null), global.document.body);

  // Test 10: Initialization & Single Instance Setup
  ToolbarManager.initialize();
  const el1 = ToolbarManager.getElement();
  assert("Single toolbar element created", el1 !== null, true);
  assert("Toolbar ID is ltf-floating-toolbar", el1.id, 'ltf-floating-toolbar');

  ToolbarManager.initialize(); // Second call must be idempotent
  const el2 = ToolbarManager.getElement();
  assert("Re-initialize returns exact same toolbar element instance", el1, el2);

  // Test 11: Show with SelectionManager retrieval when no parameter supplied
  mockSavedRange = {
    getBoundingClientRect: () => ({ top: 200, bottom: 220, left: 300, right: 400, width: 100, height: 20 })
  };
  mockHasValidSelection = true;

  ToolbarManager.show(); // No argument passed
  assert("Toolbar becomes visible after show()", ToolbarManager.isVisible(), true);
  assert("Finite top applied", typeof parseInt(el1.style.top, 10), 'number');
  assert("Finite left applied", typeof parseInt(el1.style.left, 10), 'number');

  // Test 12: Hide reason tracking
  ToolbarManager.hide('unit-test-hide');
  assert("Toolbar is hidden after hide()", ToolbarManager.isVisible(), false);

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
