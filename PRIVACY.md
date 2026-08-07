# Privacy Policy — LinkedIn Text Formatter

**Effective date:** 2026-08-05  
**Product:** LinkedIn Text Formatter (Chrome Extension)  
**Repository:** https://github.com/HarshSoni200706/linkedin-text-formatter-extension

---

## Data Collection

The LinkedIn Text Formatter does not collect any personal data.

- No text you write or select is recorded, stored, or transmitted.
- No username, email address, profile information, or LinkedIn account data is accessed.
- No device identifiers or browser fingerprinting data are collected.
- No cookies are set or read by this extension.

---

## Data Usage

The extension temporarily reads the text you select inside LinkedIn's Create a Post editor for the sole purpose of converting it to a Unicode-styled equivalent. This reading happens entirely in memory within your browser tab, is never written to disk or any storage API, and becomes unreachable as soon as the formatting transaction completes.

---

## Data Sharing

No data is shared with any third party for any reason.

- There is no backend server.
- There is no analytics provider (Google Analytics, Mixpanel, Segment, or similar).
- There is no error-reporting or telemetry service (Sentry or similar).
- No information is sold, licensed, or transferred.

---

## Data Storage

The extension does not use any persistent storage.

- Chrome Storage API: not used
- `localStorage`: not used
- `sessionStorage`: not used
- `IndexedDB`: not used
- Cookies: not used

---

## Network Communication

The extension makes no network requests of any kind.

- No `fetch`, `XMLHttpRequest`, `WebSocket`, or `sendBeacon` calls are present in the extension code.
- All JavaScript, CSS, and assets are bundled locally inside the extension package.
- No remote fonts, remote scripts, or CDN resources are loaded.
- The GitHub repository link in the popup is user-initiated navigation only. Clicking it opens the repository page in a new browser tab. No text or data is sent to GitHub by the extension.

---

## Permissions

The extension requests no Chrome permissions beyond the minimum required to operate.

| Permission | Used for |
|---|---|
| Content script on `https://www.linkedin.com/*` | Detecting the LinkedIn post editor and injecting the formatting toolbar into LinkedIn pages only |
| `chrome.runtime.getManifest()` | Reading the extension version number to display in the popup |
| `chrome.tabs.create()` | Opening the GitHub repository link in a new tab when the user clicks it in the popup |

`chrome.tabs.create()` is available to extension popups without requiring a broad `tabs` permission in Manifest V3.

No other permissions are declared or requested.

---

## Third-Party Services

No third-party services, SDKs, scripts, libraries, or APIs are used.

LinkedIn is the host website on which the extension operates. This extension is not affiliated with, endorsed by, or sponsored by LinkedIn Corporation.

---

## Children's Data

This extension does not knowingly collect any information from anyone, including children under 13. No data of any kind is collected.

---

## Changes to This Policy

If the extension's data practices change in a future version, this file will be updated with a new effective date and a summary of the change. The repository commit history provides a permanent audit trail.

---

## Contact

To report a privacy concern, open an issue in the repository:

https://github.com/HarshSoni200706/linkedin-text-formatter-extension/issues
