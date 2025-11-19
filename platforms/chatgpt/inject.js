/**
 * ChatGPT Platform - Page Context Script (inject.js)
 * 
 * This script runs in the page context to intercept ChatGPT's fetch calls
 * and capture conversation JSON payloads.
 */

(function () {
  'use strict';

  const PLATFORM = 'ChatGPT';
  const MESSAGE_TYPE = 'CHATGPT_CONVERSATION_DATA';
  const SOURCE_ID = 'chatgpt-exporter-inject';

  // Store the original fetch function
  const originalFetch = window.fetch;

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

      // Check if this is a conversation API request
      const isConversationRequest = url && (
        url.includes('/backend-api/conversation/') ||
        url.includes('/api/conversation/') ||
        url.match(/\/conversation\/[a-f0-9-]+/i)
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
            if (data && (data.mapping || data.conversation_id || data.id)) {
              // Send to content script via postMessage
              window.postMessage(
                {
                  type: MESSAGE_TYPE,
                  payload: data,
                  source: SOURCE_ID,
                  platform: 'chatgpt'
                },
                window.location.origin
              );

              console.log(`[${PLATFORM}] ✓ Captured conversation data`, {
                conversationId: data.conversation_id || data.id,
                nodeCount: data.mapping ? Object.keys(data.mapping).length : 0,
                hasMapping: !!data.mapping
              });
            } else {
              console.log(`[${PLATFORM}] Response does not look like conversation data`);
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


