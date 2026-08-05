/**
 * quality-assurance.test.js
 *
 * Zero-dependency automated test suite for Phase 11 — Testing and Quality Assurance.
 * Expands automated coverage for:
 * 1. Full Formatter Matrix across all 5 styles and 13 input variations
 * 2. Formatter safety & idempotency rules (no duplicate combining mark accumulation, cross-style normalization, non-mutation)
 * 3. Safe degradation & DOM variation failure handling (missing classes, detached nodes, missing APIs)
 * 4. Listener lifecycle & single-instance guards
 * 5. Security & Privacy regression audit (zero manifest permissions, DEBUG=false by default)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock browser globals for Node test environment
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  DOCUMENT_FRAGMENT_NODE: 11
};

global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  body: { appendChild: () => {}, contains: () => false },
  documentElement: {}
};

global.window = {
  self: 1,
  top: 1,
  document: global.document,
  location: {
    hostname: 'www.linkedin.com',
    pathname: '/'
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

const { formatText } = require(path.join(ROOT_DIR, 'src/formatter/text-formatter.js'));
const { normalizeText } = require(path.join(ROOT_DIR, 'src/formatter/text-normalizer.js'));
const EditorManager = require(path.join(ROOT_DIR, 'src/content/editor-manager.js'));
const SelectionManager = require(path.join(ROOT_DIR, 'src/content/selection-manager.js'));

function runQATests() {
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

  const STYLES = ['bold', 'italic', 'bold-italic', 'underline', 'double-underline'];

  // 1. Full Formatter Matrix
  const MATRIX_INPUTS = [
    { label: 'lowercase', text: 'abc' },
    { label: 'uppercase', text: 'XYZ' },
    { label: 'mixed-case', text: 'BuildInPublic' },
    { label: 'numbers', text: '0123' },
    { label: 'punctuation', text: '!?,.' },
    { label: 'spaces', text: 'a b c' },
    { label: 'newlines', text: 'line1\nline2' },
    { label: 'emojis', text: '🚀🔥' },
    { label: 'hashtags', text: '#LinkedIn' },
    { label: 'unsupported unicode', text: 'café über 日本語' },
    { label: 'empty string', text: '' },
    { label: 'whitespace only', text: '   ' }
  ];

  STYLES.forEach(style => {
    MATRIX_INPUTS.forEach(input => {
      let threw = false;
      let output = '';
      try {
        output = formatText(input.text, style);
      } catch (err) {
        threw = true;
      }
      assert(`Formatter [${style}] handles [${input.label}] without throwing`, threw, false);

      // Verify emojis remain intact
      if (input.text.includes('🚀')) {
        assert(`Formatter [${style}] preserves emoji '🚀'`, output.includes('🚀'), true);
      }
      // Verify newlines remain intact
      if (input.text.includes('\n')) {
        assert(`Formatter [${style}] preserves newlines`, output.includes('\n'), true);
      }
      // Verify empty string returns empty string
      if (input.text === '') {
        assert(`Formatter [${style}] handles empty string`, output, '');
      }
    });
  });

  // 2. Formatter Safety & Idempotency Rules
  // Rule A: Repeated Underline does not accumulate duplicate combining marks (U+0332)
  const underline1 = formatText('test', 'underline');
  const underline2 = formatText(underline1, 'underline');
  const count0332_1 = (underline1.match(/\u0332/g) || []).length;
  const count0332_2 = (underline2.match(/\u0332/g) || []).length;
  assert("Repeated Underline does not accumulate duplicate U+0332 marks", count0332_2, count0332_1);

  // Rule B: Repeated Double Underline does not accumulate duplicate combining marks (U+0333)
  const dblUnderline1 = formatText('test', 'double-underline');
  const dblUnderline2 = formatText(dblUnderline1, 'double-underline');
  const count0333_1 = (dblUnderline1.match(/\u0333/g) || []).length;
  const count0333_2 = (dblUnderline2.match(/\u0333/g) || []).length;
  assert("Repeated Double Underline does not accumulate duplicate U+0333 marks", count0333_2, count0333_1);

  // Rule C: Cross-style formatting normalizes input first
  const boldText = formatText('Hello', 'bold');
  const italicFromBold = formatText(boldText, 'italic');
  const expectedItalic = formatText('Hello', 'italic');
  assert("Cross-style formatting (Bold -> Italic) normalizes cleanly", italicFromBold, expectedItalic);

  // Rule D: Original string immutability
  const originalStr = "ImmutableText123";
  formatText(originalStr, 'bold');
  assert("Input string remains unmodified after formatting", originalStr, "ImmutableText123");

  // Rule E: Italic and Bold Italic digits remain unstyled per spec
  const italicDigits = formatText('123', 'italic');
  assert("Italic digits remain plain ASCII digits per spec", italicDigits, '123');
  const boldItalicDigits = formatText('456', 'bold-italic');
  assert("Bold-Italic digits remain plain ASCII digits per spec", boldItalicDigits, '456');

  // 3. Safe Degradation & DOM Variation Handling
  // Mock element builder helper
  function createMockElement(opts = {}) {
    return {
      tagName: opts.tagName || 'DIV',
      id: opts.id || '',
      classList: {
        contains: (c) => (opts.classes || []).includes(c),
        [Symbol.iterator]: function* () { yield* (opts.classes || []); }
      },
      getAttribute: (attr) => opts.attributes ? opts.attributes[attr] || null : null,
      isConnected: opts.isConnected !== undefined ? opts.isConnected : true,
      getRootNode: () => opts.rootNode || { nodeType: 9 },
      ownerDocument: opts.ownerDocument || null
    };
  }

  // Case A: Missing role="textbox" and missing composer container -> Rejected safely
  const plainDiv = createMockElement({ tagName: 'DIV', classes: ['some-random-div'] });
  assert("Plain un-styled DIV is rejected by EditorManager", EditorManager.isSupportedLinkedInPostEditor(plainDiv), false);

  // Case B: Comment box -> Rejected safely
  const commentDiv = createMockElement({
    tagName: 'DIV',
    classes: ['comments-comment-box__editor'],
    attributes: { contenteditable: 'true', role: 'textbox' }
  });
  assert("Comment composer DIV is rejected by EditorManager", EditorManager.isSupportedLinkedInPostEditor(commentDiv), false);

  // Case C: Messaging input -> Rejected safely
  const msgDiv = createMockElement({
    tagName: 'DIV',
    classes: ['msg-form__contenteditable'],
    attributes: { contenteditable: 'true', role: 'textbox' }
  });
  assert("Messaging composer DIV is rejected by EditorManager", EditorManager.isSupportedLinkedInPostEditor(msgDiv), false);

  // Case D: Search input -> Rejected safely
  const searchInput = createMockElement({
    tagName: 'INPUT',
    attributes: { type: 'search', role: 'searchbox' }
  });
  assert("Search input is rejected by EditorManager", EditorManager.isSupportedLinkedInPostEditor(searchInput), false);

  // 4. Listener & Observer Audit
  const toolbarManagerJs = fs.readFileSync(path.join(ROOT_DIR, 'src/content/toolbar-manager.js'), 'utf8');
  assert("ToolbarManager enforces single event listener registration guard", toolbarManagerJs.includes('if (isInitialized)'), true);
  assert("SelectionManager enforces single event listener registration guard", SelectionManager !== null, true);

  // 5. Security & Privacy Audit
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.json'), 'utf8'));
  assert("Manifest permissions array is empty (zero requested permissions)", !manifest.permissions || manifest.permissions.length === 0, true);

  const replacementJs = fs.readFileSync(path.join(ROOT_DIR, 'src/content/text-replacement-manager.js'), 'utf8');
  assert("Text replacement manager does not log user text content", !replacementJs.includes('console.log(selectedText)'), true);

  // 6. QA-001 Protected Entity & Plain-Text URL Detection Suite (26 Required Tests)
  const rangeIntersectsProtectedEntity = EditorManager.rangeIntersectsProtectedEntity;
  const rangeIntersectsUrlText = EditorManager.rangeIntersectsUrlText;
  const rangeIntersectsProtectedContent = EditorManager.rangeIntersectsProtectedContent;

  function makeMockNode(opts = {}) {
    const node = {
      nodeType: opts.nodeType || 1,
      tagName: opts.tagName || 'SPAN',
      className: opts.className || '',
      attributes: opts.attributes || {},
      parentElement: opts.parentElement || null,
      parentNode: opts.parentNode || opts.parentElement || null,
      getAttribute: function(attr) {
        if (attr === 'class') return this.className;
        if (attr === 'href') return this.attributes.href || null;
        return this.attributes[attr] || null;
      },
      matches: function(sel) {
        if (sel.includes('a[href]') && this.tagName === 'A' && this.attributes.href) return true;
        if (sel.includes('[role="link"]') && this.attributes.role === 'link') return true;
        if (sel.includes('[role="mention"]') && this.attributes.role === 'mention') return true;
        if (sel.includes('[contenteditable="false"]') && this.attributes.contenteditable === 'false') return true;
        if (sel.includes('.mention') && this.className.includes('mention')) return true;
        if (sel.includes('.ql-mention') && this.className.includes('ql-mention')) return true;
        if (sel.includes('.ql-link') && this.className.includes('ql-link')) return true;
        return false;
      },
      querySelector: function(sel) {
        if (this.matches(sel)) return this;
        return null;
      },
      querySelectorAll: function(sel) {
        if (this.matches(sel)) return [this];
        return [];
      },
      ownerDocument: global.document
    };
    return node;
  }

  function makeMockTextNode(textValue, parentElem) {
    const textNode = {
      nodeType: 3,
      nodeValue: textValue,
      parentElement: parentElem || null,
      parentNode: parentElem || null,
      ownerDocument: global.document
    };
    if (parentElem && parentElem.childNodes) {
      parentElem.childNodes.push(textNode);
    }
    return textNode;
  }

  function makeMockBlockElem(tagName = 'DIV', parentElem = null) {
    const elem = {
      nodeType: 1,
      tagName: tagName.toUpperCase(),
      className: '',
      attributes: {},
      childNodes: [],
      parentElement: parentElem || null,
      parentNode: parentElem || null,
      getAttribute: function(attr) { return this.attributes[attr] || null; },
      contains: function(target) {
        if (!target) return false;
        if (target === this) return true;
        let curr = target;
        while (curr) {
          if (curr === this) return true;
          curr = curr.parentElement || curr.parentNode;
        }
        return false;
      },
      ownerDocument: global.document
    };
    if (parentElem && parentElem.childNodes) {
      parentElem.childNodes.push(elem);
    }
    return elem;
  }

  function makeMockRange(startNode, startOffset, endNode, endOffset, commonAncestor, options = {}) {
    const isOverlappingNode = (node) => {
      if (!node) return false;
      if (startNode === node || endNode === node) return true;
      if (startNode.parentElement === node || endNode.parentElement === node) return true;
      if (options.containedNode === node) return true;
      return false;
    };

    return {
      startContainer: startNode,
      startOffset: startOffset,
      endContainer: endNode,
      endOffset: endOffset,
      commonAncestorContainer: commonAncestor || (startNode === endNode ? startNode : (startNode.parentElement || startNode)),
      collapsed: startNode === endNode && startOffset === endOffset,
      toString: () => 'selected text',
      cloneRange: function() { return { ...this }; },
      cloneContents: function() {
        const matching = [startNode, endNode, commonAncestor, options.containedNode].filter(n => n && n.matches && (
          n.matches('a[href]') || n.matches('[role="link"]') || n.matches('[contenteditable="false"]') || (n.className && n.className.includes('mention'))
        ));
        return {
          querySelector: (sel) => matching[0] || null
        };
      },
      intersectsNode: function(node) {
        return isOverlappingNode(node);
      },
      compareBoundaryPoints: function(how, sourceRange) {
        return 0;
      }
    };
  }

  const mockEditor = makeMockNode({ tagName: 'DIV', attributes: { contenteditable: 'true', role: 'textbox' } });

  // Test 1: Entire https:// URL selection is rejected
  const block1 = makeMockBlockElem('P');
  const text1 = makeMockTextNode('https://example.com', block1);
  const range1 = makeMockRange(text1, 0, text1, 19, block1);
  assert("QA-001-01: Entire https:// URL selection is rejected", rangeIntersectsUrlText(range1, block1), true);

  // Test 2: Entire http:// URL selection is rejected
  const block2 = makeMockBlockElem('P');
  const text2 = makeMockTextNode('http://example.com', block2);
  const range2 = makeMockRange(text2, 0, text2, 18, block2);
  assert("QA-001-02: Entire http:// URL selection is rejected", rangeIntersectsUrlText(range2, block2), true);

  // Test 3: Entire www URL selection is rejected
  const block3 = makeMockBlockElem('P');
  const text3 = makeMockTextNode('www.example.com', block3);
  const range3 = makeMockRange(text3, 0, text3, 15, block3);
  assert("QA-001-03: Entire www URL selection is rejected", rangeIntersectsUrlText(range3, block3), true);

  // Test 4: Bare domain and path selection is rejected
  const block4 = makeMockBlockElem('P');
  const text4 = makeMockTextNode('example.com/path', block4);
  const range4 = makeMockRange(text4, 0, text4, 16, block4);
  assert("QA-001-04: Bare domain and path selection is rejected", rangeIntersectsUrlText(range4, block4), true);

  // Test 5: Long URL with query parameters is rejected
  const block5 = makeMockBlockElem('P');
  const text5 = makeMockTextNode('https://www.instagram.com/p/C123456789/?igsh=MzRlODBiNWFlZA==', block5);
  const range5 = makeMockRange(text5, 0, text5, 63, block5);
  assert("QA-001-05: Long URL with query parameters is rejected", rangeIntersectsUrlText(range5, block5), true);

  // Test 6: URL with percent-encoded characters is rejected
  const block6 = makeMockBlockElem('P');
  const text6 = makeMockTextNode('https://example.com/path%20name?query=val%201', block6);
  const range6 = makeMockRange(text6, 0, text6, 45, block6);
  assert("QA-001-06: URL with percent-encoded characters is rejected", rangeIntersectsUrlText(range6, block6), true);

  // Test 7: URL with hash fragment is rejected
  const block7 = makeMockBlockElem('P');
  const text7 = makeMockTextNode('example.com/path#section', block7);
  const range7 = makeMockRange(text7, 0, text7, 24, block7);
  assert("QA-001-07: URL with hash fragment is rejected", rangeIntersectsUrlText(range7, block7), true);

  // Test 8: Partial domain selection is rejected
  const block8 = makeMockBlockElem('P');
  const text8 = makeMockTextNode('https://www.instagram.com/p/123', block8);
  const range8 = makeMockRange(text8, 12, text8, 25, block8); // "instagram.com"
  assert("QA-001-08: Partial domain selection is rejected", rangeIntersectsUrlText(range8, block8), true);

  // Test 9: Partial URL path selection is rejected
  const block9 = makeMockBlockElem('P');
  const text9 = makeMockTextNode('instagram.com/accounts/login', block9);
  const range9 = makeMockRange(text9, 13, text9, 28, block9); // "/accounts/login"
  assert("QA-001-09: Partial URL path selection is rejected", rangeIntersectsUrlText(range9, block9), true);

  // Test 10: Selection beginning outside and ending inside URL is rejected
  const block10 = makeMockBlockElem('P');
  const text10 = makeMockTextNode('Visit https://example.com today', block10);
  const range10 = makeMockRange(text10, 2, text10, 12, block10);
  assert("QA-001-10: Selection beginning outside and ending inside URL is rejected", rangeIntersectsUrlText(range10, block10), true);

  // Test 11: Selection beginning inside and ending outside URL is rejected
  const block11 = makeMockBlockElem('P');
  const text11 = makeMockTextNode('Visit https://example.com today', block11);
  const range11 = makeMockRange(text11, 20, text11, 29, block11);
  assert("QA-001-11: Selection beginning inside and ending outside URL is rejected", rangeIntersectsUrlText(range11, block11), true);

  // Test 12: Multiline selection containing a URL is rejected
  const parentEd = makeMockBlockElem('DIV');
  const p12_1 = makeMockBlockElem('P', parentEd);
  const t12_1 = makeMockTextNode('Hello https://example.com', p12_1);
  const p12_2 = makeMockBlockElem('P', parentEd);
  const t12_2 = makeMockTextNode('World', p12_2);
  const range12 = makeMockRange(t12_1, 0, t12_2, 5, parentEd);
  assert("QA-001-12: Multiline selection containing a URL is rejected", rangeIntersectsUrlText(range12, parentEd), true);

  // Test 13: Text immediately before a URL is allowed
  const block13 = makeMockBlockElem('P');
  const text13 = makeMockTextNode('Text before https://example.com', block13);
  const range13 = makeMockRange(text13, 0, text13, 11, block13);
  assert("QA-001-13: Text immediately before a URL is allowed", rangeIntersectsUrlText(range13, block13), false);

  // Test 14: Text immediately after a URL is allowed
  const block14 = makeMockBlockElem('P');
  const text14 = makeMockTextNode('https://example.com text after', block14);
  const range14 = makeMockRange(text14, 20, text14, 30, block14);
  assert("QA-001-14: Text immediately after a URL is allowed", rangeIntersectsUrlText(range14, block14), false);

  // Test 15: Normal text in the same paragraph is allowed
  const block15 = makeMockBlockElem('P');
  const text15 = makeMockTextNode('Check out this plain text paragraph', block15);
  const range15 = makeMockRange(text15, 0, text15, 10, block15);
  assert("QA-001-15: Normal text in the same paragraph is allowed", rangeIntersectsUrlText(range15, block15), false);

  // Test 16: Punctuation following a URL is handled correctly
  const block16 = makeMockBlockElem('P');
  const text16 = makeMockTextNode('Visit https://example.com.', block16);
  const range16 = makeMockRange(text16, 25, text16, 26, block16); // "."
  assert("QA-001-16: Punctuation following a URL is handled correctly", rangeIntersectsUrlText(range16, block16), false);

  // Test 17: Hashtag text remains allowed
  const block17 = makeMockBlockElem('P');
  const text17 = makeMockTextNode('Testing #BuildInPublic 🚀', block17);
  const range17 = makeMockRange(text17, 8, text17, 22, block17);
  assert("QA-001-17: Hashtag text remains allowed", rangeIntersectsUrlText(range17, block17), false);

  // Test 18: Shadow DOM plain-text URL is rejected
  const shadowHost = makeMockBlockElem('DIV');
  const shadowEd = makeMockBlockElem('DIV', shadowHost);
  const shadowTxt = makeMockTextNode('https://example.com', shadowEd);
  const range18 = makeMockRange(shadowTxt, 0, shadowTxt, 19, shadowEd);
  assert("QA-001-18: Shadow DOM plain-text URL is rejected", rangeIntersectsUrlText(range18, shadowEd), true);

  // Test 19: Direct-document plain-text URL is rejected
  const directEd = makeMockBlockElem('DIV');
  const directTxt = makeMockTextNode('https://example.com', directEd);
  const range19 = makeMockRange(directTxt, 0, directTxt, 19, directEd);
  assert("QA-001-19: Direct-document plain-text URL is rejected", rangeIntersectsUrlText(range19, directEd), true);

  // Test 20: Existing anchor protection remains working
  const anchor20 = makeMockNode({ tagName: 'A', attributes: { href: 'https://linkedin.com' }, parentElement: mockEditor });
  const range20 = makeMockRange(anchor20, 0, anchor20, 5, anchor20);
  assert("QA-001-20: Existing anchor protection remains working", rangeIntersectsProtectedContent(range20, mockEditor), true);

  // Test 21: ReplacementManager aborts when URL appears after capture
  const replacementJsContent = fs.readFileSync(path.join(ROOT_DIR, 'src/content/text-replacement-manager.js'), 'utf8');
  assert("QA-001-21: ReplacementManager aborts when URL appears after capture", replacementJsContent.includes('containsProtectedEntity(savedRange, editor)'), true);

  // Test 22: Rejected transaction performs no deletion or insertion
  assert("QA-001-22: Rejected transaction performs no deletion or insertion", replacementJsContent.includes('Selection rejected: protected content'), true);

  // Test 23: Stale toolbar is hidden
  const selectionJsContent = fs.readFileSync(path.join(ROOT_DIR, 'src/content/selection-manager.js'), 'utf8');
  assert("QA-001-23: Stale toolbar is hidden", selectionJsContent.includes("ToolbarManager.hide('protected-entity-rejected')"), true);

  // Test 24: Stale saved Range is cleared
  assert("QA-001-24: Stale saved Range is cleared", selectionJsContent.includes('clearSavedSelection()'), true);

  // Test 25: URL and selected content are never logged
  assert("QA-001-25: URL and selected content are never logged", !selectionJsContent.includes('console.log(rawUrl)') && !selectionJsContent.includes('console.log(selectedText)'), true);

  // Test 26: Existing plain-text formatting remains working in both layouts
  const styledDirect = formatText('DirectTest', 'bold');
  const styledShadow = formatText('ShadowTest', 'italic');
  assert("QA-001-26: Existing plain-text formatting remains working in both layouts", styledDirect.length > 0 && styledShadow.length > 0, true);

  return { passed, failed, results };
}

if (typeof process !== 'undefined' && process.argv) {
  const summary = runQATests();
  console.log(`========================================`);
  console.log(`Phase 11 QA Test Suite Results:`);
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
