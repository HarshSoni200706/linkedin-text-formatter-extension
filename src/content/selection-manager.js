/**
 * selection-manager.js
 *
 * Listens for user text selections within the LinkedIn editor.
 * Responsible for detecting, storing, and validating selection ranges across mouse and keyboard events.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  // Selection state
  const state = {
    savedRange: null,
    editor: null,
    direction: 'forward',
    isProtected: false
  };

  // Subscriptions callbacks
  const validCallbacks = [];
  const invalidCallbacks = [];

  let rAFId = null;

  // Helper to determine selection direction
  function getSelectionDirection(selection) {
    if (!selection || !selection.anchorNode || !selection.focusNode) {
      return 'forward';
    }
    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;
    
    if (anchorNode === focusNode) {
      return selection.focusOffset < selection.anchorOffset ? 'backward' : 'forward';
    }
    
    // Compare DOM positions
    const position = anchorNode.compareDocumentPosition(focusNode);
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 'backward';
    }
    return 'forward';
  }

  /**
   * Check if an element or event path belongs to the extension toolbar or controls.
   * Supports event.composedPath(), element.closest(), and DOM ancestor traversal.
   */
  function isExtensionElement(element, event) {
    if (event && typeof event.composedPath === 'function') {
      try {
        const path = event.composedPath();
        for (let i = 0; i < path.length; i++) {
          const node = path[i];
          if (node && node.getAttribute) {
            if (
              node.getAttribute('data-linkedin-text-formatter') === 'true' ||
              node.id === 'ltf-floating-toolbar'
            ) {
              return true;
            }
          }
        }
      } catch (err) {
        // Ignore composedPath errors and fallback
      }
    }

    if (!element) return false;

    if (typeof element.closest === 'function') {
      try {
        const match = element.closest('[data-linkedin-text-formatter="true"], #ltf-floating-toolbar');
        if (match) return true;
      } catch (err) {
        // Fallback to loop
      }
    }

    let current = element;
    while (current) {
      if (
        (current.getAttribute && current.getAttribute('data-linkedin-text-formatter') === 'true') ||
        current.id === 'ltf-floating-toolbar'
      ) {
        return true;
      }
      current = current.parentElement || current.parentNode;
    }

    return false;
  }

  // Check if the saved range is still valid and connected
  function isSavedRangeValid() {
    if (!state.savedRange || !state.editor) {
      return false;
    }
    
    const range = state.savedRange;
    const editor = state.editor;
    
    // Check if the editor is still connected to the DOM
    if (!document.body.contains(editor)) {
      return false;
    }
    
    // Check if boundaries are connected
    if (!document.body.contains(range.startContainer) || !document.body.contains(range.endContainer)) {
      return false;
    }
    
    // Resolve boundaries and verify they belong to the saved editor
    const resolver = window.LinkedInTextFormatter.resolveToEditableRoot;
    if (!resolver) {
      return false;
    }
    
    if (resolver(range.startContainer) !== editor || resolver(range.endContainer) !== editor) {
      return false;
    }
    
    // Check if the editor is still a supported post editor
    const detector = window.LinkedInTextFormatter.isSupportedLinkedInPostEditor;
    if (detector && !detector(editor)) {
      return false;
    }
    
    return true;
  }

  // Clear saved range
  function clearSavedSelection() {
    if (state.savedRange || state.editor) {
      state.savedRange = null;
      state.editor = null;
      state.direction = 'forward';
      console.log('[LinkedIn Text Formatter] Saved selection cleared.');
      notifyInvalid();
    }
  }

  // Restore the saved range in the editor
  function restoreSavedSelection() {
    if (!isSavedRangeValid()) {
      clearSavedSelection();
      console.log('[LinkedIn Text Formatter] Saved selection restoration failed: range is stale or invalid.');
      return false;
    }

    try {
      const selection = window.getSelection();
      if (!selection) return false;

      // Focus the editor first to ensure focus is in the right place
      if (state.editor && typeof state.editor.focus === 'function') {
        state.editor.focus();
      }

      selection.removeAllRanges();

      if (state.direction === 'backward' && typeof selection.extend === 'function') {
        selection.collapse(state.savedRange.endContainer, state.savedRange.endOffset);
        selection.extend(state.savedRange.startContainer, state.savedRange.startOffset);
      } else {
        selection.addRange(state.savedRange);
      }

      console.log('[LinkedIn Text Formatter] Saved selection restoration succeeded.');
      return true;
    } catch (err) {
      console.error('[LinkedIn Text Formatter] Error restoring selection:', err);
      return false;
    }
  }

  // Evaluate the current selection inside the DOM
  function evaluateSelection() {
    if (state.isProtected) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      clearSavedSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Ignore collapsed/empty/whitespace-only ranges
    if (range.collapsed || !range.toString() || range.toString().trim() === '') {
      clearSavedSelection();
      return;
    }

    const resolver = window.LinkedInTextFormatter.resolveToEditableRoot;
    const detector = window.LinkedInTextFormatter.isSupportedLinkedInPostEditor;
    if (!resolver || !detector) {
      clearSavedSelection();
      return;
    }

    const startRoot = resolver(range.startContainer);
    const endRoot = resolver(range.endContainer);

    // Boundaries must resolve to the same editor element
    if (!startRoot || startRoot !== endRoot) {
      clearSavedSelection();
      return;
    }

    // Editor must be supported
    if (!detector(startRoot)) {
      clearSavedSelection();
      return;
    }

    // Save selection cloned range and details
    state.savedRange = range.cloneRange();
    state.editor = startRoot;
    state.direction = getSelectionDirection(selection);

    console.log('[LinkedIn Text Formatter] Valid selection captured.');
    notifyValid();
  }

  // Debounced event handler using requestAnimationFrame
  function handleSelectionChange() {
    if (rAFId) {
      cancelAnimationFrame(rAFId);
    }
    rAFId = requestAnimationFrame(() => {
      evaluateSelection();
    });
  }

  // Pub-sub notification helpers
  function onSelectionValid(callback) {
    if (typeof callback === 'function') {
      validCallbacks.push(callback);
    }
  }

  // Subscribe to selection invalid state
  function onSelectionInvalid(callback) {
    if (typeof callback === 'function') {
      invalidCallbacks.push(callback);
    }
  }

  function notifyValid() {
    validCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('[LinkedIn Text Formatter] Error in selection valid callback:', e);
      }
    });
  }

  function notifyInvalid() {
    invalidCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('[LinkedIn Text Formatter] Error in selection invalid callback:', e);
      }
    });
  }

  // Protected interaction APIs
  function beginProtectedInteraction() {
    state.isProtected = true;
  }

  function endProtectedInteraction() {
    state.isProtected = false;
    if (!isSavedRangeValid()) {
      clearSavedSelection();
    }
  }

  function isProtectedInteractionActive() {
    return state.isProtected;
  }

  // Document-level event handlers for outside click detection & protection
  function handleDocumentPointerOrMouse(event) {
    if (state.isProtected || isExtensionElement(event.target, event)) {
      beginProtectedInteraction();
      return;
    }

    const resolver = window.LinkedInTextFormatter.resolveToEditableRoot;
    if (resolver) {
      const root = resolver(event.target);
      if (!root || root !== state.editor) {
        clearSavedSelection();
      }
    }
  }

  // Listeners
  document.addEventListener('selectionchange', handleSelectionChange);

  document.addEventListener('pointerdown', handleDocumentPointerOrMouse, { capture: true });
  document.addEventListener('mousedown', handleDocumentPointerOrMouse, { capture: true });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      clearSavedSelection();
    }
  });

  // Export selection APIs to namespace
  window.LinkedInTextFormatter.SelectionManager = {
    getSavedRange: () => state.savedRange,
    getSavedEditor: () => state.editor,
    hasValidSelection: () => isSavedRangeValid(),
    restoreSelection: restoreSavedSelection,
    clearSelection: clearSavedSelection,
    validateSavedRange: isSavedRangeValid,
    beginProtectedInteraction,
    endProtectedInteraction,
    isProtectedInteractionActive,
    onSelectionValid,
    onSelectionInvalid,
    isExtensionElement
  };

  // For testing in Node context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      state,
      getSelectionDirection,
      isSavedRangeValid,
      clearSavedSelection,
      restoreSavedSelection,
      evaluateSelection,
      isExtensionElement
    };
  }
})();
