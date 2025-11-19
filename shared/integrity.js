/**
 * Runtime Integrity Checking
 * 
 * Provides runtime verification of critical functions to detect tampering.
 * This complements Firefox's extension signing mechanism.
 * 
 * Security Model:
 * 1. Firefox Extension Signing: Primary protection against file tampering
 * 2. Runtime Integrity Checks: Secondary protection against runtime manipulation
 * 3. Function Fingerprinting: Detect if critical functions are modified
 * 
 * Note: This is defense-in-depth. Firefox's signing is the primary security mechanism.
 */

/**
 * Calculate a simple hash of a function's source code
 * @param {Function} func - Function to hash
 * @returns {number} Simple hash value
 */
function hashFunction(func) {
  const source = func.toString();
  let hash = 0;
  
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash;
}

/**
 * Store of critical function fingerprints
 * These are calculated at initialization and checked periodically
 */
const functionFingerprints = new Map();

/**
 * Register a critical function for integrity monitoring
 * @param {string} name - Function name for identification
 * @param {Function} func - Function to monitor
 */
function registerCriticalFunction(name, func) {
  if (typeof func !== 'function') {
    console.warn('[Integrity] Cannot register non-function:', name);
    return;
  }
  
  const fingerprint = hashFunction(func);
  functionFingerprints.set(name, fingerprint);
}

/**
 * Verify a critical function hasn't been tampered with
 * @param {string} name - Function name
 * @param {Function} func - Function to verify
 * @returns {boolean} True if function is unchanged
 */
function verifyCriticalFunction(name, func) {
  if (!functionFingerprints.has(name)) {
    console.warn('[Integrity] Function not registered:', name);
    return false;
  }
  
  const expectedFingerprint = functionFingerprints.get(name);
  const actualFingerprint = hashFunction(func);
  
  if (expectedFingerprint !== actualFingerprint) {
    console.error('[Integrity] Function tampering detected:', name);
    return false;
  }
  
  return true;
}

/**
 * Verify all registered critical functions
 * @param {Object} context - Object containing functions to verify
 * @returns {Object} Verification results
 */
function verifyAllFunctions(context) {
  const results = {
    passed: [],
    failed: [],
    total: functionFingerprints.size
  };
  
  for (const [name, _fingerprint] of functionFingerprints.entries()) {
    // Extract function from context using name
    const func = context[name];
    
    if (!func) {
      results.failed.push({ name, reason: 'Function not found in context' });
      continue;
    }
    
    if (verifyCriticalFunction(name, func)) {
      results.passed.push(name);
    } else {
      results.failed.push({ name, reason: 'Fingerprint mismatch' });
    }
  }
  
  return results;
}

/**
 * Check if browser APIs have been tampered with
 * @returns {Object} Verification results
 */
function verifyBrowserAPIs() {
  const results = {
    passed: [],
    failed: []
  };
  
  // Check if critical browser APIs exist and are functions
  const criticalAPIs = [
    { name: 'fetch', obj: window, prop: 'fetch' },
    { name: 'postMessage', obj: window, prop: 'postMessage' },
    { name: 'crypto.subtle', obj: window.crypto, prop: 'subtle' },
    { name: 'JSON.parse', obj: JSON, prop: 'parse' },
    { name: 'JSON.stringify', obj: JSON, prop: 'stringify' }
  ];
  
  for (const api of criticalAPIs) {
    if (!api.obj) {
      results.failed.push({ name: api.name, reason: 'Parent object not found' });
      continue;
    }
    
    const value = api.obj[api.prop];
    
    if (typeof value !== 'function' && typeof value !== 'object') {
      results.failed.push({ name: api.name, reason: 'API not found or wrong type' });
    } else {
      results.passed.push(api.name);
    }
  }
  
  return results;
}

/**
 * Perform comprehensive integrity check
 * @param {Object} context - Object containing functions to verify
 * @returns {Object} Complete verification results
 */
function performIntegrityCheck(context = {}) {
  const functionResults = verifyAllFunctions(context);
  const apiResults = verifyBrowserAPIs();
  
  return {
    functions: functionResults,
    apis: apiResults,
    timestamp: Date.now(),
    passed: functionResults.failed.length === 0 && apiResults.failed.length === 0
  };
}

