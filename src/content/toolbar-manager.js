/**
 * toolbar-manager.js
 *
 * Manages the floating formatting toolbar DOM element.
 * Responsible for creating, positioning, displaying, and hiding the toolbar near the user's text selection.
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

  const BUTTON_CONFIGS = [
    {
      action: FORMAT_STYLES.BOLD,
      label: 'B',
      title: 'Bold',
      ariaLabel: 'Format text as Bold',
      className: 'ltf-toolbar__button--bold'
    },
    {
      action: FORMAT_STYLES.ITALIC,
      label: 'I',
      title: 'Italic',
      ariaLabel: 'Format text as Italic',
      className: 'ltf-toolbar__button--italic'
    },
    {
      action: FORMAT_STYLES.BOLD_ITALIC,
      label: 'BI',
      title: 'Bold Italic',
      ariaLabel: 'Format text as Bold Italic',
      className: 'ltf-toolbar__button--bold-italic'
    },
    {
      action: FORMAT_STYLES.UNDERLINE,
      label: 'U',
      title: 'Underline',
      ariaLabel: 'Format text as Underline',
      className: 'ltf-toolbar__button--underline'
    },
    {
      action: FORMAT_STYLES.DOUBLE_UNDERLINE,
      label: 'U',
      title: 'Double Underline',
      ariaLabel: 'Format text as Double Underline',
      className: 'ltf-toolbar__button--double-underline'
    }
  ];

  let toolbarElement = null;
  let isInitialized = false;
  let rAFScrollId = null;
  const formatActionCallbacks = [];

  /**
   * Resolves the host element for the toolbar.
   * Prefers the active composer dialog containing the editor, with fallback to document.body.
   */
  function resolveToolbarHost(editor) {
    if (editor && typeof editor.closest === 'function') {
      const activeDialog = editor.closest('dialog[open]') || editor.closest('[role="dialog"]');
      if (activeDialog) {
        return activeDialog;
      }
    }
    return document.body;
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
   * Creates the single toolbar DOM element if it doesn't already exist, or reuses it.
   * Ensures the toolbar is attached inside the saved editor's active dialog.
   */
  function createToolbarElement(editor) {
    const targetHost = resolveToolbarHost(editor);
    const existing = document.getElementById('ltf-floating-toolbar');

    if (existing) {
      if (existing.parentElement !== targetHost) {
        targetHost.appendChild(existing);
      }
      toolbarElement = existing;
      console.log('[LinkedIn Text Formatter] Toolbar element reused.');
      return toolbarElement;
    }

    console.log('[LinkedIn Text Formatter] Toolbar element created.');
    const toolbar = document.createElement('div');
    toolbar.id = 'ltf-floating-toolbar';
    toolbar.className = 'ltf-toolbar ltf-toolbar--hidden';
    toolbar.style.display = 'none';
    toolbar.setAttribute('data-linkedin-text-formatter', 'true');
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Text formatting tools');
    toolbar.setAttribute('aria-hidden', 'true');

    // Register capture phase listeners on toolbar container
    toolbar.addEventListener('pointerdown', () => {
      console.log('[LinkedIn Text Formatter] pointerdown received');
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
        console.log('[LinkedIn Text Formatter] protected interaction started');
      }
    }, { capture: true });

    toolbar.addEventListener('mousedown', () => {
      console.log('[LinkedIn Text Formatter] mousedown received');
      const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
      if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
        SelectionManager.beginProtectedInteraction();
        console.log('[LinkedIn Text Formatter] protected interaction started');
      }
    }, { capture: true });

    toolbar.addEventListener('mouseup', () => {
      console.log('[LinkedIn Text Formatter] mouseup received');
    }, { capture: true });

    BUTTON_CONFIGS.forEach((config) => {
      const btn = document.createElement('button');
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
          console.log('[LinkedIn Text Formatter] keyboard activation received');
          const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
          if (SelectionManager && typeof SelectionManager.beginProtectedInteraction === 'function') {
            SelectionManager.beginProtectedInteraction();
          }
        }
      });

      btn.addEventListener('click', (e) => {
        console.log('[LinkedIn Text Formatter] click received');
        handleButtonClick(config.action);
      });

      toolbar.appendChild(btn);
    });

    targetHost.appendChild(toolbar);
    toolbarElement = toolbar;
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

    console.log(`[LinkedIn Text Formatter] Toolbar action requested: ${actionStyle}`);
    console.log('[LinkedIn Text Formatter] formatting action emitted');

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
        console.log('[LinkedIn Text Formatter] protected interaction ended');
      }
    });
  }

  /**
   * Hides the toolbar with diagnostic reason logging.
   */
  function hide(reason = 'manual') {
    console.log(`[LinkedIn Text Formatter] Toolbar hidden. Reason: ${reason}`);
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
    return (
      toolbarElement.classList.contains('ltf-toolbar--hidden') ||
      toolbarElement.style.display === 'none' ||
      toolbarElement.style.visibility === 'hidden' ||
      !document.body.contains(toolbarElement)
    );
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
      console.log('[LinkedIn Text Formatter] Saved range validation failed: No range retrieved.');
      hide('no-range-for-positioning');
      return false;
    }

    if (SelectionManager && typeof SelectionManager.hasValidSelection === 'function' && !SelectionManager.hasValidSelection()) {
      console.log('[LinkedIn Text Formatter] Saved range validation failed: SelectionManager reports selection invalid.');
      hide('selection-invalidated-during-positioning');
      return false;
    }
    console.log('[LinkedIn Text Formatter] Saved range validation passed.');

    // Step 1: Ensure element exists & attached inside active composer dialog
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
    console.log(`[LinkedIn Text Formatter] Toolbar rectangle measured: ${toolbarRect.width}x${toolbarRect.height}.`);

    // Step 4: Measure range
    const selectionRect = getValidSelectionRect(range);
    if (!selectionRect) {
      console.log('[LinkedIn Text Formatter] Selection rectangle measurement failed: 0x0 or invalid rect.');
      hide('invalid-selection-rect');
      return false;
    }
    console.log(`[LinkedIn Text Formatter] Selection rectangle measured: ${selectionRect.width}x${selectionRect.height} at (${selectionRect.left}, ${selectionRect.top}).`);

    // Step 5: Calculate position
    const viewportRect = {
      width: window.innerWidth || document.documentElement.clientWidth || 1024,
      height: window.innerHeight || document.documentElement.clientHeight || 768
    };

    const pos = calculateToolbarPosition(selectionRect, toolbarRect, viewportRect);
    if (!pos) {
      console.log('[LinkedIn Text Formatter] Position calculation failed.');
      hide('position-calculation-failed');
      return false;
    }
    console.log(`[LinkedIn Text Formatter] Position calculated: top=${pos.top}px, left=${pos.left}px (placement: ${pos.placement}).`);

    // Step 6: Apply top and left
    toolbarElement.style.top = `${pos.top}px`;
    toolbarElement.style.left = `${pos.left}px`;

    // Step 7: Apply visible state
    toolbarElement.style.visibility = 'visible';
    toolbarElement.style.opacity = '1';
    toolbarElement.style.pointerEvents = 'auto';
    toolbarElement.setAttribute('aria-hidden', 'false');

    console.log('[LinkedIn Text Formatter] Toolbar visible state applied successfully.');

    // Step 8: Concise temporary state diagnostic
    try {
      const parent = toolbarElement.parentElement;
      const parentTag = parent ? parent.tagName : 'NULL';
      const isDialogParent = parent && (parent.tagName === 'DIALOG' || parent.getAttribute('role') === 'dialog');
      const rect = toolbarElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const hitElement = document.elementFromPoint ? document.elementFromPoint(centerX, centerY) : null;
      const hitTag = hitElement ? hitElement.tagName : 'NULL';

      console.log(`[LinkedIn Text Formatter] State Diagnostic: parent=${parentTag} (isDialog=${isDialogParent}), hidden=${toolbarElement.hidden}, aria-hidden=${toolbarElement.getAttribute('aria-hidden')}, display=${toolbarElement.style.display}, visibility=${toolbarElement.style.visibility}, opacity=${toolbarElement.style.opacity}, pointer-events=${toolbarElement.style.pointerEvents}, z-index=${window.getComputedStyle ? window.getComputedStyle(toolbarElement).zIndex : 'N/A'}, rect=${rect.width}x${rect.height} at (${rect.left}, ${pos.top}), hitElement=${hitTag}`);
    } catch (diagErr) {
      console.error('[LinkedIn Text Formatter] Diagnostic logging error:', diagErr);
    }

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
   */
  function show(suppliedRange) {
    console.log('[LinkedIn Text Formatter] show() requested.');
    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    const range = suppliedRange || (SelectionManager && typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null);

    if (!range) {
      console.log('[LinkedIn Text Formatter] show() failed: No valid range retrieved.');
      hide('no-range-on-show');
      return;
    }
    console.log('[LinkedIn Text Formatter] Saved range retrieved.');

    positionToolbar(range);
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
    console.log('[LinkedIn Text Formatter] ToolbarManager initialization started.');
    if (isInitialized) {
      console.log('[LinkedIn Text Formatter] ToolbarManager already initialized.');
      return;
    }
    isInitialized = true;

    const SelectionManager = window.LinkedInTextFormatter.SelectionManager;
    const editor = SelectionManager && typeof SelectionManager.getSavedEditor === 'function' ? SelectionManager.getSavedEditor() : null;

    // Create single element instance inside active dialog if present
    createToolbarElement(editor);

    // Subscribe to SelectionManager events if available
    if (SelectionManager) {
      if (typeof SelectionManager.onSelectionValid === 'function') {
        SelectionManager.onSelectionValid(() => {
          console.log('[LinkedIn Text Formatter] Selection-valid callback received.');
          const range = typeof SelectionManager.getSavedRange === 'function' ? SelectionManager.getSavedRange() : null;
          show(range);
        });
        console.log('[LinkedIn Text Formatter] Selection-valid callback registered.');
      }

      if (typeof SelectionManager.onSelectionInvalid === 'function') {
        SelectionManager.onSelectionInvalid(() => {
          hide('selection-invalidated');
        });
      }
    } else {
      console.log('[LinkedIn Text Formatter] SelectionManager not found during ToolbarManager initialization.');
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
    if (rAFScrollId) cancelAnimationFrame(rAFScrollId);

    window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    window.removeEventListener('resize', handleScrollOrResize);

    if (toolbarElement && toolbarElement.parentElement) {
      toolbarElement.parentElement.removeChild(toolbarElement);
    }

    toolbarElement = null;
    isInitialized = false;
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
    resolveToolbarHost,
    destroy,
    onFormatAction
  };

  // Export pure functions for testing context
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
      calculateToolbarPosition,
      getValidSelectionRect,
      resolveToolbarHost,
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
