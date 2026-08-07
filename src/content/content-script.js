/**
 * content-script.js
 *
 * Primary entry point for the content script injected into LinkedIn pages.
 * Coordinates the scored multi-signal editor detector, selection manager, toolbar manager, and text replacement manager.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  // Check if already initialized to prevent duplicate setups
  if (window.LinkedInTextFormatter.initialized) {
    return;
  }
  window.LinkedInTextFormatter.initialized = true;
  const DEBUG = false;
  function debugLog(...args) { if (DEBUG) console.log(...args); }

  const currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
  debugLog(`[LinkedIn Text Formatter] Initialized: ${currentPath}`);

  debugLog('[LinkedIn Text Formatter] Editor detector initialized.');
  if (window.LinkedInTextFormatter.SelectionManager) {
    debugLog('[LinkedIn Text Formatter] Selection manager initialized.');
  }
  if (window.LinkedInTextFormatter.ToolbarManager) {
    window.LinkedInTextFormatter.ToolbarManager.initialize();
    debugLog('[LinkedIn Text Formatter] Toolbar manager initialized.');
  }
  if (window.LinkedInTextFormatter.TextReplacementManager) {
    window.LinkedInTextFormatter.TextReplacementManager.initialize();
  }

  // Keep track of the last checked editor element
  let lastCheckedElement = null;
  let lastPath = currentPath;

  // Monitor focus events on the document
  document.addEventListener('focusin', (event) => {
    if (lastCheckedElement && !document.body.contains(lastCheckedElement) && !lastCheckedElement.isConnected) {
      lastCheckedElement = null;
    }
    checkRouteChange();
    handleElementCheck(event.target, event);
  });

  // Monitor click events on the document
  document.addEventListener('click', (event) => {
    if (lastCheckedElement && !document.body.contains(lastCheckedElement) && !lastCheckedElement.isConnected) {
      lastCheckedElement = null;
    }
    checkRouteChange();
    handleElementCheck(event.target, event);
  });

  // Helper to run detection and log details using composedPath inspection
  function handleElementCheck(target, event) {
    if (!target && !event) return;

    let targetElement = target;

    // Inspect composedPath if event is available to handle Shadow DOM retargeting
    const composedResolver = window.LinkedInTextFormatter.resolveEditableFromComposedPath;
    if (event && composedResolver) {
      const composedRoot = composedResolver(event);
      if (composedRoot) {
        targetElement = composedRoot;
      }
    }
    
    // Resolve to the editable root
    const resolver = window.LinkedInTextFormatter.resolveToEditableRoot;
    if (!resolver) return;
    
    const root = resolver(targetElement);
    if (!root) {
      return; // Not in an editable element, ignore silently
    }

    // Only evaluate and log if the active element has changed
    if (root === lastCheckedElement) {
      return;
    }
    lastCheckedElement = root;

    const detector = window.LinkedInTextFormatter.checkEditorSupport;
    if (detector) {
      const result = detector(root);
      if (result.supported) {
        if (window.LinkedInTextFormatter.SelectionManager && typeof window.LinkedInTextFormatter.SelectionManager.setActiveEditor === 'function') {
          window.LinkedInTextFormatter.SelectionManager.setActiveEditor(root);
        }
        const rootNode = root.getRootNode ? root.getRootNode() : null;
        const isShadow = rootNode && rootNode.nodeType === 11;
        if (isShadow) {
          const hostElem = rootNode.host;
          const hostIdStr = hostElem && hostElem.id ? `DIV#${hostElem.id}` : 'Shadow host';
          debugLog(`[LinkedIn Text Formatter] Shadow DOM editor detected (host: ${hostIdStr}).`);
        } else {
          debugLog('[LinkedIn Text Formatter] Direct-document editor detected.');
        }
      } else {
        debugLog(`[LinkedIn Text Formatter] Unsupported editable element ignored: ${result.reason}`);
      }
    }
  }

  // Monitor single-page application (SPA) routing changes
  function checkRouteChange() {
    const activePath = window.location.pathname;
    if (activePath !== lastPath) {
      lastPath = activePath;
      debugLog('[LinkedIn Text Formatter] LinkedIn route change detected.');
      // Clear last checked element when route changes
      lastCheckedElement = null;
    }
  }

  // Also listen for popstate (back/forward navigation) as a supplementary signal
  window.addEventListener('popstate', () => {
    if (lastCheckedElement && !document.body.contains(lastCheckedElement) && !lastCheckedElement.isConnected) {
      lastCheckedElement = null;
    }
    checkRouteChange();
  });
})();
