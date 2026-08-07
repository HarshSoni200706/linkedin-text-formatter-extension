/**
 * popup.js
 *
 * Popup logic for LinkedIn Text Formatter extension.
 * Dynamically displays manifest version and handles external GitHub link navigation.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Populate extension version dynamically from manifest
  const versionElement = document.getElementById('extension-version');
  if (versionElement) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
          versionElement.textContent = `v${manifest.version}`;
        }
      }
    } catch (err) {
      console.warn('[LinkedIn Text Formatter] Unable to read manifest version, using default fallback:', err);
    }
  }

  // 2. Handle GitHub repository link navigation
  const githubLink = document.getElementById('github-link');
  if (githubLink) {
    githubLink.addEventListener('click', (event) => {
      const targetUrl = githubLink.getAttribute('href');
      if (typeof chrome !== 'undefined' && chrome.tabs && typeof chrome.tabs.create === 'function') {
        event.preventDefault();
        chrome.tabs.create({ url: targetUrl });
      }
      // Standard browser link navigation is allowed as fallback
    });
  }

});
