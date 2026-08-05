/**
 * selection-manager.js
 *
 * Listens for user text selections within the LinkedIn editor.
 * Responsible for detecting, storing, and validating selection ranges across mouse and keyboard events,
 * supporting both direct-document and open Shadow DOM editor instances.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  // Selection state
  const state = {
    savedRange: null,
    editor: null,
    selectionRoot: null,
    direction: 'forward',
    isProtected: false,
    activeEditor: null
  };

  // Subscriptions callbacks
  const validCallbacks = [];
  const invalidCallbacks = [];

  let rAFId = null;
  let isCurrentlyValid = false;
  let lastRangeSignature = null;

  // Helper to resolve selection source for an editor (Document vs ShadowRoot)
  function getSelectionForEditor(editor) {
    const targetEditor = editor || state.activeEditor || state.editor;
    if (!targetEditor) {
      if (typeof document !== 'undefined' && typeof document.getSelection === 'function') {
        return document.getSelection();
      }
      return typeof window !== 'undefined' ? window.getSelection() : null;
    }
    const root = targetEditor.getRootNode ? targetEditor.getRootNode() : null;
    if (root && root.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE / ShadowRoot */ && typeof root.getSelection === 'function') {
      return root.getSelection();
    }
    if (targetEditor.ownerDocument && typeof targetEditor.ownerDocument.getSelection === 'function') {
      return targetEditor.ownerDocument.getSelection();
    }
    if (typeof document !== 'undefined' && typeof document.getSelection === 'function') {
      return document.getSelection();
    }
    return typeof window !== 'undefined' ? window.getSelection() : null;
  }

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
    
    try {
      const position = anchorNode.compareDocumentPosition(focusNode);
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 'backward';
      }
    } catch (e) {
      // Cross-root boundary position fallback
    }
    return 'forward';
  }

  /**
   * Check if an element or event path belongs to the extension toolbar or controls.
   * Supports event.composedPath(), element.closest(), and composed DOM ancestor traversal.
   */
  function isExtensionElement(element, event) {
    if (event && typeof event.composedPath === 'function') {
      try {
        const path = event.composedPath();
        for (let i = 0; i < path.length; i++) {
          const node = path[i];
          if (node && node.nodeType === 1 && node.getAttribute) {
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

    const composedClosest = window.LinkedInTextFormatter.composedClosest;
    if (composedClosest) {
      const match = composedClosest(element, (node) => {
        if (!node || !node.getAttribute) return false;
        return node.getAttribute('data-linkedin-text-formatter') === 'true' || node.id === 'ltf-floating-toolbar';
      });
      if (match) return true;
    }

    if (typeof element.closest === 'function') {
      try {
        const match = element.closest('[data-linkedin-text-formatter="true"], #ltf-floating-toolbar');
        if (match) return true;
      } catch (err) {
        // Fallback
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
      current = current.parentElement || (current.parentNode && current.parentNode.host ? current.parentNode.host : current.parentNode);
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
    const isEditorConnected = typeof editor.isConnected === 'boolean' ? editor.isConnected : true;
    if (!isEditorConnected) {
      return false;
    }

    // Check if ShadowRoot host is still connected
    const rootNode = editor.getRootNode ? editor.getRootNode() : null;
    if (rootNode && rootNode.nodeType === 11) {
      if (!rootNode.host || (typeof rootNode.host.isConnected === 'boolean' && !rootNode.host.isConnected)) {
        return false;
      }
    }
    
    // Check if boundary nodes are connected
    const isStartConnected = range.startContainer ? (typeof range.startContainer.isConnected === 'boolean' ? range.startContainer.isConnected : true) : false;
    const isEndConnected = range.endContainer ? (typeof range.endContainer.isConnected === 'boolean' ? range.endContainer.isConnected : true) : false;
    
    if (!isStartConnected || !isEndConnected) {
      return false;
    }

    // Check Range collapse / empty
    if (range.collapsed || !range.toString() || range.toString().trim() === '') {
      return false;
    }
    
    // Resolve boundaries and verify they belong to saved editor
    const resolver = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.resolveToEditableRoot : null;
    if (!resolver) {
      return false;
    }
    
    if (resolver(range.startContainer) !== editor || resolver(range.endContainer) !== editor) {
      return false;
    }

    // Check excluded control (.ql-clipboard)
    const isExcludedControl = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isExcludedControl : null;
    if (isExcludedControl && (isExcludedControl(range.startContainer) || isExcludedControl(range.endContainer))) {
      return false;
    }
    
    // Check if the editor is still a supported post editor
    const detector = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isSupportedLinkedInPostEditor : null;
    if (detector && !detector(editor)) {
      return false;
    }
    
    return true;
  }

  // Clear saved range
  function clearSavedSelection() {
    if (state.savedRange || state.editor || isCurrentlyValid) {
      state.savedRange = null;
      state.editor = null;
      state.selectionRoot = null;
      state.direction = 'forward';
      isCurrentlyValid = false;
      lastRangeSignature = null;
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
      const selection = (state.selectionRoot && typeof state.selectionRoot.getSelection === 'function')
        ? state.selectionRoot.getSelection()
        : getSelectionForEditor(state.editor);

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

  // Helper to set active editor and attach shadow listener if needed
  function setActiveEditor(editor) {
    if (!editor) return;
    const detector = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isSupportedLinkedInPostEditor : null;
    if (detector && !detector(editor)) {
      return;
    }

    if (state.activeEditor !== editor) {
      state.activeEditor = editor;
      const root = editor.getRootNode ? editor.getRootNode() : null;
      if (root && root.nodeType === 11 && typeof root.addEventListener === 'function') {
        try {
          root.addEventListener('selectionchange', handleSelectionEvent);
        } catch (e) {
          // Safe fallback
        }
      }
    }
  }

  // Helper to update active editor from node or event
  function updateActiveEditorFromNodeOrEvent(nodeOrEvent) {
    let target = null;
    const composedResolver = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.resolveEditableFromComposedPath : null;
    if (nodeOrEvent && typeof nodeOrEvent.composedPath === 'function' && composedResolver) {
      target = composedResolver(nodeOrEvent);
    }
    if (!target && nodeOrEvent) {
      if (nodeOrEvent.target) {
        const composedPathTarget = typeof nodeOrEvent.composedPath === 'function' ? (nodeOrEvent.composedPath()[0] || nodeOrEvent.target) : nodeOrEvent.target;
        target = composedPathTarget;
      } else {
        target = nodeOrEvent;
      }
    }

    const resolver = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.resolveToEditableRoot : null;
    const detector = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isSupportedLinkedInPostEditor : null;

    if (resolver && detector && target) {
      const root = resolver(target);
      if (root && detector(root)) {
        setActiveEditor(root);
        return root;
      }
    }
    return null;
  }

  // Evaluate the current selection inside the DOM
  function evaluateSelection() {
    if (state.isProtected) {
      return;
    }

    const activeEditor = state.activeEditor || state.editor;
    const selection = getSelectionForEditor(activeEditor);
    const rootNode = activeEditor ? (activeEditor.getRootNode ? activeEditor.getRootNode() : null) : null;
    const isShadow = rootNode && rootNode.nodeType === 11;
    const sourceStr = isShadow ? 'shadow-root' : 'document';

    console.log('[LinkedIn Text Formatter] Selection evaluation requested');
    console.log('[LinkedIn Text Formatter] Active editor root type: ' + (isShadow ? 'shadow-root' : 'document'));
    console.log('[LinkedIn Text Formatter] Selection source: ' + sourceStr);

    if (!selection) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: no selection object');
      clearSavedSelection();
      return;
    }

    const rangeCount = typeof selection.rangeCount === 'number' ? selection.rangeCount : (selection.type === 'Range' ? 1 : 0);
    console.log('[LinkedIn Text Formatter] ' + (isShadow ? 'Shadow' : 'Document') + ' selection rangeCount: ' + rangeCount);

    if (rangeCount === 0) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: rangeCount is 0');
      clearSavedSelection();
      return;
    }

    const range = selection.getRangeAt ? selection.getRangeAt(0) : null;
    if (!range) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: no range at index 0');
      clearSavedSelection();
      return;
    }

    if (range.collapsed || !range.toString() || range.toString().trim() === '') {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: selection is collapsed or empty');
      clearSavedSelection();
      return;
    }

    const isStartConnected = range.startContainer ? (typeof range.startContainer.isConnected === 'boolean' ? range.startContainer.isConnected : true) : false;
    const isEndConnected = range.endContainer ? (typeof range.endContainer.isConnected === 'boolean' ? range.endContainer.isConnected : true) : false;
    if (!isStartConnected || !isEndConnected) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: boundary containers not connected');
      clearSavedSelection();
      return;
    }

    const resolver = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.resolveToEditableRoot : null;
    const detector = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isSupportedLinkedInPostEditor : null;
    if (!resolver || !detector) {
      clearSavedSelection();
      return;
    }

    const startRoot = resolver(range.startContainer);
    const endRoot = resolver(range.endContainer);

    if (!startRoot || startRoot !== endRoot) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: boundaries belong to different editors');
      clearSavedSelection();
      return;
    }

    if (!detector(startRoot)) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: editor is not supported');
      clearSavedSelection();
      return;
    }

    const isExcludedControl = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.isExcludedControl : null;
    if (isExcludedControl && (isExcludedControl(range.startContainer) || isExcludedControl(range.endContainer))) {
      console.log('[LinkedIn Text Formatter] Selection evaluation rejected: selection involves excluded control (.ql-clipboard)');
      clearSavedSelection();
      return;
    }

    // Check if selection intersects any protected entity (links, mentions) or plain-text URL
    const rangeIntersectsProtectedContent = window.LinkedInTextFormatter ? (
      window.LinkedInTextFormatter.rangeIntersectsProtectedContent || window.LinkedInTextFormatter.rangeIntersectsProtectedEntity
    ) : null;
    const rangeIntersectsUrlText = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.rangeIntersectsUrlText : null;

    const isProtected = (rangeIntersectsProtectedContent && rangeIntersectsProtectedContent(range, startRoot)) ||
                        (rangeIntersectsUrlText && rangeIntersectsUrlText(range, startRoot));

    if (isProtected) {
      console.log('[LinkedIn Text Formatter] Selection rejected: protected content');
      clearSavedSelection();
      const ToolbarManager = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.ToolbarManager : null;
      if (ToolbarManager && typeof ToolbarManager.hide === 'function') {
        ToolbarManager.hide('protected-entity-rejected');
      }
      return;
    }

    const rootOfEditor = startRoot.getRootNode ? startRoot.getRootNode() : null;
    if (rootOfEditor && rootOfEditor.nodeType === 11) {
      if (!rootOfEditor.host || (typeof rootOfEditor.host.isConnected === 'boolean' && !rootOfEditor.host.isConnected)) {
        console.log('[LinkedIn Text Formatter] Selection evaluation rejected: shadow host disconnected');
        clearSavedSelection();
        return;
      }
    }

    console.log('[LinkedIn Text Formatter] ' + (isShadow ? 'Shadow' : 'Document') + ' selection validation passed');

    // Create signature to prevent duplicate valid callbacks
    const currentSignature = `${range.startContainer === range.endContainer ? 'same' : 'diff'}_${range.startOffset}_${range.endOffset}`;
    const rangeChanged = !isCurrentlyValid || lastRangeSignature !== currentSignature || state.editor !== startRoot;

    // Save state
    state.savedRange = range.cloneRange();
    state.editor = startRoot;
    state.activeEditor = startRoot;
    state.selectionRoot = rootOfEditor && rootOfEditor.nodeType === 11 ? rootOfEditor : (startRoot.ownerDocument || document);
    state.direction = getSelectionDirection(selection);

    console.log('[LinkedIn Text Formatter] Valid selection captured.');

    if (rangeChanged) {
      isCurrentlyValid = true;
      lastRangeSignature = currentSignature;
      notifyValid();
    }
  }

  // Debounced evaluation scheduler using requestAnimationFrame
  function scheduleEvaluation() {
    if (rAFId) {
      cancelAnimationFrame(rAFId);
    }
    rAFId = requestAnimationFrame(() => {
      rAFId = null;
      evaluateSelection();
    });
  }

  function handleSelectionEvent(event) {
    if (event) {
      updateActiveEditorFromNodeOrEvent(event);
    }
    scheduleEvaluation();
  }

  // Pub-sub notification helpers
  function onSelectionValid(callback) {
    if (typeof callback === 'function') {
      validCallbacks.push(callback);
    }
  }

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

    const composedPathTarget = (event && typeof event.composedPath === 'function') ? (event.composedPath()[0] || event.target) : event.target;
    const resolver = window.LinkedInTextFormatter ? window.LinkedInTextFormatter.resolveToEditableRoot : null;
    if (resolver) {
      const root = resolver(composedPathTarget);
      if (!root || root !== state.editor) {
        clearSavedSelection();
      }
    }
  }

  // Event Listeners
  document.addEventListener('selectionchange', handleSelectionEvent);
  document.addEventListener('pointerup', handleSelectionEvent, { capture: true });
  document.addEventListener('mouseup', handleSelectionEvent, { capture: true });

  document.addEventListener('keyup', (event) => {
    if (event.shiftKey || (event.key && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End'))) {
      handleSelectionEvent(event);
    }
  });

  document.addEventListener('focusin', (event) => {
    updateActiveEditorFromNodeOrEvent(event);
  });

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
    getActiveEditor: () => state.activeEditor,
    setActiveEditor,
    getSelectionForEditor,
    hasValidSelection: () => isSavedRangeValid(),
    restoreSelection: restoreSavedSelection,
    clearSelection: clearSavedSelection,
    validateSavedRange: isSavedRangeValid,
    beginProtectedInteraction,
    endProtectedInteraction,
    isProtectedInteractionActive,
    onSelectionValid,
    onSelectionInvalid,
    isExtensionElement,
    evaluateSelection
  };

  // For testing in Node context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      state,
      getSelectionForEditor,
      getSelectionDirection,
      isSavedRangeValid,
      clearSavedSelection,
      restoreSavedSelection,
      evaluateSelection,
      isExtensionElement,
      setActiveEditor,
      handleSelectionEvent
    };
  }
})();
