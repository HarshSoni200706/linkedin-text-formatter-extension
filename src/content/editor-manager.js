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

  // Export functions to the namespace
  window.LinkedInTextFormatter.getComposedParent = getComposedParent;
  window.LinkedInTextFormatter.composedClosest = composedClosest;
  window.LinkedInTextFormatter.resolveEditableFromComposedPath = resolveEditableFromComposedPath;
  window.LinkedInTextFormatter.resolveToEditableRoot = resolveToEditableRoot;
  window.LinkedInTextFormatter.isEditable = isEditable;
  window.LinkedInTextFormatter.isExcludedControl = isExcludedControl;
  window.LinkedInTextFormatter.checkEditorSupport = checkEditorSupport;
  window.LinkedInTextFormatter.isSupportedLinkedInPostEditor = isSupportedLinkedInPostEditor;

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
      isSupportedLinkedInPostEditor
    };
  }
})();
