/**
 * ChatGPT Platform - Content Script
 * 
 * This script:
 * 1. Injects inject.js into the page context
 * 2. Listens for conversation data via window.postMessage
 * 3. Forwards the data to the background script for processing
 */

(function () {
  'use strict';

  const PLATFORM = 'ChatGPT';
  const MESSAGE_TYPE = 'CHATGPT_CONVERSATION_DATA';
  const SOURCE_ID = 'chatgpt-exporter-inject';

  // Store captured conversations in memory
  const capturedConversations = new Map();

  /**
   * Inject inject.js into the page context
   */
  function injectPageScript() {
    try {
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('platforms/chatgpt/inject.js');
      script.onload = function () {
        this.remove();
        console.log(`[${PLATFORM}] Page script injected successfully`);
      };
      script.onerror = function () {
        console.error(`[${PLATFORM}] Failed to inject page script`);
      };

      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      console.error(`[${PLATFORM}] Error injecting page script:`, error);
    }
  }

  /**
   * Listen for messages from the injected page script
   */
  window.addEventListener('message', event => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    // Only accept our specific message type
    if (!event.data || event.data.type !== MESSAGE_TYPE) return;

    // Verify source
    if (event.data.source !== SOURCE_ID) {
      return;
    }

    const conversationData = event.data.payload;

    if (!conversationData) {
      console.warn(`[${PLATFORM}] Received message with no payload`);
      return;
    }

    if (!conversationData.mapping) {
      console.warn(`[${PLATFORM}] Received conversation data without mapping`);
      return;
    }

    // Extract conversation ID
    const conversationId = conversationData.conversation_id || conversationData.id || 'unknown';

    // Store in memory
    capturedConversations.set(conversationId, conversationData);

    console.log(`[${PLATFORM}] ✓ Stored conversation data`, {
      conversationId: conversationId,
      nodeCount: Object.keys(conversationData.mapping || {}).length,
      totalCaptured: capturedConversations.size
    });

    // Forward to background script for processing
    browser.runtime.sendMessage({
      type: MESSAGE_TYPE,
      payload: conversationData,
      platform: 'chatgpt'
    }).then(() => {
      console.log(`[${PLATFORM}] ✓ Forwarded conversation data to background script`);
    }).catch(error => {
      console.error(`[${PLATFORM}] ✗ Failed to send message to background:`, error);
    });
  });

  /**
   * Listen for messages from popup/background
   */
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Validate sender
    if (sender.id !== browser.runtime.id) return;

    if (message.type === 'GET_CAPTURED_CONVERSATIONS') {
      sendResponse({
        success: true,
        conversationIds: Array.from(capturedConversations.keys()),
        platform: 'chatgpt'
      });
      return false;
    }

    if (message.type === 'EXPORT_CONVERSATION' && message.platform === 'chatgpt') {
      const conversationId = message.conversationId;
      const conversationData = capturedConversations.get(conversationId);

      if (!conversationData) {
        sendResponse({
          success: false,
          error: 'Conversation not found. Please wait for the page to load the conversation.'
        });
        return false;
      }

      // Forward to background for CSV generation
      browser.runtime.sendMessage({
        type: MESSAGE_TYPE,
        payload: conversationData,
        platform: 'chatgpt'
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });

      return true; // Keep channel open for async response
    }

    return false;
  });

  // Inject the page script when content script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPageScript);
  } else {
    injectPageScript();
  }

  console.log(`[${PLATFORM}] Content script loaded`);

})();


