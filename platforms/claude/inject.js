/**
 * Claude Platform - Page Context Script (inject.js)
 * 
 * This script runs in the page context to:
 * 1. Intercept Claude's fetch calls (Passive Strategy)
 * 2. Monitor URL changes and manually fetch data (Active Strategy)
 * 3. Capture authentication headers and Organization ID
 */

(function () {
  'use strict';

  const PLATFORM = 'Claude';
  const MESSAGE_TYPE = 'CLAUDE_CONVERSATION_DATA';
  const SOURCE_ID = 'claude-exporter-inject';

  // Store captured conversation IDs to avoid duplicate fetches
  const capturedIds = new Set();

  // Store captured headers and Org ID for active fetching
  let capturedHeaders = null;
  let capturedOrgId = null;

  // Store the original fetch function
  const originalFetch = window.fetch;

  /**
   * Send data to content script
   */
  function sendDataToContentScript(data) {
    if (!data || !Array.isArray(data.chat_messages)) return;

    const conversationId = data.uuid;
    if (conversationId) {
      capturedIds.add(conversationId);
    }

    window.postMessage(
      {
        type: MESSAGE_TYPE,
        payload: data,
        source: SOURCE_ID,
        platform: 'claude'
      },
      window.location.origin
    );

    console.log(`[${PLATFORM}] ✓ Captured conversation data`, {
      conversationId: conversationId,
      messageCount: data.chat_messages.length,
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

    if (!capturedHeaders || !capturedOrgId) {
      console.warn(`[${PLATFORM}] Cannot active fetch: Missing headers or Org ID`, { hasHeaders: !!capturedHeaders, orgId: capturedOrgId });
      return;
    }

    console.log(`[${PLATFORM}] Active fetch triggered for conversation ${conversationId}`);

    try {
      const response = await originalFetch(`https://claude.ai/api/organizations/${capturedOrgId}/chat_conversations/${conversationId}`, {
        method: 'GET',
        headers: capturedHeaders
      });

      if (!response.ok) {
        console.warn(`[${PLATFORM}] Active fetch failed: ${response.status}`);
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
    const match = url.match(/\/chat\/([a-f0-9-]+)/i);

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
   * Extract Organization ID from URL or Headers
   */
  function extractOrgId(url) {
    // Try to extract from URL: /api/organizations/{orgId}/...
    const match = url.match(/\/api\/organizations\/([^\/]+)\//);
    if (match && match[1]) {
      return match[1];
    }
    return null;
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
      }

      // Capture Org ID from URL if possible
      if (url && !capturedOrgId) {
        const orgId = extractOrgId(url);
        if (orgId) {
          capturedOrgId = orgId;
          console.log(`[${PLATFORM}] Captured Organization ID: ${orgId}`);
        }
      }

      // Look for API requests to capture headers
      if (url && url.includes('/api/') && !capturedHeaders) {
        // Try to extract headers
        let headers = options.headers;

        if (!headers && request instanceof Request) {
          headers = request.headers;
        }

        if (headers) {
          const headerObj = {};
          if (headers instanceof Headers) {
            headers.forEach((value, key) => {
              headerObj[key] = value;
            });
          } else {
            Object.assign(headerObj, headers);
          }

          // Check for key headers usually sent by Claude
          // x-api-key, anthropic-organization-id, or just standard Cookie/User-Agent handling by browser
          // We mainly need to ensure we copy any custom headers Claude uses.
          // Often just copying all headers from a valid API request works.
          if (Object.keys(headerObj).length > 0) {
            capturedHeaders = headerObj;
            console.log(`[${PLATFORM}] Captured API headers`);
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
      }

      // Check if this is a conversation API request
      const isConversationRequest = url && (
        url.includes('chat_conversations') ||
        (url.includes('/api/organizations/') && url.includes('/chat/'))
      );

      if (isConversationRequest) {
        const clone = response.clone();
        clone.json().then(data => {
          if (data && Array.isArray(data.chat_messages)) {
            sendDataToContentScript(data);
          }
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
