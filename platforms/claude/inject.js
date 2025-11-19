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

  // Logging configuration
  const DEBUG_MODE = false; // Set to true for development, false for production

  // Response validation configuration
  const MAX_RESPONSE_SIZE = 100 * 1024 * 1024; // 100MB

  // Store captured conversation IDs to avoid duplicate fetches
  const capturedIds = new Set();

  // Store captured headers and Org ID for active fetching
  let capturedHeaders = null;
  let capturedOrgId = null;

  // Store the original fetch function
  const originalFetch = window.fetch;

  // Get secret key from content script
  let SECRET_KEY = null;

  /**
   * Redact sensitive information from log data
   */
  function redactSensitiveData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const redacted = Array.isArray(data) ? [...data] : { ...data };

    // Redact conversation IDs (show first 8 chars only)
    if (redacted.conversationId && typeof redacted.conversationId === 'string') {
      redacted.conversationId = redacted.conversationId.substring(0, 8) + '...';
    }
    if (redacted.conversation_id && typeof redacted.conversation_id === 'string') {
      redacted.conversation_id = redacted.conversation_id.substring(0, 8) + '...';
    }
    if (redacted.id && typeof redacted.id === 'string' && redacted.id.length > 16) {
      redacted.id = redacted.id.substring(0, 8) + '...';
    }
    if (redacted.uuid && typeof redacted.uuid === 'string') {
      redacted.uuid = redacted.uuid.substring(0, 8) + '...';
    }
    if (redacted.orgId && typeof redacted.orgId === 'string') {
      redacted.orgId = redacted.orgId.substring(0, 8) + '...';
    }

    return redacted;
  }

  /**
   * Log debug message (only in debug mode)
   */
  function logDebug(message, data = null) {
    if (!DEBUG_MODE) return;
    if (data) {
      console.log(`[${PLATFORM}] [DEBUG]`, message, redactSensitiveData(data));
    } else {
      console.log(`[${PLATFORM}] [DEBUG]`, message);
    }
  }

  /**
   * Log info message
   */
  function logInfo(message, data = null) {
    if (data) {
      console.log(`[${PLATFORM}]`, message, redactSensitiveData(data));
    } else {
      console.log(`[${PLATFORM}]`, message);
    }
  }

  /**
   * Log warning message
   */
  function logWarn(message, data = null) {
    if (data) {
      console.warn(`[${PLATFORM}] [WARN]`, message, redactSensitiveData(data));
    } else {
      console.warn(`[${PLATFORM}] [WARN]`, message);
    }
  }

  /**
   * Log error message
   */
  function logError(message, data = null) {
    if (data) {
      console.error(`[${PLATFORM}] [ERROR]`, message, redactSensitiveData(data));
    } else {
      console.error(`[${PLATFORM}] [ERROR]`, message);
    }
  }

  /**
   * Validate response before processing
   * @param {Response} response - The fetch response
   * @returns {Object} Validation result with isValid and error properties
   */
  function validateResponse(response) {
    // Check if response is OK
    if (!response.ok) {
      return { isValid: false, error: `Response not OK: ${response.status}` };
    }

    // Validate Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return { isValid: false, error: `Invalid content type: ${contentType}` };
    }

    // Check response size
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (isNaN(size)) {
        return { isValid: false, error: 'Invalid content-length header' };
      }
      if (size > MAX_RESPONSE_SIZE) {
        return { isValid: false, error: `Response too large: ${size} bytes (max: ${MAX_RESPONSE_SIZE})` };
      }
    }

    return { isValid: true };
  }

  /**
   * Get secret key from meta tag injected by content script
   */
  function getSecretKey() {
    if (SECRET_KEY) return SECRET_KEY;

    const meta = document.querySelector('meta[name="claude-exporter-secret"]');
    if (meta) {
      SECRET_KEY = meta.content;
      return SECRET_KEY;
    }

    // If not found, wait and try again
    return null;
  }

  /**
   * Sign a message using HMAC-SHA256
   */
  async function signMessage(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return Array.from(new Uint8Array(signature), byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  /**
   * Send data to content script with cryptographic signature
   */
  async function sendDataToContentScript(data) {
    if (!data || !Array.isArray(data.chat_messages)) return;

    const conversationId = data.uuid;
    if (conversationId) {
      capturedIds.add(conversationId);
    }

    // Get secret key
    const secret = getSecretKey();
    if (!secret) {
      console.warn(`[${PLATFORM}] Secret key not available, cannot send message`);
      return;
    }

    // Create message with timestamp and nonce
    const timestamp = Date.now();
    const nonce = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

    const messageData = {
      type: MESSAGE_TYPE,
      payload: data,
      source: SOURCE_ID,
      platform: 'claude',
      timestamp: timestamp,
      nonce: nonce
    };

    // Sign the message
    const messageString = JSON.stringify(messageData);
    const signature = await signMessage(messageString, secret);

    // Send signed message
    window.postMessage(
      {
        ...messageData,
        signature: signature
      },
      window.location.origin
    );

    console.log(`[${PLATFORM}] ✓ Captured conversation data (signed)`, {
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
      logDebug('Already captured conversation, skipping active fetch', { conversationId });
      return;
    }

    if (!capturedHeaders || !capturedOrgId) {
      logWarn('Cannot active fetch: Missing headers or Org ID', { hasHeaders: !!capturedHeaders, orgId: capturedOrgId });
      return;
    }

    logDebug('Active fetch triggered', { conversationId });

    try {
      const response = await originalFetch(`https://claude.ai/api/organizations/${capturedOrgId}/chat_conversations/${conversationId}`, {
        method: 'GET',
        headers: capturedHeaders
      });

      // Validate response
      const validation = validateResponse(response);
      if (!validation.isValid) {
        logWarn('Active fetch validation failed', { error: validation.error });
        return;
      }

      const data = await response.json();

      // Validate data structure before processing
      if (!data || typeof data !== 'object') {
        logWarn('Invalid data structure: not an object');
        return;
      }

      await sendDataToContentScript(data);

    } catch (error) {
      logError('Active fetch error', { error: error.message });
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
          logDebug('Captured Organization ID', { orgId });
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
        // Validate response before processing
        const validation = validateResponse(response);
        if (!validation.isValid) {
          logWarn('Passive intercept validation failed', { error: validation.error });
          return response;
        }

        // Clone response for processing
        let clone;
        try {
          clone = response.clone();
        } catch (cloneError) {
          logWarn('Could not clone response', { error: cloneError.message });
          return response;
        }

        // Parse JSON with validation
        clone.json()
          .then(async data => {
            // Validate data structure
            if (!data || typeof data !== 'object') {
              logWarn('Invalid data structure: not an object');
              return;
            }

            // Validate platform-specific structure
            if (Array.isArray(data.chat_messages)) {
              await sendDataToContentScript(data);
            }
          })
          .catch(error => {
            logWarn('Failed to parse response', { error: error.message });
          });
      }
    } catch (e) {
      // Ignore errors in passive interceptor
    }

    return response;
  };

  // Initialize
  hookHistoryApi();
  checkCurrentUrl(); // Check initial URL
  logInfo('Active fetcher installed');

})();
