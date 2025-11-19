# Firefox Add-on Policy Compliance Assessment

## Executive Summary
The "AI Chat Exporter" extension generally adheres to Firefox's security and privacy standards, with **one critical violation** regarding the "No Surprises" policy. The extension processes data locally and employs strong internal security measures (HMAC signing, strict CSP). However, the current implementation automatically triggers a file download upon visiting a conversation URL, which constitutes an unexpected user experience.

## Detailed Assessment

### 1. No Surprises (Critical Violation)
**Policy:** "Users... should not be presented with unexpected user experiences after installing it... The features must be 'opt-in'."

-   **Finding:** The extension automatically fetches and downloads conversation data as a CSV file immediately when the user navigates to a conversation URL (e.g., on ChatGPT).
-   **Evidence:**
    -   `platforms/chatgpt/inject.js` monitors URL changes and triggers `fetchConversation`.
    -   `platforms/chatgpt/content.js` receives this data and immediately sends a `CHATGPT_CONVERSATION_DATA` message to `background.js`.
    -   `background.js` receives this message and immediately triggers `browser.downloads.download`.
-   **Impact:** Users will experience uninitiated downloads simply by browsing their chat history. This is highly intrusive and violates the "opt-in" requirement for features that impact the user experience.
-   **Recommendation:** Modify `content.js` to **stop automatically sending data to the background script**. The data should be cached in memory (which is already implemented), and the download should *only* be triggered when the user explicitly clicks the "Export" button in the popup.

### 2. Data Collection and Transmission
**Policy:** "Add-ons must limit data transmission to what is necessary for functionality... Transmitting... ancillary information... is prohibited."

-   **Finding:** Compliant.
-   **Evidence:**
    -   Code analysis of `background.js` and `inject.js` confirms that no data is sent to external third-party servers owned by the developer.
    -   The "Active Fetch" mechanism only communicates with the platform's own API (e.g., `chatgpt.com` -> `chatgpt.com/backend-api`), which is necessary for the extension's primary function (exporting data).
    -   Strict Content Security Policy (CSP) in `manifest.json` (`connect-src 'none'`) enforces this restriction for extension pages.

### 3. Security
**Policy:** "Add-ons must be self-contained... must not relax web page security headers... must use encryption."

-   **Finding:** Compliant (Strong).
-   **Evidence:**
    -   **Internal Communication:** The extension uses a robust HMAC-SHA256 signing mechanism (`shared/message-security.js`) to verify that messages sent from the injected script to the content script are legitimate. This prevents malicious web pages from spoofing data.
    -   **Input Validation:** `background.js` includes size limits (50MB) and structure validation (`validateConversationData`) before processing data.
    -   **CSV Injection Prevention:** The `escapeCSVField` utility is used to sanitize data before export.

### 4. Content and Manifest
**Policy:** "Listings must disclose when payment is required... Add-ons must function only as described."

-   **Finding:** Compliant.
-   **Evidence:**
    -   `manifest.json` permissions (`activeTab`, `downloads`, `scripting`) are minimal and justified.
    -   Host permissions are strictly scoped to the supported platforms.
    -   The description accurately reflects the "local processing" nature of the extension.

## Remediation Plan
To achieve full compliance, the following changes are required:

1.  **Disable Auto-Export:**
    -   In `platforms/chatgpt/content.js` (and other platforms), remove the automatic `browser.runtime.sendMessage` call that occurs immediately after data capture.
    -   Ensure the `CONVERSATION_READY` message is still sent to the popup to update the UI state.
2.  **Verify Manual Export:**
    -   Ensure the `EXPORT_CONVERSATION` listener in `content.js` correctly retrieves the cached data and sends it to the background for processing only when requested.
