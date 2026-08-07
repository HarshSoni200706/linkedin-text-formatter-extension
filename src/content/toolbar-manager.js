/**
 * toolbar-manager.js
 *
 * Manages the floating formatting toolbar DOM element.
 * Responsible for creating, positioning, displaying, and hiding the toolbar near the user's text selection,
 * maintaining a single canonical toolbar instance across direct-document and open Shadow DOM layouts.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  const FORMAT_STYLES = window.LinkedInTextFormatter.FORMAT_STYLES || {
    BOLD: 'bold',
    ITALIC: 'italic',
    BOLD_ITALIC: 'bold-italic',
    UNDERLINE: 'underline',
    DOUBLE_UNDERLINE: 'double-underline'
  };

  const DEBUG = false;
  function debugLog(...args) { if (DEBUG) console.log(...args); }

  const BUTTON_CONFIGS = [
    {
      action: FORMAT_STYLES.BOLD,
      label: 'B',
      title: 'Bold',
      ariaLabel: 'Format selected text as Bold',
      className: 'ltf-toolbar__button--bold'
    },
    {
      action: FORMAT_STYLES.ITALIC,
      label: 'I',
      title: 'Italic',
      ariaLabel: 'Format selected text as Italic',
      className: 'ltf-toolbar__button--italic'
    },
    {
      action: FORMAT_STYLES.BOLD_ITALIC,
      label: 'BI',
      title: 'Bold Italic',
      ariaLabel: 'Format selected text as Bold Italic',
      className: 'ltf-toolbar__button--bold-italic'
    },
    {
      action: FORMAT_STYLES.UNDERLINE,
      label: 'U',
      title: 'Underline',
      ariaLabel: 'Format selected text as Underline',
      className: 'ltf-toolbar__button--underline'
    },
    {
      action: FORMAT_STYLES.DOUBLE_UNDERLINE,
      label: 'U',
      title: 'Double Underline',
      ariaLabel: 'Format selected text as Double Underline',
      className: 'ltf-toolbar__button--double-underline'
    }
  ];

  let toolbarElement = null;
  let isInitialized = false;
  let pendingShowFrame = null;
  let rAFScrollId = null;
  let selectionSubscriptionCount = 0;
  const formatActionCallbacks = [];

  const TOOLBAR_CSS_TEXT = `
.ltf-toolbar {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  user-select: none;
  -webkit-user-select: none;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.12s ease-in-out;
}
.ltf-toolbar--hidden {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  display: none !important;
}
.ltf-toolbar__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  margin: 0;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 13px;
  font-family: inherit;
  color: #333333;
  cursor: pointer;
  outline: none;
  transition: background-color 0.1s ease, color 0.1s ease;
}
.ltf-toolbar__button:hover {
  background-color: rgba(0, 0, 0, 0.07);
  color: #000000;
}
.ltf-toolbar__button:focus-visible {
  outline: 2px solid #0a66c2;
  outline-offset: 1px;
  background-color: rgba(10, 102, 194, 0.08);
}
.ltf-toolbar__button:active {
  background-color: rgba(0, 0, 0, 0.14);
  transform: translateY(1px);
}
.ltf-toolbar__button--bold { font-weight: 700; }
.ltf-toolbar__button--italic { font-style: italic; }
.ltf-toolbar__button--bold-italic { font-weight: 700; font-style: italic; }
.ltf-toolbar__button--underline { text-decoration: underline; }
.ltf-toolbar__button--double-underline { text-decoration: underline double; }
@media (prefers-color-scheme: dark) {
  .ltf-toolbar {
    background-color: #1d2226;
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .ltf-toolbar__button { color: #e9e9e9; }
  .ltf-toolbar__button:hover { background-color: rgba(255, 255, 255, 0.12); color: #ffffff; }
  .ltf-toolbar__button:focus-visible { outline-color: #70b5f9; background-color: rgba(112, 181, 249, 0.15); }
  .ltf-toolbar__button:active { background-color: rgba(255, 255, 255, 0.2); }
}
@media (prefers-reduced-motion: reduce) {
  .ltf-toolbar,
  .ltf-toolbar__button {
    transition: none !important;
    animation: none !important;
    transform: none !important;
  }
}
`;

  /**
   * Ensures that extension toolbar CSS rules exist inside an open ShadowRoot host.
   */
  function ensureShadowToolbarStyles(shadowRoot) {
    if (!shadowRoot || typeof shadowRoot.querySelector !== 'function') return;
    let existingStyle = shadowRoot.querySelector('style[data-linkedin-text-formatter-style="true"]');
    if (!existingStyle) {
      const doc = shadowRoot.ownerDocument || document;
      const styleEl = doc.createElement('style');
      styleEl.setAttribute('data-linkedin-text-formatter-style', 'true');
      styleEl.textContent = TOOLBAR_CSS_TEXT;
      shadowRoot.appendChild(styleEl);
      debugLog('[LinkedIn Text Formatter] Shadow toolbar stylesheet inserted or reused.');
    }
  }

  /**
   * Resolves the host element for the toolbar.
   * Prefers open ShadowRoot if editor is inside one, then composer dialog, with fallback to document.body.
   */
  function resolveToolbarHost(editor) {
    if (editor) {
      const rootNode = editor.getRootNode ? editor.getRootNode() : null;
      if (rootNode && rootNode.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE / ShadowRoot */ && rootNode.host) {
        debugLog('[LinkedIn Text Formatter] Toolbar host selected: shadow-root');
        ensureShadowToolbarStyles(rootNode);
        return rootNode;
      }

      if (typeof editor.closest === 'function') {
        const activeDialog = editor.closest('dialog[open]') || editor.closest('[role="dialog"]');
        if (activeDialog) {
          debugLog('[LinkedIn Text Formatter] Toolbar host selected: dialog');
          return activeDialog;
        }
      }
    }

    const doc = (editor && editor.ownerDocument) ? editor.ownerDocument : document;
    debugLog('[LinkedIn Text Formatter] Toolbar host selected: document');
    return doc.body || doc.documentElement || document.body;
  }

  /**
   * Safely removes duplicate extension toolbar elements matching the exact marker.
   */
  function cleanupDuplicateToolbars(targetHost, canonicalEl) {
    const selector = '#ltf-floating-toolbar[data-linkedin-text-formatter="true"]';
    const foundElements = [];

    // Query target host
    if (targetHost && typeof targetHost.querySelectorAll === 'function') {
      try {
        const inHost = targetHost.querySelectorAll(selector);
        inHost.forEach(el => foundElements.push(el));
      } catch (e) {}
    }

    // Query main document
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      try {
        const inDoc = document.querySelectorAll(selector);
        inDoc.forEach(el => {
          if (!foundElements.includes(el)) {
            foundElements.push(el);
          }
        });
      } catch (e) {}
    }

    const countInRoot = foundElements.length;
    debugLog(`[LinkedIn Text Formatter] Number of toolbar elements found in active root: ${countInRoot}`);

    let removeCount = 0;
    foundElements.forEach(el => {
      if (el !== canonicalEl) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
          removeCount++;
        }
      }
    });

    if (removeCount > 0) {
      debugLog(`[LinkedIn Text Formatter] Duplicate toolbar removed (removed ${removeCount}).`);
    }
  }

  /**
   * Helper: Extracts a valid selection rectangle from a Range.
   * Handles 0x0 getBoundingClientRect() outputs by falling back to getClientRects().
   */
  function getValidSelectionRect(range) {
    if (!range) return null;

    try {
      const rect = range.getBoundingClientRect();
      if (rect && isFinite(rect.top) && isFinite(rect.left) && (rect.width > 0 || rect.height > 0)) {
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height
        };
      }

      if (typeof range.getClientRects === 'function') {
        const clientRects = Array.from(range.getClientRects()).filter(
          r => r && isFinite(r.top) && isFinite(r.left) && (r.width > 0 || r.height > 0)
        );
        if (clientRects.length > 0) {
          let minTop = Infinity, maxBottom = -Infinity, minLeft = Infinity, maxRight = -Infinity;
          clientRects.forEach(r => {
            if (r.top < minTop) minTop = r.top;
            if (r.bottom > maxBottom) maxBottom = r.bottom;
            if (r.left < minLeft) minLeft = r.left;
            if (r.right > maxRight) maxRight = r.right;
          });
          return {
            top: minTop,
            bottom: maxBottom,
            left: minLeft,
            right: maxRight,
            width: maxRight - minLeft,
            height: maxBottom - minTop
          };
        }
      }
    } catch (err) {
      console.error('[LinkedIn Text Formatter] Error measuring selection rectangle:', err);
    }

    return null;
  }

  /**
   * Pure function: calculates viewport-relative coordinates for positioning the toolbar.
   */
  function calculateToolbarPosition(selectionRect, toolbarRect, viewportRect, gap = 8, margin = 8) {
    if (!selectionRect || !toolbarRect || !viewportRect) {
      return null;
    }

    if (!isFinite(selectionRect.left) || !isFinite(selectionRect.top) ||
        !isFinite(toolbarRect.width) || !isFinite(toolbarRect.height)) {
      return null;
    }

    if (selectionRect.width === 0 && selectionRect.height === 0) {
      return null;
    }

    // 1. Horizontal center alignment relative to selection
    let left = selectionRect.left + (selectionRect.width / 2) - (toolbarRect.width / 2);

    // 2. Clamp horizontal within viewport bounds
    const maxLeft = Math.max(margin, viewportRect.width - toolbarRect.width - margin);
    left = Math.max(margin, Math.min(left, maxLeft));

    // 3. Vertical positioning: prefer placement above selection
    const topAbove = selectionRect.top - toolbarRect.height - gap;
    let top = topAbove;
    let placement = 'above';

    if (topAbove < margin) {
      // Insufficient space above: try placing below selection
      const topBelow = selectionRect.bottom + gap;
      if (topBelow + toolbarRect.height <= viewportRect.height - margin) {
        top = topBelow;
        placement = 'below';
      } else {
        // Insufficient space both above and below: clamp within viewport
        const maxTop = Math.max(margin, viewportRect.height - toolbarRect.height - margin);
        top = Math.max(margin, Math.min(topAbove, maxTop));
        placement = 'clamped';
      }
    }

    return {
      top: Math.round(top),
      left: Math.round(left),
      placement
    };
  }

  /**
   * Creates or reuses the single canonical toolbar DOM element.
   */
  function createToolbarElement(editor) {
    const targetHost = resolveToolbarHost(editor);

    // 1. If canonical in-memory toolbarElement reference exists and is connected
    if (toolbarElement) {
      const isConn = typeof toolbarElement.isConnected === 'boolean' ? toolbarElement.isConnected : (toolbarElement.ownerDocument && toolbarElement.ownerDocument.body.contains(toolbarElement));
      if (isConn || toolbarElement.parentNode) {
        if (toolbarElement.parentElement !== targetHost) {
          targetHost.appendChild(toolbarElement);
          debugLog('[LinkedIn Text Formatter] Canonical toolbar reparented.');
        } else {
          debugLog('[LinkedIn Text Formatter] Canonical toolbar reused.');
        }
        cleanupDuplicateToolbars(targetHost, toolbarElement);
        return toolbarElement;
      }
    }

    // 2. Root-aware fallback lookup
    let existing = null;
    if (targetHost && typeof targetHost.querySelector === 'function') {
      existing = targetHost.querySelector('#ltf-floating-toolbar[data-linkedin-text-formatter="true"]');
    }
    if (!existing && typeof document !== 'undefined' && typeof document.querySelector === 'function') {
      existing = document.querySelector('#ltf-floating-toolbar[data-linkedin-text-formatter="true"]');
    }

    if (existing) {
      toolbarElement = existing;
      if (toolbarElement.parentElement !== targetHost) {
        targetHost.appendChild(toolbarElement);
        debugLog('[LinkedIn Text Formatter] Canonical toolbar reparented.');
      } else {
        debugLog('[LinkedIn Text Formatter] Canonical toolbar reused.');
      }
      cleanupDuplicateToolbars(targetHost, toolbarElement);
      return toolbarElement;
    }

    // 3. Create new canonical toolbar element
    debugLog('[LinkedIn Text Formatter] Canonical toolbar created.');
    const doc = (targetHost && targetHost.ownerDocument) ? targetHost.ownerDocument : document;
    const toolbar = doc.createElement('div');
    toolbar.id = 'ltf-floating-toolbar';
    toolbar.className = 'ltf-toolbar ltf-toolbar--hidden';
    toolbar.style.display = 'none';
    toolbar.setAttribute('data-linkedin-text-formatter', 'true');
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Text formatting tools');
    toolbar.setAttribute('aria-hidden', 'true');

    // Register capture phase listeners on toolbar container
    toolbar.addEventListener('pointerdown', () => {
      debugLog('[LinkedIn Text Formatter] Toolbar button pointerdown received');
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
        debugLog('[LinkedIn Text Formatter] protected interaction started');
      }
    }, { capture: true });

    toolbar.addEventListener('mousedown', () => {
      debugLog('[LinkedIn Text Formatter] mousedown received');
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
        debugLog('[LinkedIn Text Formatter] protected interaction started');
      }
    }, { capture: true });

    toolbar.addEventListener('mouseup', () => {
      debugLog('[LinkedIn Text Formatter] mouseup received');
    }, { capture: true });

    toolbar.addEventListener('click', (e) => {
      debugLog('[LinkedIn Text Formatter] Toolbar button click received');
      const target = e.target;
      const btn = target ? (typeof target.closest === 'function' ? target.closest('[data-action]') : null) : null;
      if (btn) {
        const actionStyle = btn.getAttribute('data-action');
        debugLog(`[LinkedIn Text Formatter] Button action resolved: ${actionStyle}`);
        if (actionStyle) {
          handleButtonClick(actionStyle);
        }
      }
    }, { capture: true });

    BUTTON_CONFIGS.forEach((config) => {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = `ltf-toolbar__button ${config.className}`;
      btn.setAttribute('data-action', config.action);
      btn.setAttribute('data-linkedin-text-formatter', 'true');
      btn.setAttribute('aria-label', config.ariaLabel);
      btn.setAttribute('title', config.title);
      btn.textContent = config.label;

      btn.addEventListener('focus', () => {
        const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
        if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
          SelectionManager.beginProtectedInteraction();
        }
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          debugLog('[LinkedIn Text Formatter] keyboard activation received');
          const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
          if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
            SelectionManager.beginProtectedInteraction();
          }
          handleButtonClick(config.action);
        }
      });

      toolbar.appendChild(btn);
    });

    targetHost.appendChild(toolbar);
    toolbarElement = toolbar;
    cleanupDuplicateToolbars(targetHost, toolbarElement);
    return toolbarElement;
  }

  /**
   * Emits formatting action to registered listeners.
   */
  function handleButtonClick(actionStyle) {
    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    let savedRange = null;

    if (SelectionManager) {
      if (typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
      }
      if (typeof SelectionManager.getSavedRange === 'function') {
        savedRange = SelectionManager.getSavedRange();
      }
    }

    debugLog(`[LinkedIn Text Formatter] Toolbar action requested: ${actionStyle}`);
    debugLog(`[LinkedIn Text Formatter] Number of registered action callbacks: ${formatActionCallbacks.length}`);
    debugLog('[LinkedIn Text Formatter] Format action emitted');

    formatActionCallbacks.forEach((cb) => {
      try {
        cb(actionStyle, savedRange);
      } catch (err) {
        console.error('[LinkedIn Text Formatter] Error in format action callback:', err);
      }
    });

    Promise.resolve().then(() => {
      if (SelectionManager && typeof SelectionManager.endProtectedInteraction === 'function') {
        SelectionManager.endProtectedInteraction();
        debugLog('[LinkedIn Text Formatter] protected interaction ended');
      }
    });
  }

  /**
   * Hides the toolbar with diagnostic reason logging.
   */
  function hide(reason = 'manual') {
    if (pendingShowFrame) {
      cancelAnimationFrame(pendingShowFrame);
      pendingShowFrame = null;
    }
    debugLog(`[LinkedIn Text Formatter] Toolbar hidden. Reason: ${reason}`);
    if (toolbarElement) {
      toolbarElement.classList.add('ltf-toolbar--hidden');
      toolbarElement.style.display = 'none';
      toolbarElement.style.visibility = 'hidden';
      toolbarElement.style.opacity = '0';
      toolbarElement.style.pointerEvents = 'none';
      toolbarElement.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Checks if toolbar is hidden or disconnected.
   */
  function isHidden() {
    if (!toolbarElement) return true;
    if (toolbarElement.classList.contains('ltf-toolbar--hidden') ||
        toolbarElement.style.display === 'none' ||
        toolbarElement.style.visibility === 'hidden') {
      return true;
    }
    if (typeof toolbarElement.isConnected === 'boolean') {
      return !toolbarElement.isConnected;
    }
    const root = toolbarElement.getRootNode ? toolbarElement.getRootNode() : null;
    if (root && root.nodeType === 11 /* ShadowRoot */ && root.host) {
      return root.host.isConnected === false;
    }
    const doc = toolbarElement.ownerDocument || document;
    return doc.body && !doc.body.contains(toolbarElement);
  }

  /**
   * Returns visibility status.
   */
  function isVisible() {
    return !isHidden();
  }

  /**
   * Measures and repositions the toolbar relative to the given range or saved range.
   */
  function positionToolbar(rangeToPosition) {
    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    const range = rangeToPosition || (SelectionManager && typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null);
    const editor = SelectionManager && typeof SelectionManager.getSavedEditor === 'function' ? SelectionManager.getSavedEditor() : null;

    if (!range) {
      debugLog('[LinkedIn Text Formatter] Saved range validation failed: No range retrieved.');
      hide('no-range-for-positioning');
      return false;
    }

    if (SelectionManager && typeof SelectionManager.hasValidSelection === 'function' && !SelectionManager.hasValidSelection()) {
      debugLog('[LinkedIn Text Formatter] Saved range validation failed: SelectionManager reports selection invalid.');
      hide('selection-invalidated-during-positioning');
      return false;
    }
    debugLog('[LinkedIn Text Formatter] Saved range validation passed.');

    // Step 1: Ensure element exists & attached inside active composer host
    createToolbarElement(editor);

    // Step 2: Put into measurable but temporarily non-visible state
    toolbarElement.classList.remove('ltf-toolbar--hidden');
    toolbarElement.removeAttribute('hidden');
    toolbarElement.style.display = 'flex';
    toolbarElement.style.visibility = 'hidden';
    toolbarElement.style.opacity = '0';
    toolbarElement.style.pointerEvents = 'none';

    // Step 3: Measure toolbar
    const toolbarRect = toolbarElement.getBoundingClientRect();
    debugLog(`[LinkedIn Text Formatter] Toolbar rectangle measured: ${toolbarRect.width}x${toolbarRect.height}.`);

    // Step 4: Measure range
    const selectionRect = getValidSelectionRect(range);
    if (!selectionRect) {
      debugLog('[LinkedIn Text Formatter] Selection rectangle measurement failed: 0x0 or invalid rect.');
      hide('invalid-selection-rect');
      return false;
    }
    debugLog(`[LinkedIn Text Formatter] Selection rectangle measured: ${selectionRect.width}x${selectionRect.height} at (${selectionRect.left}, ${selectionRect.top}).`);

    // Step 5: Calculate position
    const viewportRect = {
      width: window.innerWidth || document.documentElement.clientWidth || 1024,
      height: window.innerHeight || document.documentElement.clientHeight || 768
    };

    const pos = calculateToolbarPosition(selectionRect, toolbarRect, viewportRect);
    if (!pos) {
      debugLog('[LinkedIn Text Formatter] Position calculation failed.');
      hide('position-calculation-failed');
      return false;
    }
    debugLog(`[LinkedIn Text Formatter] Position calculated: top=${pos.top}px, left=${pos.left}px (placement: ${pos.placement}).`);

    // Step 6: Apply top and left
    toolbarElement.style.top = `${pos.top}px`;
    toolbarElement.style.left = `${pos.left}px`;

    // Step 7: Apply visible state
    toolbarElement.style.visibility = 'visible';
    toolbarElement.style.opacity = '1';
    toolbarElement.style.pointerEvents = 'auto';
    toolbarElement.setAttribute('aria-hidden', 'false');

    debugLog('[LinkedIn Text Formatter] Toolbar visible state applied successfully.');
    return true;
  }

  /**
   * Repositions the toolbar relative to the active selection.
   */
  function reposition() {
    if (!toolbarElement || isHidden()) return;
    positionToolbar();
  }

  /**
   * Displays the toolbar near the supplied or saved selection range.
   * Coalesces rapid updates into a single animation frame.
   */
  function show(suppliedRange) {
    if (pendingShowFrame) {
      cancelAnimationFrame(pendingShowFrame);
      debugLog('[LinkedIn Text Formatter] Selection update coalesced.');
    }
    pendingShowFrame = requestAnimationFrame(() => {
      pendingShowFrame = null;
      debugLog('[LinkedIn Text Formatter] show() requested.');
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      const range = suppliedRange || (SelectionManager && typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null);

      if (!range) {
        debugLog('[LinkedIn Text Formatter] show() failed: No valid range retrieved.');
        hide('no-range-on-show');
        return;
      }
      debugLog('[LinkedIn Text Formatter] Saved range retrieved.');

      positionToolbar(range);
    });
  }

  /**
   * Optimized scroll and resize handler.
   */
  function handleScrollOrResize() {
    if (isHidden()) return;

    if (rAFScrollId) {
      cancelAnimationFrame(rAFScrollId);
    }

    rAFScrollId = requestAnimationFrame(() => {
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      if (SelectionManager && typeof SelectionManager.hasValidSelection === 'function' && SelectionManager.hasValidSelection()) {
        reposition();
      } else {
        hide('scroll-invalidated');
      }
    });
  }

  /**
   * Subscribes a callback to format action requests.
   */
  function onFormatAction(callback) {
    if (typeof callback === 'function') {
      formatActionCallbacks.push(callback);
    }
  }

  /**
   * Initializes the ToolbarManager.
   */
  function initialize() {
    debugLog('[LinkedIn Text Formatter] ToolbarManager initialization started.');
    if (isInitialized) {
      debugLog('[LinkedIn Text Formatter] ToolbarManager already initialized.');
      return;
    }
    isInitialized = true;

    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    const editor = SelectionManager && typeof SelectionManager.getSavedEditor === 'function' ? SelectionManager.getSavedEditor() : null;

    // Create single element instance inside active dialog if present
    createToolbarElement(editor);

    // Subscribe to SelectionManager events if available - strictly ONCE
    if (SelectionManager) {
      if (typeof SelectionManager.onSelectionValid === 'function') {
        SelectionManager.onSelectionValid(() => {
          debugLog('[LinkedIn Text Formatter] Selection-valid callback received.');
          const range = typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null;
          show(range);
        });
        selectionSubscriptionCount++;
        debugLog('[LinkedIn Text Formatter] Selection-valid callback registered.');
      }

      if (typeof SelectionManager.onSelectionInvalid === 'function') {
        SelectionManager.onSelectionInvalid(() => {
          hide('selection-invalidated');
        });
      }
    } else {
      debugLog('[LinkedIn Text Formatter] SelectionManager not found during ToolbarManager initialization.');
    }

    // Scroll & resize event listeners
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    // Keyboard listener for Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isVisible()) {
        hide('escape-key');
      }
    });
  }

  /**
   * Destroys the toolbar instance and removes listeners.
   */
  function destroy() {
    if (pendingShowFrame) {
      cancelAnimationFrame(pendingShowFrame);
      pendingShowFrame = null;
    }
    if (rAFScrollId) {
      cancelAnimationFrame(rAFScrollId);
      rAFScrollId = null;
    }

    window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    window.removeEventListener('resize', handleScrollOrResize);

    if (toolbarElement && toolbarElement.parentElement) {
      toolbarElement.parentElement.removeChild(toolbarElement);
    }

    toolbarElement = null;
    isInitialized = false;
    selectionSubscriptionCount = 0;
    formatActionCallbacks.length = 0;
  }

  // Export ToolbarManager API
  window.LinkedInTextFormatter.ToolbarManager = {
    initialize,
    show,
    hide,
    reposition,
    isVisible,
    getElement: () => toolbarElement,
    getSelectionSubscriptionCount: () => selectionSubscriptionCount,
    resolveToolbarHost,
    destroy,
    onFormatAction,
    BUTTON_CONFIGS
  };

  // Export pure functions for testing context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      ToolbarManager: window.LinkedInTextFormatter.ToolbarManager,
      calculateToolbarPosition,
      getValidSelectionRect,
      resolveToolbarHost,
      ensureShadowToolbarStyles,
      cleanupDuplicateToolbars,
      BUTTON_CONFIGS,
      formatActionCallbacks,
      initialize,
      show,
      hide,
      reposition,
      isVisible,
      destroy,
      onFormatAction
    };
  }
})();
