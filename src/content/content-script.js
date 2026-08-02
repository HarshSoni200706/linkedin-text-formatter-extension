/**
 * content-script.js
 *
 * Primary entry point for the content script injected into LinkedIn pages.
 * Coordinates the scored multi-signal editor detector and selection manager.
 */

(function() {
  // Ensure the extension namespace exists
  window.LinkedInTextFormatter = window.LinkedInTextFormatter || {};

  // Check if already initialized to prevent duplicate setups
  if (window.LinkedInTextFormatter.initialized) {
    return;
  }
  window.LinkedInTextFormatter.initialized = true;

  console.log('[LinkedIn Text Formatter] Editor detector initialized.');
  if (window.LinkedInTextFormatter.SelectionManager) {
    console.log('[LinkedIn Text Formatter] Selection manager initialized.');
  }
  if (window.LinkedInTextFormatter.ToolbarManager) {
    window.LinkedInTextFormatter.ToolbarManager.initialize();
    console.log('[LinkedIn Text Formatter] Toolbar manager initialized.');
  }

  // Keep track of the last checked editor element
  let lastCheckedElement = null;
  let lastPath = window.location.pathname;

  // Monitor focus events on the document
  document.addEventListener('focusin', (event) => {
    // Clear cache if the previously checked element was removed from the DOM
    if (lastCheckedElement && !document.body.contains(lastCheckedElement)) {
      lastCheckedElement = null;
    }
    checkRouteChange();
    handleElementCheck(event.target);
  });

  // Monitor click events on the document (in case click doesn't trigger focusin but changes focus)
  document.addEventListener('click', (event) => {
    if (lastCheckedElement && !document.body.contains(lastCheckedElement)) {
      lastCheckedElement = null;
    }
    checkRouteChange();
    handleElementCheck(event.target);
  });

  // Helper to run detection and log details without collecting user text
  function handleElementCheck(target) {
    if (!target) return;
    
    // Resolve to the editable root
    const resolver = window.LinkedInTextFormatter.resolveToEditableRoot;
    if (!resolver) return;
    
    const root = resolver(target);
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
        console.log('[LinkedIn Text Formatter] Supported LinkedIn post editor detected.');
      } else {
        console.log(`[LinkedIn Text Formatter] Unsupported editable element ignored: ${result.reason}`);
      }
    }
  }

  // Monitor single-page application (SPA) routing changes
  function checkRouteChange() {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      console.log('[LinkedIn Text Formatter] LinkedIn route change detected.');
      // Clear last checked element when route changes
      lastCheckedElement = null;
    }
  }

  // Also listen for popstate (back/forward navigation) as a supplementary signal
  window.addEventListener('popstate', () => {
    if (lastCheckedElement && !document.body.contains(lastCheckedElement)) {
      lastCheckedElement = null;
    }
    checkRouteChange();
  });
})();
