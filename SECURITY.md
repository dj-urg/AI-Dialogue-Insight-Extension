# Security Model

## Overview

This document describes the security architecture of the AI Chat Exporter browser extension, including protection mechanisms against tampering, injection attacks, and data leaks.

## Extension Integrity Protection

### 1. Firefox Extension Signing (Primary Protection)

**Mechanism:** All Firefox extensions are cryptographically signed by Mozilla before distribution.

**Protection:**
- ✅ Prevents file tampering after installation
- ✅ Ensures extension files match the reviewed version
- ✅ Automatic verification by Firefox on load
- ✅ Extension disabled if signature is invalid

**How it works:**
1. Extension is submitted to Mozilla Add-ons (AMO)
2. Mozilla reviews the code
3. Mozilla signs the extension with their private key
4. Firefox verifies the signature on installation and startup
5. Any file modification breaks the signature

**Limitations:**
- Does not protect against runtime manipulation (e.g., malicious extensions modifying our code in memory)
- Does not protect against compromised browser

**Reference:** [Mozilla Extension Signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

### 2. Runtime Integrity Checks (Secondary Protection)

**Mechanism:** The extension performs runtime verification of critical functions.

**Implementation:** `shared/integrity.js`

**Protection:**
- ✅ Detects if critical functions are modified at runtime
- ✅ Verifies browser APIs haven't been tampered with
- ✅ Provides defense-in-depth against sophisticated attacks

**How it works:**
1. At initialization, critical functions are fingerprinted
2. Periodically, functions are re-fingerprinted and compared
3. If tampering is detected, security warnings are logged
4. Extension can take defensive action (e.g., disable features)

**Monitored Functions:**
- Message validation functions
- Cryptographic signing/verification functions
- Data sanitization functions
- Export functions

**Monitored Browser APIs:**
- `window.fetch` - Network requests
- `window.postMessage` - Cross-context messaging
- `window.crypto.subtle` - Cryptographic operations
- `JSON.parse` / `JSON.stringify` - Data serialization

### 3. Content Security Policy (CSP)

**Mechanism:** Strict CSP headers prevent execution of unauthorized code.

**Implementation:** `manifest.json`

**Policy:**
```json
{
  "content_security_policy": {
    "extension_pages": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';"
  }
}
```

**Protection:**
- ✅ Blocks inline scripts
- ✅ Blocks external resources
- ✅ Prevents XSS attacks
- ✅ Restricts resource loading to extension files only

## Subresource Integrity (SRI)

### Why SRI is Not Applicable

**SRI Purpose:** Verify integrity of external resources (CDNs, third-party scripts)

**This Extension:**
- ✅ **No external resources** - All code is bundled with the extension
- ✅ **No CDN dependencies** - No external JavaScript, CSS, or fonts
- ✅ **No third-party scripts** - All code is written and maintained by us

**Verification:**
```bash
# Check for external resources in HTML files
grep -r "http://" *.html
grep -r "https://" *.html
# Result: No external resources found
```

**Protection Provided:**
1. **Firefox Signing** - Verifies all bundled files
2. **CSP** - Blocks any attempt to load external resources
3. **No Network Requests** - Extension operates entirely offline (except for capturing data from AI platforms)

### If External Resources Were Added

If future versions need external resources, implement SRI:

```html
<script 
  src="https://example.com/library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

**Current Status:** ✅ Not needed - no external resources

## Message Authentication

### Cryptographic Signing

**Mechanism:** HMAC-SHA256 signatures on all cross-context messages

**Implementation:** All `inject.js` and `content.js` files

**Protection:**
- ✅ Prevents message injection from malicious extensions
- ✅ Verifies message authenticity
- ✅ Includes timestamp and nonce to prevent replay attacks

**How it works:**
1. Content script generates a secret key
2. Inject script receives the key via secure channel
3. All messages are signed with HMAC-SHA256
4. Content script verifies signature before processing
5. Messages older than 30 seconds are rejected

## Input Validation

### Conversation Data Validation

**Mechanism:** Multi-layer validation of all input data

**Implementation:** `background.js`, all `content.js` files

**Protection:**
- ✅ Size limits (50 MB per conversation)
- ✅ Type checking (all fields validated)
- ✅ Platform-specific structure validation
- ✅ Sanitization of all user-facing data

### URL Validation

**Mechanism:** Whitelist-based URL scheme validation

**Implementation:** `popup.js`

**Protection:**
- ✅ Only `http://` and `https://` allowed
- ✅ Blocks `javascript:`, `data:`, `file:`, `chrome:` URLs
- ✅ Prevents protocol confusion attacks

## Data Protection

### Sensitive Data Redaction

**Mechanism:** Automatic redaction of sensitive information in logs

**Implementation:** All platform scripts

**Protection:**
- ✅ Conversation IDs redacted (first 8 chars only)
- ✅ User activity hidden in production
- ✅ Debug mode for development only
- ✅ No full IDs in console logs

### Memory Management

**Mechanism:** Bounded storage with LRU eviction and age-based cleanup

**Implementation:** All `content.js` files

**Protection:**
- ✅ Maximum 50 conversations in memory
- ✅ Conversations expire after 1 hour
- ✅ Prevents memory exhaustion
- ✅ Automatic cleanup every 5 minutes

## Security Audit Compliance

This extension has been audited for security vulnerabilities. All identified issues have been addressed:

- ✅ **CRITICAL**: Sender validation enhanced
- ✅ **CRITICAL**: XSS vulnerabilities fixed
- ✅ **HIGH**: Message signing implemented
- ✅ **HIGH**: Input validation added
- ✅ **HIGH**: CSV injection prevented
- ✅ **MEDIUM**: Error sanitization implemented
- ✅ **MEDIUM**: CSP strengthened
- ✅ **MEDIUM**: Rate limiting added
- ✅ **MEDIUM**: URL validation enhanced
- ✅ **MEDIUM**: Memory management implemented
- ✅ **MEDIUM**: Fetch validation added
- ✅ **LOW**: Logging controls implemented
- ✅ **LOW**: Integrity checks documented

## Reporting Security Issues

If you discover a security vulnerability, please report it to:

**Email:** [Your security contact email]

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response Time:** We aim to respond within 48 hours and provide a fix within 7 days for critical issues.

