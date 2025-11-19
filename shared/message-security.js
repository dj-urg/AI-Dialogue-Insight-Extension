/**
 * Message Security Module
 * 
 * Provides cryptographic message signing and verification to prevent
 * malicious scripts from injecting fake conversation data via postMessage.
 * 
 * Security Features:
 * - HMAC-SHA256 message signing
 * - Timestamp validation to prevent replay attacks
 * - Nonce generation for additional entropy
 */

(function (global) {
  'use strict';

  /**
   * Generate a cryptographic secret key for message signing
   * This is generated once per page load and shared between inject and content scripts
   * via a secure initialization handshake
   */
  async function generateSecretKey() {
    // Generate a random 256-bit key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate HMAC-SHA256 signature for a message
   * @param {string} message - The message to sign (JSON stringified)
   * @param {string} secret - The secret key
   * @returns {Promise<string>} The signature as hex string
   */
  async function signMessage(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign('HMAC', key, messageData);

    // Convert to hex string
    return Array.from(new Uint8Array(signature), byte =>
      byte.toString(16).padStart(2, '0')
    ).join('');
  }

  /**
   * Verify HMAC-SHA256 signature for a message
   * @param {string} message - The message to verify (JSON stringified)
   * @param {string} signature - The signature to verify
   * @param {string} secret - The secret key
   * @returns {Promise<boolean>} True if signature is valid
   */
  async function verifySignature(message, signature, secret) {
    const expectedSignature = await signMessage(message, secret);

    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Create a signed message for postMessage communication
   * @param {Object} payload - The payload to send
   * @param {string} messageType - The message type
   * @param {string} sourceId - The source identifier
   * @param {string} platform - The platform name
   * @param {string} secret - The secret key
   * @returns {Promise<Object>} The signed message object
   */
  async function createSignedMessage(payload, messageType, sourceId, platform, secret) {
    const timestamp = Date.now();
    const nonce = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

    // Create the message object without signature
    const messageData = {
      type: messageType,
      payload: payload,
      source: sourceId,
      platform: platform,
      timestamp: timestamp,
      nonce: nonce
    };

    // Sign the message (excluding the signature field)
    const messageString = JSON.stringify(messageData);
    const signature = await signMessage(messageString, secret);

    // Return the complete signed message
    return {
      ...messageData,
      signature: signature
    };
  }

  /**
   * Verify a signed message received via postMessage
   * @param {Object} message - The received message object
   * @param {string} expectedType - The expected message type
   * @param {string} expectedSource - The expected source identifier
   * @param {string} secret - The secret key
   * @param {number} maxAge - Maximum age of message in milliseconds (default: 30 seconds)
   * @returns {Promise<Object>} Verification result with isValid and error properties
   */
  async function verifySignedMessage(message, expectedType, expectedSource, secret, maxAge = 30000) {
    // Basic structure validation
    if (!message || typeof message !== 'object') {
      return { isValid: false, error: 'Invalid message structure' };
    }

    if (!message.signature || typeof message.signature !== 'string') {
      return { isValid: false, error: 'Missing or invalid signature' };
    }

    if (message.type !== expectedType) {
      return { isValid: false, error: 'Message type mismatch' };
    }

    if (message.source !== expectedSource) {
      return { isValid: false, error: 'Message source mismatch' };
    }

    if (!message.timestamp || typeof message.timestamp !== 'number') {
      return { isValid: false, error: 'Missing or invalid timestamp' };
    }

    // Timestamp validation (prevent replay attacks)
    const now = Date.now();
    const age = now - message.timestamp;

    if (age < 0 || age > maxAge) {
      return { isValid: false, error: 'Message timestamp out of valid range' };
    }

    // Extract signature and reconstruct message for verification
    const { signature, ...messageData } = message;
    const messageString = JSON.stringify(messageData);

    // Verify signature
    const isValid = await verifySignature(messageString, signature, secret);

    if (!isValid) {
      return { isValid: false, error: 'Invalid signature' };
    }

    return { isValid: true, error: null };
  }

  /**
   * Get secret key from meta tag
   * @param {string} metaName - The name of the meta tag
   * @returns {string|null} The secret key or null if not found
   */
  function getSharedSecret(metaName) {
    const meta = document.querySelector(`meta[name="${metaName}"]`);
    if (meta) {
      return meta.content;
    }
    return null;
  }

  // Export API
  const MessageSecurity = {
    generateSecretKey,
    signMessage,
    verifySignature,
    createSignedMessage,
    verifySignedMessage,
    getSharedSecret
  };

  // Export for CommonJS (Node/testing)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageSecurity;
  }

  // Export for Browser (Global)
  if (typeof window !== 'undefined') {
    window.MessageSecurity = MessageSecurity;
  }

})(typeof window !== 'undefined' ? window : this);


