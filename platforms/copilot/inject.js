/**
 * Copilot Platform - Page Context Script (inject.js)
 * 
 * This script runs in the page context to intercept Copilot's fetch calls
 * and capture conversation JSON payloads.
 */

(function () {
  'use strict';

  const PLATFORM = 'Copilot';
  const MESSAGE_TYPE = 'COPILOT_CONVERSATION_DATA';
  const SOURCE_ID = 'copilot-exporter-inject';

  // Store the original fetch function
  const originalFetch = window.fetch;

  /**
   * Extract conversation ID from Copilot API URL
   * @param {string} url - The API URL
   * @returns {string} The conversation ID or 'unknown'
   */
  function extractConversationIdFromUrl(url) {
    // Match pattern: /c/api/conversations/{conversationId}/history
    const match = url.match(/\/c\/api\/conversations\/([^/]+)\/history/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Hook window.fetch to intercept conversation API responses
   */
  window.fetch = async function (...args) {
    // Call the original fetch
    const response = await originalFetch.apply(this, args);

    try {
      // Extract URL from arguments
      const request = args[0];
      let url = '';

      if (typeof request === 'string') {
        url = request;
      } else if (request instanceof Request) {
        url = request.url;
      } else if (request && typeof request === 'object' && request.url) {
        url = request.url;
      } else {
        url = String(request);
      }

      // Check if this is a conversation history API request
      // Copilot uses URLs like: /c/api/conversations/{conversationId}/history?api-version=2
      const isConversationRequest = url && (
        url.includes('/c/api/conversations/') &&
        url.includes('/history')
      );

      if (isConversationRequest) {
        console.log(`[${PLATFORM}] Detected conversation API request, attempting to capture...`);

        // Check if response is OK before trying to clone
        if (!response.ok) {
          console.log(`[${PLATFORM}] Response not OK, status:`, response.status);
          return response;
        }

        // Clone the response so we can read it without consuming it
        let clone;
        try {
          clone = response.clone();
        } catch (cloneError) {
          console.warn(`[${PLATFORM}] Could not clone response, may already be consumed:`, cloneError);
          return response;
        }

        // Parse the JSON asynchronously
        clone.json()
          .then(data => {
            // Verify this looks like conversation data
            // Copilot conversations have a results array
            if (data && Array.isArray(data.results)) {
              // Extract conversation ID from URL
              const conversationId = extractConversationIdFromUrl(url);

              // Add conversation ID to the payload
              const payloadWithId = {
                ...data,
                conversationId: conversationId
              };

              // Send to content script via postMessage
              window.postMessage(
                {
                  type: MESSAGE_TYPE,
                  payload: payloadWithId,
                  source: SOURCE_ID,
                  platform: 'copilot'
                },
                window.location.origin
              );

              console.log(`[${PLATFORM}] ✓ Captured conversation data`, {
                conversationId: conversationId,
                messageCount: data.results.length,
                hasResults: true
              });
            } else {
              console.log(`[${PLATFORM}] Response does not look like conversation data (missing results array)`);
            }
          })
          .catch(error => {
            console.log(`[${PLATFORM}] Failed to parse response as JSON:`, error.message);
          });
      }
    } catch (e) {
      // Do not break the page if anything goes wrong
      console.debug(`[${PLATFORM}] Error intercepting fetch`, e);
    }

    // Always return the original response
    return response;
  };

  console.log(`[${PLATFORM}] Fetch interceptor installed in page context`);

})();
