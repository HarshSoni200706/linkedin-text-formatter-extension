/**
 * editor-manager.js
 *
 * Identifies and interacts with supported LinkedIn post editor elements.
 * Responsible for checking contenteditable containers and executing safe text replacements.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  // Resolve a DOM node to its nearest editable root
  function resolveToEditableRoot(node) {
    if (!node) return null;
    let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (element) {
      if (element.getAttribute && element.getAttribute('contenteditable') === 'true') {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  // Determine whether an element is editable (general helper)
  function isEditable(element) {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return true;
    }
    return element.getAttribute && element.getAttribute('contenteditable') === 'true';
  }

  // Helper: check if element is inside search or navigation (localization-safe structural checks)
  function isInsideSearchOrNav(element) {
    let current = element;
    while (current) {
      // 1. Primary Check: HTML5 element types & ARIA roles
      if (current.tagName) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
          const type = current.getAttribute ? current.getAttribute('type') : null;
          if (type === 'search') {
            return true;
          }
        }
      }
      if (current.getAttribute) {
        const role = current.getAttribute('role');
        if (role === 'search' || role === 'searchbox') {
          return true;
        }
      }
      // 2. Primary Check: Class names & IDs (constant across locales)
      if (current.classList && (
        current.classList.contains('global-nav__search') ||
        current.classList.contains('search-global-typeahead') ||
        current.id === 'global-nav-search'
      )) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  // Helper: check if element is inside a comment composer (localization-safe structural checks first)
  function isInsideCommentComposer(element) {
    // 1. Primary Structural Check: Ancestor class names (CSS classes do not translate with localization)
    let current = element;
    while (current) {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          // Match comments-comment-box, comments-comment-texteditor, comment-box, etc.
          if (lower.includes('comment') && !lower.includes('post')) {
            return true;
          }
        }
      }
      current = current.parentElement;
    }

    // 2. Secondary Fallback Check: English user-facing labels/placeholders (may fail on localized versions)
    if (element.getAttribute) {
      const ariaLabel = element.getAttribute('aria-label') || '';
      if (ariaLabel.toLowerCase().includes('comment')) {
        return true;
      }
      const placeholder = element.getAttribute('data-placeholder') || '';
      if (placeholder.toLowerCase().includes('comment')) {
        return true;
      }
    }

    return false;
  }

  // Helper: check if element is inside a messaging composer (localization-safe structural checks first)
  function isInsideMessagingComposer(element) {
    // 1. Primary Structural Check: Ancestor class names & IDs (do not translate with localization)
    let current = element;
    while (current) {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          // Match msg-form, msg-composer, msg-overlay-bubble, etc.
          if (
            lower.startsWith('msg-') ||
            lower.includes('messaging') ||
            (lower.includes('message') && !lower.includes('post'))
          ) {
            return true;
          }
        }
      }
      // Check for common message form tags
      if (current.tagName && current.tagName.toLowerCase() === 'form' && current.classList && current.classList.contains('msg-form')) {
        return true;
      }
      current = current.parentElement;
    }

    // 2. Secondary Fallback Check: English user-facing labels/placeholders (may fail on localized versions)
    if (element.getAttribute) {
      const ariaLabel = element.getAttribute('aria-label') || '';
      const lowerLabel = ariaLabel.toLowerCase();
      if (lowerLabel.includes('message') || lowerLabel.includes('type a message') || lowerLabel.includes('write a message')) {
        return true;
      }
      const placeholder = element.getAttribute('data-placeholder') || '';
      if (placeholder.toLowerCase().includes('message')) {
        return true;
      }
    }

    return false;
  }

  // Helper: check if element is inside an article or newsletter editor
  function isInsideArticleEditor(element) {
    if (window.location.pathname.includes('/pulse') || window.location.pathname.includes('/post/new')) {
      return true;
    }
    let current = element;
    while (current) {
      if (current.classList) {
        for (const className of current.classList) {
          const lower = className.toLowerCase();
          if (lower.includes('article-editor') || lower.includes('pulse-editor')) {
            return true;
          }
        }
      }
      current = current.parentElement;
    }
    return false;
  }

  // Helper: find the nearest dialog or composer modal ancestor
  function findDialogAncestor(element) {
    let current = element.parentElement;
    while (current) {
      if (current.getAttribute) {
        const role = current.getAttribute('role');
        if (role === 'dialog') {
          return current;
        }
        const ariaModal = current.getAttribute('aria-modal');
        if (ariaModal === 'true') {
          return current;
        }
      }
      if (current.classList && (
        current.classList.contains('share-creation-state') ||
        current.classList.contains('share-box') ||
        current.classList.contains('share-box-v2')
      )) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
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

  // Reusable detailed editor check returning { supported, reason }
  function checkEditorSupport(element) {
    if (!element) {
      return { supported: false, reason: 'Element is null or undefined' };
    }

    const root = resolveToEditableRoot(element);
    if (!root) {
      return { supported: false, reason: 'Not a contenteditable element or nested inside one' };
    }

    const tagName = root.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') {
      return { supported: false, reason: 'Inputs and textareas are not supported post editors' };
    }

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

    const dialogAncestor = findDialogAncestor(root);
    if (!dialogAncestor) {
      return { supported: false, reason: 'Element is not inside a post editor dialog modal' };
    }

    if (isExcludedDialog(dialogAncestor)) {
      return { supported: false, reason: 'Element is inside an excluded dialog modal (settings, filter, profile)' };
    }

    return { supported: true, reason: 'Supported LinkedIn post editor' };
  }

  // Determine whether an element is a supported LinkedIn post editor (boolean return)
  function isSupportedLinkedInPostEditor(element) {
    return checkEditorSupport(element).supported;
  }

  // Export functions to the namespace
  window.LinkedInTextFormatter.resolveToEditableRoot = resolveToEditableRoot;
  window.LinkedInTextFormatter.isEditable = isEditable;
  window.LinkedInTextFormatter.checkEditorSupport = checkEditorSupport;
  window.LinkedInTextFormatter.isSupportedLinkedInPostEditor = isSupportedLinkedInPostEditor;

  // For testing in Node context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      resolveToEditableRoot,
      isEditable,
      checkEditorSupport,
      isSupportedLinkedInPostEditor
    };
  }
})();
