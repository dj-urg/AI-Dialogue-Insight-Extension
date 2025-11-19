/**
 * ChatGPT Platform - Page Context Script (inject.js)
 * 
 * This script runs in the page context to:
 * 1. Intercept ChatGPT's fetch calls (Passive Strategy)
 * 2. Monitor URL changes and manually fetch data (Active Strategy)
 * 3. Capture authentication headers for active fetching
 */

(function () {
  'use strict';

  const PLATFORM = 'ChatGPT';
  const MESSAGE_TYPE = 'CHATGPT_CONVERSATION_DATA';
  const SOURCE_ID = 'chatgpt-exporter-inject';

  // Store captured conversation IDs to avoid duplicate fetches
  const capturedIds = new Set();

  // Store captured headers for active fetching
  let capturedHeaders = null;

  // Store the original fetch function
  const originalFetch = window.fetch;

  /**
   * Send data to content script
   */
  function sendDataToContentScript(data) {
    if (!data || (!data.mapping && !data.conversation_id)) return;

    const conversationId = data.conversation_id || data.id;
    if (conversationId) {
      capturedIds.add(conversationId);
    }

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
      conversationId: conversationId,
      nodeCount: data.mapping ? Object.keys(data.mapping).length : 0,
      source: 'active-fetch'
    });
  }

  /**
   * Manually fetch conversation data
   */
  async function fetchConversation(conversationId) {
    if (capturedIds.has(conversationId)) {
      console.log(`[${PLATFORM}] Already captured ${conversationId}, skipping active fetch`);
      return;
    }

    if (!capturedHeaders) {
      console.warn(`[${PLATFORM}] Cannot active fetch: No headers captured yet`);
      return;
    }

    console.log(`[${PLATFORM}] Active fetch triggered for conversation ${conversationId}`);

    try {
      const response = await originalFetch(`https://chatgpt.com/backend-api/conversation/${conversationId}`, {
        method: 'GET',
        headers: capturedHeaders
      });

      if (!response.ok) {
        console.warn(`[${PLATFORM}] Active fetch failed: ${response.status}`);
        try {
          const text = await response.text();
          console.log(`[${PLATFORM}] Error response body:`, text);
        } catch (e) {
          console.log(`[${PLATFORM}] Could not read error body`);
        }
        return;
      }

      const data = await response.json();
      sendDataToContentScript(data);

    } catch (error) {
      console.error(`[${PLATFORM}] Active fetch error:`, error);
    }
  }

  /**
   * Check current URL and trigger fetch if it's a conversation
   */
  function checkCurrentUrl() {
    const url = window.location.href;
    const match = url.match(/\/c\/([a-f0-9-]+)/i);

    if (match && match[1]) {
      const conversationId = match[1];
      console.log(`[${PLATFORM}] URL changed to conversation: ${conversationId}`);
      fetchConversation(conversationId);
    }
  }

  /**
   * Hook History API to detect SPA navigation
   */
  function hookHistoryApi() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      checkCurrentUrl();
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      checkCurrentUrl();
      return result;
    };

    window.addEventListener('popstate', checkCurrentUrl);
  }

  /**
   * Hook window.fetch to intercept conversation API responses (Passive Backup)
   */
  window.fetch = async function (...args) {
    // Capture headers from outgoing requests
    try {
      const request = args[0];
      let url = '';
      let options = args[1] || {};

      if (typeof request === 'string') {
        url = request;
      } else if (request instanceof Request) {
        url = request.url;
        // If request is a Request object, we might need to clone it to read headers if they aren't in options
        // But usually for fetch(Request), headers are in the Request object
      }

      // Look for backend-api requests to capture headers
      if (url && url.includes('backend-api') && !capturedHeaders) {
        // Try to extract headers
        let headers = options.headers;

        // If headers are in the Request object
        if (!headers && request instanceof Request) {
          headers = request.headers;
        }

        if (headers) {
          // We need specific headers like Authorization
          // Convert to plain object if it's a Headers object
          const headerObj = {};
          if (headers instanceof Headers) {
            headers.forEach((value, key) => {
              headerObj[key] = value;
            });
          } else {
            Object.assign(headerObj, headers);
          }

          // Check if we have auth token
          if (headerObj['Authorization'] || headerObj['authorization']) {
            capturedHeaders = headerObj;
            console.log(`[${PLATFORM}] Captured auth headers`);
          }
        }
      }
    } catch (e) {
      // Ignore header capture errors
    }

    const response = await originalFetch.apply(this, args);

    try {
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

      // Check if this is a conversation list request (to find Gizmo IDs)
      const isListRequest = url && url.includes('/conversations?');

      if (isConversationRequest) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && (data.mapping || data.conversation_id)) {
            sendDataToContentScript(data);
          }
        }).catch(() => { });
      }

      if (isListRequest) {
        const clone = response.clone();
        clone.json().then(data => {
          // console.log(`[${PLATFORM}] Intercepted conversation list`, data);
        }).catch(() => { });
      }

    } catch (e) {
      // Ignore errors in passive interceptor
    }

    return response;
  };

  // Initialize
  hookHistoryApi();
  checkCurrentUrl(); // Check initial URL
  console.log(`[${PLATFORM}] Active fetcher installed`);

})();
