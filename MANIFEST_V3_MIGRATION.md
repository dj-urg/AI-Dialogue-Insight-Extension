# Manifest V3 Migration Guide

## Current Status
- **Current Version:** Manifest V2
- **Reason:** Maximum Firefox compatibility and stability
- **Timeline:** Migrate when Firefox requires V3 (not yet mandatory)

## Why Manifest V2 for Now?
1. **Broader Compatibility:** Works with all current Firefox versions
2. **Simpler API:** `browser.tabs.executeScript()` is straightforward
3. **No Breaking Changes:** V2 is still fully supported by Firefox
4. **Stable:** Well-tested and documented

## When to Migrate to V3?
Migrate when:
- Firefox announces V2 deprecation timeline
- You need V3-specific features
- Mozilla Add-ons (AMO) requires V3 for new submissions

## Migration Checklist

### 1. Update Manifest Version
```json
// BEFORE (V2)
{
  "manifest_version": 2,
  ...
}

// AFTER (V3)
{
  "manifest_version": 3,
  ...
}
```

### 2. Replace `browser_action` with `action`
```json
// BEFORE (V2)
{
  "browser_action": {
    "default_popup": "popup.html",
    "default_icon": {
      "48": "icon.png"
    }
  }
}

// AFTER (V3)
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "48": "icon.png"
    }
  }
}
```

### 3. Update Content Security Policy Format
```json
// BEFORE (V2)
{
  "content_security_policy": "script-src 'self'; object-src 'none';"
}

// AFTER (V3)
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none';"
  }
}
```

### 4. Update Script Injection API in popup.js

**File:** `popup.js` (lines 93-110)

```javascript
// BEFORE (V2)
browser.tabs.executeScript(tab.id, { file: 'content.js' })
  .then(() => {
    // Success
  })
  .catch(error => {
    console.error('Injection failed:', error);
  });

// AFTER (V3)
browser.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content.js']
})
  .then(() => {
    // Success
  })
  .catch(error => {
    console.error('Injection failed:', error);
  });
```

### 5. Add `scripting` Permission
```json
// AFTER (V3)
{
  "permissions": [
    "activeTab",
    "scripting"
  ]
}
```

### 6. Update Background Scripts (if added in future)
If you add background scripts in the future:

```json
// BEFORE (V2)
{
  "background": {
    "scripts": ["background.js"]
  }
}

// AFTER (V3)
{
  "background": {
    "service_worker": "background.js"
  }
}
```

**Note:** Service workers have different lifecycle and APIs than persistent background pages.

## Complete V3 Manifest Example

```json
{
  "manifest_version": 3,
  "name": "AI Chat Exporter",
  "version": "2.0.0",
  "description": "Export Claude and DeepSeek public chats to CSV. All processing happens locally - no data leaves your browser.",
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none';"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "48": "icon.png"
    }
  },
  "icons": {
    "48": "icon.png"
  }
}
```

## Testing After Migration

### 1. Functionality Tests
- [ ] Extension loads without errors
- [ ] Popup opens correctly
- [ ] Domain detection works
- [ ] Script injection succeeds
- [ ] CSV export works on Claude
- [ ] CSV export works on DeepSeek

### 2. API Compatibility Tests
- [ ] `browser.scripting.executeScript()` works
- [ ] No console errors about deprecated APIs
- [ ] Permissions are sufficient

### 3. Security Tests
- [ ] CSP is enforced correctly
- [ ] No inline scripts allowed
- [ ] No external script loading

## Breaking Changes to Watch For

### V3 Restrictions
1. **No `eval()` or `new Function()`** - Already compliant ✅
2. **No remote code execution** - Already compliant ✅
3. **Stricter CSP** - Already using strict CSP ✅
4. **Service workers instead of background pages** - Not applicable (no background scripts) ✅

### Our Extension Status
✅ **Already V3-ready** - No breaking changes expected!

## Estimated Migration Effort
- **Time:** 30-60 minutes
- **Complexity:** Low
- **Risk:** Low (mostly API renames)
- **Testing:** 1-2 hours

## References
- [MDN: Manifest V3 Migration Guide](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/manifest_version)
- [Chrome Developers: Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)

---

**Last Updated:** 2025-11-17  
**Current Manifest Version:** 2  
**Migration Status:** Not yet required

