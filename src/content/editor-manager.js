/**
 * editor-manager.js
 *
 * Identifies and interacts with supported LinkedIn post editor elements across:
 * - Layout A: Direct-document editor (/sharing/compose or modal dialogs)
 * - Layout B: Open Shadow DOM editor (DIV.ql-editor inside DIV#interop-outlet host)
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  /**
   * Helper: Resolves the composed parent of a DOM node.
   * Walks parentElement, parentNode, or ShadowRoot.host when at a ShadowRoot boundary.
   */
  function getComposedParent(node) {
    if (!node) return null;
    if (node.parentElement) {
      return node.parentElement;
    }
    if (node.parentNode) {
      if (node.parentNode.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE / ShadowRoot */ && node.parentNode.host) {
        return node.parentNode.host;
      }
      if (node.parentNode.nodeType === 1 /* ELEMENT_NODE */) {
        return node.parentNode;
      }
    }
    return null;
  }

  /**
   * Helper: Traverses up the composed DOM tree matching a selector or predicate function.
   * Crosses open ShadowRoot boundaries safely without infinite loops.
   */
  function composedClosest(node, predicateOrSelector) {
    if (!node) return null;
    let current = node.nodeType === Node.TEXT_NODE ? getComposedParent(node) : node;
    const isFn = typeof predicateOrSelector === 'function';
    let depth = 0;
    const maxDepth = 100; // Guard against infinite traversal

    while (current && depth < maxDepth) {
      depth++;
      if (isFn) {
        if (predicateOrSelector(current)) return current;
      } else if (typeof predicateOrSelector === 'string') {
        if (current.matches && current.matches(predicateOrSelector)) return current;
      }
      current = getComposedParent(current);
    }
    return null;
  }

  /**
   * Helper: Resolves an editable root element by inspecting event.composedPath().
   * Handles retargeted event targets in open Shadow DOM structures.
   */
  function resolveEditableFromComposedPath(event) {
    if (!event || typeof event.composedPath !== 'function') return null;
    try {
      const path = event.composedPath();
      for (let i = 0; i < path.length; i++) {
        const node = path[i];
        if (node && node.nodeType === 1 && node.getAttribute) {
          const tagName = node.tagName ? node.tagName.toLowerCase() : '';
          if (tagName === 'input' || tagName === 'textarea') {
            continue;
          }
          if (node.getAttribute('contenteditable') === 'true' || node.getAttribute('role') === 'textbox') {
            return resolveToEditableRoot(node);
          }
        }
      }
    } catch (err) {
      // Safe fallback
    }
    return null;
  }

  /**
   * Resolve a DOM node to its nearest editable root element using composed DOM traversal.
   */
  function resolveToEditableRoot(node) {
    if (!node) return null;
    return composedClosest(node, (el) => {
      if (!el || !el.getAttribute) return false;
      const tagName = el.tagName ? el.tagName.toLowerCase() : '';
      if (tagName === 'input' || tagName === 'textarea') return false;
      return el.getAttribute('contenteditable') === 'true';
    });
  }

  /**
   * Determine whether an element is editable (general helper).
   */
  function isEditable(element) {
    if (!element) return false;
    const tagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (tagName === 'input' || tagName === 'textarea') {
      return true;
    }
    return element.getAttribute && element.getAttribute('contenteditable') === 'true';
  }

  /**
   * Helper: Exclude CAPTCHA textareas, badge containers, and Quill helper elements (.ql-clipboard).
   */
  function isExcludedControl(element) {
    if (!element) return true;

    // Check ID for recaptcha response textareas
    if (element.id && typeof element.id === 'string' && element.id.startsWith('g-recaptcha-response')) {
      return true;
    }

    // Check for Quill internal clipboard helper
    if (element.classList && element.classList.contains('ql-clipboard')) {
      return true;
    }

    // Check composed ancestors for CAPTCHA or ql-clipboard containers
    const excludedAncestor = composedClosest(element, (el) => {
      if (!el) return false;
      if (el.id && typeof el.id === 'string' && el.id.startsWith('g-recaptcha-response')) {
        return true;
      }
      if (el.classList) {
        if (el.classList.contains('g-recaptcha-badge') || el.classList.contains('ql-clipboard')) {
          return true;
        }
      }
      if (el.getAttribute) {
        const ariaHidden = el.getAttribute('aria-hidden');
        if (ariaHidden === 'true' && el.classList && el.classList.contains('ql-clipboard')) {
          return true;
        }
      }
      return false;
    });

    if (excludedAncestor) {
      return true;
    }

    // Check aria-hidden="true" on element itself if it is a helper control
    if (element.getAttribute && element.getAttribute('aria-hidden') === 'true') {
      return true;
    }

    return false;
  }

  // Helper: check if element is inside search or navigation (localization-safe structural checks)
  function isInsideSearchOrNav(element) {
    return composedClosest(element, (current) => {
      if (current.tagName) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
          const type = current.getAttribute ? current.getAttribute('type') : null;
          if (type === 'search') return true;
        }
      }
      if (current.getAttribute) {
        const role = current.getAttribute('role');
        if (role === 'search' || role === 'searchbox') return true;
      }
      if (current.classList && (
        current.classList.contains('global-nav__search') ||
        current.classList.contains('search-global-typeahead') ||
        current.id === 'global-nav-search'
      )) {
        return true;
      }
      return false;
    }) !== null;
  }

  // Helper: check if element is inside a comment composer (localization-safe structural checks first)
  function isInsideCommentComposer(element) {
    return composedClosest(element, (current) => {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          if (lower.includes('comment') && !lower.includes('post')) {
            return true;
          }
        }
      }
      if (current.getAttribute) {
        const ariaLabel = current.getAttribute('aria-label') || '';
        if (ariaLabel.toLowerCase().includes('comment')) return true;
        const placeholder = current.getAttribute('data-placeholder') || '';
        if (placeholder.toLowerCase().includes('comment')) return true;
      }
      return false;
    }) !== null;
  }

  // Helper: check if element is inside a messaging composer (localization-safe structural checks first)
  function isInsideMessagingComposer(element) {
    return composedClosest(element, (current) => {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          if (
            lower.startsWith('msg-') ||
            lower.includes('messaging') ||
            (lower.includes('message') && !lower.includes('post'))
          ) {
            return true;
          }
        }
      }
      if (current.tagName && current.tagName.toLowerCase() === 'form' && current.classList && current.classList.contains('msg-form')) {
        return true;
      }
      if (current.getAttribute) {
        const ariaLabel = current.getAttribute('aria-label') || '';
        const lowerLabel = ariaLabel.toLowerCase();
        if (lowerLabel.includes('message') || lowerLabel.includes('type a message') || lowerLabel.includes('write a message')) {
          return true;
        }
        const placeholder = current.getAttribute('data-placeholder') || '';
        if (placeholder.toLowerCase().includes('message')) return true;
      }
      return false;
    }) !== null;
  }

  // Helper: check if element is inside an article or newsletter editor
  function isInsideArticleEditor(element) {
    const pathname = window.location ? window.location.pathname : '';
    if (pathname.includes('/pulse') || pathname.includes('/post/new')) {
      return true;
    }
    return composedClosest(element, (current) => {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          if (lower.includes('article-editor') || lower.includes('pulse-editor')) {
            return true;
          }
        }
      }
      return false;
    }) !== null;
  }

  // Helper: find the nearest dialog or composer modal ancestor using composed traversal
  function findDialogAncestor(element) {
    return composedClosest(element, (current) => {
      if (current.getAttribute) {
        const role = current.getAttribute('role');
        if (role === 'dialog') return true;
        const ariaModal = current.getAttribute('aria-modal');
        if (ariaModal === 'true') return true;
      }
      if (current.classList && (
        current.classList.contains('share-creation-state') ||
        current.classList.contains('share-box') ||
        current.classList.contains('share-box-v2')
      )) {
        return true;
      }
      return false;
    });
  }

  // Helper: check if the dialog ancestor is an excluded dialog (settings, filters, profile, etc.)
  function isExcludedDialog(dialogElement) {
    if (!dialogElement) return false;
    if (dialogElement.getAttribute) {
      const ariaLabel = dialogElement.getAttribute('aria-label') || '';
      const lowerLabel = ariaLabel.toLowerCase();
      if (
        lowerLabel.includes('settings') ||
        lowerLabel.includes('filter') ||
        lowerLabel.includes('profile') ||
        lowerLabel.includes('edit intro') ||
        lowerLabel.includes('contact info')
      ) {
        return true;
      }
    }
    return false;
  }

  // Reusable detailed editor check returning { supported, reason, signals }
  function checkEditorSupport(element) {
    if (!element) {
      return { supported: false, reason: 'Element is null or undefined' };
    }

    const initialTagName = element.tagName ? element.tagName.toLowerCase() : '';
    if (initialTagName === 'input' || initialTagName === 'textarea') {
      return { supported: false, reason: 'Inputs and textareas are not supported post editors' };
    }

    if (isExcludedControl(element)) {
      return { supported: false, reason: 'Element is an excluded helper control (Quill clipboard, CAPTCHA, or hidden control)' };
    }

    const root = resolveToEditableRoot(element);
    if (!root) {
      return { supported: false, reason: 'Not a contenteditable element or nested inside one' };
    }

    // 1. Strict Exclusions (must always be checked and rejected first)
    if (isInsideSearchOrNav(root)) {
      return { supported: false, reason: 'Element is inside search or navigation' };
    }

    if (isInsideCommentComposer(root)) {
      return { supported: false, reason: 'Element is inside a comment composer' };
    }

    if (isInsideMessagingComposer(root)) {
      return { supported: false, reason: 'Element is inside a messaging composer' };
    }

    if (isInsideArticleEditor(root)) {
      return { supported: false, reason: 'Element is inside an article or newsletter editor' };
    }

    // 2. Positive Signal Confidence Check (Scored Approach)
    let score = 0;
    const matchedSignals = [];
    const pathname = window.location ? window.location.pathname : '';

    // Signal A: Route-based composer URL (/sharing/compose) combined with role="textbox"
    const isComposeRoute = pathname.startsWith('/sharing/compose');
    if (isComposeRoute) {
      matchedSignals.push('sharing-compose-route');
      if (root.getAttribute && root.getAttribute('role') === 'textbox') {
        matchedSignals.push('role-textbox');
        score += 2;
      }
    }

    // Signal B: Traditional modal dialog container (role="dialog" or class matches)
    const dialogAncestor = findDialogAncestor(root);
    if (dialogAncestor) {
      if (isExcludedDialog(dialogAncestor)) {
        return { supported: false, reason: 'Element is inside an excluded dialog modal (settings, filter, profile)' };
      }
      matchedSignals.push('dialog-ancestor');
      score += 2;
    }

    // Signal C: Verified Open Shadow DOM Editor (Layout B - DIV.ql-editor inside DIV#interop-outlet host)
    const rootNode = root.getRootNode ? root.getRootNode() : null;
    const isShadowRoot = rootNode && rootNode.nodeType === 11;
    const hostElem = isShadowRoot ? rootNode.host : composedClosest(root, (el) => el.id === 'interop-outlet');

    const isQlEditorClass = root.classList && root.classList.contains('ql-editor');
    const hasQlAttr = root.getAttribute && root.getAttribute('data-test-ql-editor-contenteditable') === 'true';

    if ((isShadowRoot || hostElem) && (isQlEditorClass || hasQlAttr)) {
      if (hostElem && (hostElem.id === 'interop-outlet' || (hostElem.classList && hostElem.classList.contains('theme--light')))) {
        matchedSignals.push('shadow-host-interop-outlet');
      }
      matchedSignals.push('shadow-dom-ql-editor');
      if (root.getAttribute && (root.getAttribute('role') === 'textbox' || root.getAttribute('contenteditable') === 'true')) {
        matchedSignals.push('role-textbox');
        score += 2; // Strong signal combination for Layout B Shadow DOM composer
      }
    }

    if (score < 2) {
      return { 
        supported: false, 
        reason: 'Element does not have sufficient post-editor signals (e.g. not inside modal dialog, not on sharing/compose route, and not inside verified Shadow DOM composer)' 
      };
    }

    return { 
      supported: true, 
      reason: isShadowRoot ? 'Supported LinkedIn Shadow DOM post editor (Layout B)' : 'Supported LinkedIn post editor (Layout A)',
      signals: matchedSignals
    };
  }

  // Determine whether an element is a supported LinkedIn post editor (boolean return)
  function isSupportedLinkedInPostEditor(element) {
    return checkEditorSupport(element).supported;
  }

  const PROTECTED_ENTITY_SELECTOR = [
    'a[href]',
    'a',
    '[role="link"]',
    '[role="mention"]',
    '.mention',
    '.entity-mention',
    '.ql-mention',
    '.ql-mention-token',
    '.ql-link',
    '[data-entity-hovercard-id]',
    '[data-mention]',
    '[data-link]',
    '[contenteditable="false"]'
  ].join(', ');

  /**
   * Helper: Checks whether a DOM element matches protected link or mention entity criteria.
   */
  function isProtectedEntityElement(element, editor) {
    if (!element) return false;
    const matchFn = (node) => {
      if (!node || node === editor || !node.getAttribute) return false;
      if (typeof node.matches === 'function') {
        try {
          if (node.matches(PROTECTED_ENTITY_SELECTOR)) return true;
        } catch (e) {
          // Fallback if selector matching fails
        }
      }
      const tagName = node.tagName ? node.tagName.toUpperCase() : '';
      if (tagName === 'A' || node.getAttribute('href') !== null) return true;
      if (node.getAttribute('role') === 'link' || node.getAttribute('role') === 'mention') return true;
      if (node.getAttribute('contenteditable') === 'false') return true;
      if (node.getAttribute('data-entity-hovercard-id') !== null || node.getAttribute('data-mention') !== null) return true;
      const className = typeof node.className === 'string' ? node.className : '';
      if (className.includes('mention') || className.includes('ql-link')) return true;
      return false;
    };

    if (element.nodeType === 3 /* TEXT_NODE */) {
      return composedClosest(element.parentElement, matchFn) !== null;
    }
    return matchFn(element) || composedClosest(element, matchFn) !== null;
  }

  /**
   * Checks if a selection Range intersects any protected entity (link, mention, contenteditable=false)
   * within the supported LinkedIn editor.
   */
  function rangeIntersectsProtectedEntity(range, editor) {
    if (!range) return false;

    // 1. Check boundary containers (startContainer, endContainer, commonAncestorContainer)
    if (range.startContainer && isProtectedEntityElement(range.startContainer, editor)) {
      return true;
    }
    if (range.endContainer && isProtectedEntityElement(range.endContainer, editor)) {
      return true;
    }
    if (range.commonAncestorContainer && isProtectedEntityElement(range.commonAncestorContainer, editor)) {
      return true;
    }

    // 2. Check cloneContents for embedded protected elements
    try {
      if (typeof range.cloneContents === 'function') {
        const fragment = range.cloneContents();
        if (fragment && typeof fragment.querySelector === 'function') {
          if (fragment.querySelector(PROTECTED_ENTITY_SELECTOR)) {
            return true;
          }
        }
      }
    } catch (e) {
      // Ignore clone error
    }

    // 3. Query protected elements within the search scope and check Range intersection
    const commonElem = range.commonAncestorContainer ? (
      range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement
    ) : null;
    const root = editor || (commonElem ? commonElem.ownerDocument : (typeof document !== 'undefined' ? document : null));
    const searchScope = (commonElem && typeof commonElem.querySelectorAll === 'function') ? commonElem : root;

    if (searchScope && typeof searchScope.querySelectorAll === 'function') {
      let candidates = [];
      try {
        candidates = Array.from(searchScope.querySelectorAll(PROTECTED_ENTITY_SELECTOR));
      } catch (e) {
        // Fallback if querySelectorAll fails
      }

      if (commonElem && isProtectedEntityElement(commonElem, editor)) {
        candidates.push(commonElem);
      }

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (!candidate) continue;

        // Check if intersectsNode returns true
        if (typeof range.intersectsNode === 'function') {
          try {
            if (range.intersectsNode(candidate)) {
              return true;
            }
          } catch (e) {
            // Fallback to boundary point comparison
          }
        }

        // Boundary point comparison fallback
        try {
          const ownerDoc = candidate.ownerDocument || (typeof document !== 'undefined' ? document : null);
          if (ownerDoc && typeof ownerDoc.createRange === 'function') {
            const candRange = ownerDoc.createRange();
            candRange.selectNode(candidate);
            const startToEnd = range.compareBoundaryPoints(Range.START_TO_END, candRange);
            const endToStart = range.compareBoundaryPoints(Range.END_TO_START, candRange);
            if (endToStart < 0 && startToEnd > 0) {
              return true;
            }
          }
        } catch (e) {
          // Ignore range comparison failure
        }
      }
    }

    return false;
  }

  /**
   * Helper: Detects all URL character spans in a plain-text string.
   * Returns array of objects: [{ start: number, end: number }]
   */
  function findUrlSpansInText(text) {
    if (!text || typeof text !== 'string') return [];
    const spans = [];

    // Regex matching URLs with http/https schemes, www. prefix, or bare domain + path
    const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'\u00A0()\[\]{}]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|co|me|info|biz|dev|app|ai|ca|uk|us|de|fr|in|br|au|jp|tv|cc|xyz|tech|online|store|site)\/[^\s<>"'\u00A0()\[\]{}]*/gi;

    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      let rawUrl = match[0];
      let start = match.index;
      let end = start + rawUrl.length;

      // Trim trailing sentence punctuation marks
      while (end > start) {
        const lastChar = text.charAt(end - 1);
        if (/[.,!?:;)"'\]}>]/.test(lastChar)) {
          end--;
        } else {
          break;
        }
      }

      if (end > start) {
        spans.push({ start, end });
      }
    }

    return spans;
  }

  /**
   * Helper: Traverses tree under root and collects text nodes in document order.
   */
  function collectTextNodes(root) {
    const nodes = [];
    if (!root) return nodes;

    function traverse(node) {
      if (!node) return;
      if (node.nodeType === 3 /* TEXT_NODE */) {
        nodes.push(node);
      } else if (node.childNodes && node.childNodes.length > 0) {
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i]);
        }
      }
    }

    traverse(root);
    return nodes;
  }

  /**
   * Helper: Calculates cumulative character offset of targetNode + targetOffset within root.
   */
  function getCharOffset(root, targetNode, targetOffset) {
    if (!root || !targetNode) return 0;
    const textNodes = collectTextNodes(root);
    let cumulative = 0;

    for (let i = 0; i < textNodes.length; i++) {
      const tn = textNodes[i];
      if (tn === targetNode) {
        const valLen = tn.nodeValue ? tn.nodeValue.length : 0;
        return cumulative + Math.min(targetOffset, valLen);
      }
      cumulative += tn.nodeValue ? tn.nodeValue.length : 0;
    }

    // Fallback if targetNode is an Element node
    if (targetNode.nodeType === 1 /* ELEMENT_NODE */) {
      let elemOffset = 0;
      const children = Array.from(targetNode.childNodes || []);
      for (let i = 0; i < Math.min(targetOffset, children.length); i++) {
        const childText = collectTextNodes(children[i]);
        for (let j = 0; j < childText.length; j++) {
          elemOffset += childText[j].nodeValue ? childText[j].nodeValue.length : 0;
        }
      }
      let rootElemOffset = 0;
      for (let i = 0; i < textNodes.length; i++) {
        const tn = textNodes[i];
        if (targetNode.contains && targetNode.contains(tn)) {
          return rootElemOffset + elemOffset;
        }
        rootElemOffset += tn.nodeValue ? tn.nodeValue.length : 0;
      }
      return rootElemOffset;
    }

    return cumulative;
  }

  /**
   * Checks if a selection Range overlaps any plain-text URL in its surrounding text block.
   */
  function rangeIntersectsUrlText(range, editor) {
    if (!range) return false;
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    if (!startContainer || !endContainer) return false;

    // Determine nearest common block element scope
    let commonBlock = range.commonAncestorContainer;
    if (commonBlock && commonBlock.nodeType === 3 /* TEXT_NODE */) {
      commonBlock = commonBlock.parentElement;
    }

    const edRoot = editor || (startContainer.ownerDocument ? startContainer.ownerDocument.body : (typeof document !== 'undefined' ? document.body : null));
    if (!commonBlock || (edRoot && edRoot.contains && !edRoot.contains(commonBlock))) {
      commonBlock = edRoot;
    }

    const textNodes = collectTextNodes(commonBlock);
    if (textNodes.length === 0) return false;

    let fullText = '';
    for (let i = 0; i < textNodes.length; i++) {
      fullText += (textNodes[i].nodeValue || '');
    }

    if (!fullText) return false;

    const urlSpans = findUrlSpansInText(fullText);
    if (urlSpans.length === 0) return false;

    const selStart = getCharOffset(commonBlock, startContainer, range.startOffset);
    const selEnd = getCharOffset(commonBlock, endContainer, range.endOffset);

    const realSelStart = Math.min(selStart, selEnd);
    const realSelEnd = Math.max(selStart, selEnd);

    for (let i = 0; i < urlSpans.length; i++) {
      const span = urlSpans[i];
      if (realSelStart < span.end && realSelEnd > span.start) {
        return true;
      }
    }

    return false;
  }

  /**
   * Combined protection check: returns true if selection intersects either a protected DOM entity or a plain-text URL.
   */
  function rangeIntersectsProtectedContent(range, editor) {
    if (!range) return false;
    return rangeIntersectsProtectedEntity(range, editor) || rangeIntersectsUrlText(range, editor);
  }

  // Export functions to the namespace
  window.LinkedInTextFormatter.getComposedParent = getComposedParent;
  window.LinkedInTextFormatter.composedClosest = composedClosest;
  window.LinkedInTextFormatter.resolveEditableFromComposedPath = resolveEditableFromComposedPath;
  window.LinkedInTextFormatter.resolveToEditableRoot = resolveToEditableRoot;
  window.LinkedInTextFormatter.isEditable = isEditable;
  window.LinkedInTextFormatter.isExcludedControl = isExcludedControl;
  window.LinkedInTextFormatter.checkEditorSupport = checkEditorSupport;
  window.LinkedInTextFormatter.isSupportedLinkedInPostEditor = isSupportedLinkedInPostEditor;
  window.LinkedInTextFormatter.isProtectedEntityElement = isProtectedEntityElement;
  window.LinkedInTextFormatter.rangeIntersectsProtectedEntity = rangeIntersectsProtectedEntity;
  window.LinkedInTextFormatter.findUrlSpansInText = findUrlSpansInText;
  window.LinkedInTextFormatter.rangeIntersectsUrlText = rangeIntersectsUrlText;
  window.LinkedInTextFormatter.rangeIntersectsProtectedContent = rangeIntersectsProtectedContent;

  // For testing in Node context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      getComposedParent,
      composedClosest,
      resolveEditableFromComposedPath,
      resolveToEditableRoot,
      isEditable,
      isExcludedControl,
      checkEditorSupport,
      isSupportedLinkedInPostEditor,
      isProtectedEntityElement,
      rangeIntersectsProtectedEntity,
      findUrlSpansInText,
      rangeIntersectsUrlText,
      rangeIntersectsProtectedContent
    };
  }
})();
