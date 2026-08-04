/**
 * text-replacement-manager.js
 *
 * Handles replacing selected text inside LinkedIn's post editor with formatted Unicode text.
 * Supports root-local DOM APIs, ShadowRoot selections, execCommand and DOM Range fallbacks,
 * DOM verification, Quill reconciliation, caret placement, and transaction locking.
 */

(function() {
  // Ensure extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  let isTransactionRunning = false;
  const DEBUG = false;
  function debugLog(...args) { if (DEBUG) console.log(...args); }

  const SUPPORTED_STYLES = new Set([
    'bold',
    'italic',
    'bold-italic',
    'underline',
    'double-underline'
  ]);

  /**
   * Helper: Resolves the Selection object from the editor's saved root (ShadowRoot or Document).
   */
  function getSelectionFromRoot(editor) {
    if (!editor) {
      if (typeof document !== 'undefined' && typeof document.getSelection === 'function') {
        return document.getSelection();
      }
      return typeof window !== 'undefined' ? window.getSelection() : null;
    }
    const root = editor.getRootNode ? editor.getRootNode() : null;
    if (root && root.nodeType === 11 /* ShadowRoot */ && typeof root.getSelection === 'function') {
      return root.getSelection();
    }
    if (editor.ownerDocument && typeof editor.ownerDocument.getSelection === 'function') {
      return editor.ownerDocument.getSelection();
    }
    if (typeof document !== 'undefined' && typeof document.getSelection === 'function') {
      return document.getSelection();
    }
    return typeof window !== 'undefined' ? window.getSelection() : null;
  }

  /**
   * Validates if the saved selection and editor context are valid for replacement.
   */
  function validateReplacementContext() {
    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    if (!SelectionManager) {
      debugLog('[LinkedIn Text Formatter] Saved range validation result: failed (SelectionManager unavailable)');
      return null;
    }

    if (typeof SelectionManager.hasValidSelection === 'function' && !SelectionManager.hasValidSelection()) {
      console.log('[LinkedIn Text Formatter] Saved range validation result: failed (Selection invalid or stale)');
      return null;
    }

    const savedRange = typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null;
    const editor = typeof SelectionManager.getSavedEditor === 'function' ? SelectionManager.getSavedEditor() : null;

    if (!savedRange || !editor) {
      console.log('[LinkedIn Text Formatter] Saved range validation result: failed (No saved range or editor)');
      return null;
    }

    const isConnected = typeof editor.isConnected === 'boolean' ? editor.isConnected : true;
    if (!isConnected) {
      console.log('[LinkedIn Text Formatter] Saved range validation result: failed (Editor disconnected)');
      return null;
    }

    const root = editor.getRootNode ? editor.getRootNode() : null;
    if (root && root.nodeType === 11) {
      if (!root.host || (typeof root.host.isConnected === 'boolean' && !root.host.isConnected)) {
        console.log('[LinkedIn Text Formatter] Saved range validation result: failed (Shadow host disconnected)');
        return null;
      }
    }

    console.log('[LinkedIn Text Formatter] Saved range validation result: passed');
    return { savedRange, editor };
  }

  /**
   * Checks if the selection range contains atomic non-editable entity nodes.
   */
  function containsProtectedEntity(range) {
    if (!range) return false;

    try {
      const fragment = range.cloneContents();
      const nonEditable = fragment.querySelector('[contenteditable="false"], [data-entity-hovercard-id], .ql-mention');
      if (nonEditable) {
        return true;
      }
    } catch (err) {
      // Ignore clone error
    }

    return false;
  }

  /**
   * Dispatches input events (beforeinput and input) to notify LinkedIn's editor framework.
   */
  function dispatchEditorInput(editor, formattedText) {
    if (!editor) return;

    // Optional beforeinput event for Quill reconciliation
    try {
      if (typeof InputEvent !== 'undefined') {
        const beforeInput = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: formattedText,
          composed: true
        });
        editor.dispatchEvent(beforeInput);
      }
    } catch (e) {}

    // Input event
    try {
      if (typeof InputEvent !== 'undefined') {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: formattedText,
          composed: true
        });
        editor.dispatchEvent(inputEvent);
      } else {
        const ownerDoc = editor.ownerDocument || document;
        const event = ownerDoc.createEvent('Event');
        event.initEvent('input', true, true);
        editor.dispatchEvent(event);
      }
    } catch (err) {
      console.error('[LinkedIn Text Formatter] Error dispatching editor input event:', err);
    }
    console.log('[LinkedIn Text Formatter] Input event dispatched');
  }

  /**
   * Collapses the caret position immediately after the inserted text using root-local selection.
   */
  function placeCaretAfterInsertedContent(editor, targetNodeOrRange) {
    try {
      const ownerDocument = editor.ownerDocument || document;
      const selection = getSelectionFromRoot(editor);
      if (!selection) {
        console.log('[LinkedIn Text Formatter] Caret placement result: failure (no selection)');
        return false;
      }

      const caretRange = ownerDocument.createRange();

      if (targetNodeOrRange && targetNodeOrRange.nodeType) {
        caretRange.setStartAfter(targetNodeOrRange);
        caretRange.setEndAfter(targetNodeOrRange);
      } else if (targetNodeOrRange && typeof targetNodeOrRange.setStart === 'function') {
        caretRange.setStart(targetNodeOrRange.endContainer, targetNodeOrRange.endOffset);
        caretRange.collapse(true);
      } else {
        caretRange.selectNodeContents(editor);
        caretRange.collapse(false);
      }

      selection.removeAllRanges();
      selection.addRange(caretRange);

      if (editor && typeof editor.focus === 'function') {
        editor.focus();
      }
      console.log('[LinkedIn Text Formatter] Caret placement result: success');
      return true;
    } catch (err) {
      console.log('[LinkedIn Text Formatter] Caret placement result: failure');
      return false;
    }
  }

  /**
   * Restores selection on the correct root (Document or ShadowRoot).
   */
  function restoreSelectionContext(editor, savedRange) {
    try {
      if (editor && typeof editor.focus === 'function') {
        editor.focus();
      }

      const sel = getSelectionFromRoot(editor);
      if (!sel) {
        console.log('[LinkedIn Text Formatter] Selection restoration result: failure (No selection object)');
        return false;
      }

      sel.removeAllRanges();
      const clonedRange = savedRange.cloneRange();
      sel.addRange(clonedRange);

      const rangeCount = typeof sel.rangeCount === 'number' ? sel.rangeCount : 1;
      if (rangeCount === 0) {
        console.log('[LinkedIn Text Formatter] Selection restoration result: failure (rangeCount is 0)');
        return false;
      }

      console.log('[LinkedIn Text Formatter] Selection restoration result: success');
      return true;
    } catch (err) {
      console.log('[LinkedIn Text Formatter] Selection restoration result: failure (exception)');
      return false;
    }
  }

  /**
   * DOM Range replacement fallback for Shadow DOM or failed execCommand.
   */
  function replaceSavedSelectionDOM(savedRange, editor, formattedText) {
    console.log('[LinkedIn Text Formatter] DOM fallback started');
    let originalFragment = null;
    const ownerDocument = editor.ownerDocument || document;

    try {
      const range = savedRange.cloneRange();
      originalFragment = range.cloneContents();
      range.deleteContents();

      const textNode = ownerDocument.createTextNode(formattedText);
      range.insertNode(textNode);

      const isNodeConnected = typeof textNode.isConnected === 'boolean' ? textNode.isConnected : (editor.contains ? editor.contains(textNode) : true);
      if (!isNodeConnected) {
        throw new Error('Inserted text node is disconnected');
      }

      placeCaretAfterInsertedContent(editor, textNode);
      dispatchEditorInput(editor, formattedText);

      console.log('[LinkedIn Text Formatter] DOM fallback succeeded');
      return true;
    } catch (err) {
      console.error('[LinkedIn Text Formatter] DOM replacement failed:', err);
      console.log('[LinkedIn Text Formatter] DOM fallback failed');
      if (originalFragment) {
        try {
          savedRange.insertNode(originalFragment);
          console.log('[LinkedIn Text Formatter] Rollback restored original fragment');
        } catch (rollbackErr) {
          console.error('[LinkedIn Text Formatter] Rollback failed:', rollbackErr);
        }
      }
      return false;
    }
  }

  /**
   * Performs text replacement transaction.
   */
  function replaceSavedSelection(formattedText, editor, savedRange) {
    const ownerDocument = editor.ownerDocument || document;
    const originalText = savedRange.toString();

    // 1. Restore root-local selection context
    const restored = restoreSelectionContext(editor, savedRange);
    if (!restored) {
      console.log('[LinkedIn Text Formatter] Replacement transaction aborted: selection restoration failed');
      return false;
    }

    // 2. Attempt primary insertion strategy via ownerDocument.execCommand
    let execSuccess = false;
    let strategy = 'execCommand("insertText")';

    try {
      if (typeof ownerDocument.execCommand === 'function') {
        execSuccess = ownerDocument.execCommand('insertText', false, formattedText);
      }
    } catch (cmdErr) {
      execSuccess = false;
    }

    console.log(`[LinkedIn Text Formatter] execCommand return value: ${execSuccess}`);

    // 3. Verify DOM actually changed after execCommand
    let domChanged = false;
    if (execSuccess) {
      const currentText = savedRange.startContainer ? savedRange.startContainer.textContent : '';
      const editorText = editor.textContent || '';
      if (editorText.includes(formattedText) || !editorText.includes(originalText)) {
        domChanged = true;
      }
    }

    if (execSuccess && domChanged) {
      console.log(`[LinkedIn Text Formatter] Replacement strategy selected: ${strategy}`);
      console.log('[LinkedIn Text Formatter] Replacement success');
      dispatchEditorInput(editor, formattedText);
      placeCaretAfterInsertedContent(editor, savedRange);
      return true;
    }

    if (execSuccess && !domChanged) {
      console.log('[LinkedIn Text Formatter] execCommand reported true but DOM remained unchanged. Triggering DOM fallback.');
    }

    // 4. Trigger DOM Range fallback if execCommand returned false or failed DOM verification
    console.log('[LinkedIn Text Formatter] Replacement strategy selected: DOM Range Fallback');
    const fallbackSuccess = replaceSavedSelectionDOM(savedRange, editor, formattedText);
    return fallbackSuccess;
  }

  /**
   * Dynamically resolves formatText function from window.LinkedInTextFormatter.
   */
  function resolveFormatter() {
    if (typeof window === 'undefined' || !window.LinkedInTextFormatter) {
      return null;
    }

    const ns = window.LinkedInTextFormatter;
    if (ns.TextFormatter && typeof ns.TextFormatter.formatText === 'function') {
      return ns.TextFormatter.formatText;
    }
    if (typeof ns.formatText === 'function') {
      return ns.formatText;
    }

    return null;
  }

  /**
   * Applies requested format style to active saved selection.
   */
  function applyFormatting(style) {
    console.log(`[LinkedIn Text Formatter] applyFormatting entered for style: ${style}`);
    if (isTransactionRunning) {
      console.log('[LinkedIn Text Formatter] Formatting action ignored: Transaction already running.');
      return false;
    }

    isTransactionRunning = true;
    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    const ToolbarManager = window.LinkedInTextFormatter.ToolbarManager;

    let transactionSuccess = false;
    let savedEditor = null;

    try {
      // 1. Validate style identifier
      if (!SUPPORTED_STYLES.has(style)) {
        console.log(`[LinkedIn Text Formatter] Formatting action failed: Unsupported style identifier "${style}".`);
        return false;
      }

      // 2. Validate selection context
      const context = validateReplacementContext();
      if (!context) {
        console.log('[LinkedIn Text Formatter] Context validation failure');
        return false;
      }
      console.log('[LinkedIn Text Formatter] Context validation success');

      const { savedRange, editor } = context;
      savedEditor = editor;

      // Log root & selection source types
      const root = editor.getRootNode ? editor.getRootNode() : null;
      const isShadow = root && root.nodeType === 11;
      console.log(`[LinkedIn Text Formatter] Saved editor root type: ${isShadow ? 'shadow-root' : 'document'}`);
      console.log(`[LinkedIn Text Formatter] Selection source type: ${isShadow ? 'ShadowRoot.getSelection' : 'Document.getSelection'}`);

      // 3. Dynamically resolve formatter at action time
      const formatText = resolveFormatter();
      if (typeof formatText !== 'function') {
        console.log('[LinkedIn Text Formatter] Formatting action failed: formatText engine function unavailable.');
        return false;
      }
      console.log('[LinkedIn Text Formatter] Formatter resolved');

      // 4. Begin protected interaction
      if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
      }

      // 5. Read selected text
      const selectedText = savedRange.toString();
      if (!selectedText || selectedText.trim() === '') {
        console.log('[LinkedIn Text Formatter] Formatting action failed: Selected content is empty or whitespace-only.');
        return false;
      }
      console.log(`[LinkedIn Text Formatter] Selected character count: ${selectedText.length}`);

      // 6. Check for atomic protected non-editable entities
      if (containsProtectedEntity(savedRange)) {
        console.log('[LinkedIn Text Formatter] Formatting action failed: Atomic non-editable entity protected.');
        return false;
      }

      // 7. Format text using formatting engine
      const formattedText = formatText(selectedText, style);
      if (typeof formattedText !== 'string') {
        console.log('[LinkedIn Text Formatter] Formatting action failed: Invalid formatter output.');
        return false;
      }
      console.log(`[LinkedIn Text Formatter] Formatted character count: ${formattedText.length}`);

      // 8. Perform text replacement transaction
      transactionSuccess = replaceSavedSelection(formattedText, editor, savedRange);

      // 9. DOM verification check after transaction
      const isEditorConnected = typeof editor.isConnected === 'boolean' ? editor.isConnected : true;
      if (transactionSuccess && isEditorConnected) {
        console.log('[LinkedIn Text Formatter] Final DOM verification result: success');
      } else {
        console.log('[LinkedIn Text Formatter] Final DOM verification result: failure');
        transactionSuccess = false;
      }

      // 10. Hide toolbar & clear selection ONLY after verified success
      if (transactionSuccess) {
        console.log(`[LinkedIn Text Formatter] Formatting action succeeded: ${style}`);
        if (SelectionManager && typeof SelectionManager.clearSelection === 'function') {
          SelectionManager.clearSelection();
        }
        if (ToolbarManager && typeof ToolbarManager.hide === 'function') {
          ToolbarManager.hide('formatting-applied');
        }
        return true;
      } else {
        console.log('[LinkedIn Text Formatter] Formatting action failed during replacement transaction.');
        return false;
      }
    } catch (err) {
      console.error('[LinkedIn Text Formatter] Unexpected error during text replacement:', err);
      return false;
    } finally {
      if (SelectionManager && typeof SelectionManager.endProtectedInteraction === 'function') {
        SelectionManager.endProtectedInteraction();
      }
      if (savedEditor && typeof savedEditor.focus === 'function') {
        try {
          savedEditor.focus();
        } catch (e) {}
      }
      isTransactionRunning = false;
    }
  }

  /**
   * Initializes TextReplacementManager and subscribes to ToolbarManager action events.
   */
  function initialize() {
    const fmt = resolveFormatter();
    console.log(`[LinkedIn Text Formatter] Formatter availability: ${fmt ? 'available' : 'unavailable'}`);
    console.log('[LinkedIn Text Formatter] Text replacement manager initialized.');
    const ToolbarManager = window.LinkedInTextFormatter.ToolbarManager;
    if (ToolbarManager && typeof ToolbarManager.onFormatAction === 'function') {
      ToolbarManager.onFormatAction((actionStyle) => {
        console.log(`[LinkedIn Text Formatter] Toolbar action received: ${actionStyle}`);
        applyFormatting(actionStyle);
      });
    }
  }

  // Export TextReplacementManager API
  window.LinkedInTextFormatter.TextReplacementManager = {
    initialize,
    applyFormatting,
    replaceSavedSelection,
    replaceSavedSelectionDOM,
    validateReplacementContext,
    dispatchEditorInput,
    placeCaretAfterInsertedContent,
    containsProtectedEntity,
    resolveFormatter,
    getSelectionFromRoot
  };

  // Export for Node tests
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      applyFormatting,
      replaceSavedSelection,
      replaceSavedSelectionDOM,
      validateReplacementContext,
      dispatchEditorInput,
      placeCaretAfterInsertedContent,
      containsProtectedEntity,
      initialize,
      resolveFormatter,
      getSelectionFromRoot
    };
  }
})();
