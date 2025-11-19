# Security and GDPR Compliance Audit Report

## I. Executive Summary

**Overall Risk Score:** **Medium**

The "AI Chat Exporter" extension is generally well-structured with a strong focus on local processing, which significantly reduces privacy risks. However, it relies on Manifest V2 (deprecated) and has some specific security weaknesses in its message passing and data interception mechanisms. From a GDPR perspective, while it adheres to data minimization and local processing principles, it lacks formal transparency documentation (Privacy Policy) and explicit consent mechanisms for data interception.

**Key Findings:**
*   **Manifest V2 Deprecation:** The extension uses Manifest V2, which is being phased out and will stop working in Firefox and Chrome.
*   **Insecure Message Passing:** The background script does not validate the sender of messages, potentially allowing unauthorized scripts to trigger data processing if they can mimic the message structure.
*   **Broad Data Interception:** The `inject.js` script uses `window.postMessage('*')`, which broadcasts intercepted data to all listeners on the page, not just the extension's content script.
*   **Lack of Formal Privacy Policy:** While the popup claims local processing, there is no link to a comprehensive Privacy Policy as required by GDPR.
*   **Implicit Consent:** Data interception begins automatically upon visiting supported sites without prior explicit user consent.

## II. Security Audit Findings

| ID | Vulnerability/Area | Severity | Description & Location | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Manifest Version** | **High** | `manifest.json` uses `manifest_version: 2`. This is deprecated and poses a long-term availability and security risk. | **Migrate to Manifest V3.** Update `manifest.json` to version 3, replace background scripts with service workers (if needed, though Firefox supports event pages), and update host permissions syntax. |
| **SEC-02** | **Insecure Messaging** | **Medium** | `background.js` (lines 429-461) listens to messages but does not validate `sender.id` or `sender.url`. | **Validate Sender.** Ensure messages originate from the extension itself or trusted content scripts.<br>```javascript<br>browser.runtime.onMessage.addListener((message, sender) => {<br>  if (sender.id !== browser.runtime.id) return;<br>  // ... process message<br>});``` |
| **SEC-03** | **Broad PostMessage** | **Medium** | `platforms/chatgpt/inject.js` (line 78) uses `window.postMessage(..., '*')`. This broadcasts sensitive conversation data to any listener on the page. | **Restrict Target Origin.** Since the content script and injected script share the same origin (the page), use `window.postMessage(..., window.location.origin)` to restrict the target. |
| **SEC-04** | **Web Accessible Resources** | **Low** | `manifest.json` exposes `inject.js` files to the web. While necessary for the current architecture, it increases the attack surface. | **Review Necessity.** In MV3, use `scripting.executeScript` with `world: 'MAIN'` to inject code into the main world without exposing files as web accessible resources if possible, or strictly limit matches. |

## III. GDPR & Privacy Compliance Findings

| ID | Compliance Gap/Area | Risk | GDPR Article(s) | Description & Location | Actionable Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GDPR-01** | **Transparency** | **Medium** | Art. 12, 13 | `popup.html` provides a brief privacy summary but lacks a link to a full Privacy Policy detailing data controller identity, rights, etc. | **Add Privacy Policy Link.** Create a hosted Privacy Policy and link to it prominently in `popup.html` and `manifest.json` (developer settings). |
| **GDPR-02** | **Consent** | **Low** | Art. 6 | Data interception happens automatically on supported sites (`platforms/*/content.js`). While "Performance of Contract" (Art. 6(1)(b)) might be argued, explicit consent is safer. | **Onboarding Consent.** Implement a "Welcome" page or first-run popup that asks the user to confirm they want the extension to activate on visited chat sites. |
| **GDPR-03** | **Data Minimisation** | **Low** | Art. 5(1)(c) | The extension captures full conversation objects. | **Verify Necessity.** Ensure only fields strictly needed for the CSV export are retained in memory. The current implementation seems to flatten and discard some data, which is good. |

## IV. General Recommendations & Next Steps

1.  **Migrate to Manifest V3**: This is the most critical technical step. It involves changing the manifest format and potentially refactoring the background script to be non-persistent (though it already is `persistent: false`).
2.  **Harden `postMessage`**: Change `window.postMessage(payload, '*')` to `window.postMessage(payload, window.location.origin)` in all `inject.js` files.
3.  **Implement Sender Validation**: Add checks in `background.js` to ensure `sender.id === browser.runtime.id`.
4.  **Create a Privacy Policy**: Draft a simple privacy policy hosted on a static page (e.g., GitHub Pages) and link to it.
5.  **Automated Scanning**: Set up `web-ext lint` in the CI/CD pipeline to catch manifest and permission issues early.
