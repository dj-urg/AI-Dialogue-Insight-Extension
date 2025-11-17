# DOM Selector Update Guide

This guide explains how to update the DOM selectors in `content.js` when testing reveals that the placeholder selectors don't work.

## Why Update Selectors?

The current selectors in `content.js` are **placeholders**. They need to be replaced with actual CSS selectors that match the DOM structure of Claude and DeepSeek chat pages.

## When to Update

Update selectors if you see this alert when testing:
> "No messages found on this page."

This means the extension couldn't find any messages using the current selectors.

---

## Step-by-Step: Finding Correct Selectors

### For Claude (claude.ai)

1. **Open a Claude public chat page** in Firefox
2. **Open DevTools**: Press `F12` or right-click → "Inspect"
3. **Go to the Inspector tab** (or Elements tab)
4. **Inspect a message**:
   - Right-click on a user message → "Inspect"
   - Look at the HTML structure in DevTools

5. **Identify the message container**:
   - Find the outermost element that wraps a complete message
   - Look for attributes like:
     - `data-testid="..."`
     - `class="..."`
     - `role="..."`
   - Example: `<div data-testid="conversation-turn" class="message-wrapper">`

6. **Identify role indicators**:
   - Find what distinguishes user messages from assistant messages
   - Look for class names, data attributes, or aria-labels
   - Example: 
     - User: `<div class="user-message">`
     - Assistant: `<div class="assistant-message">`

7. **Identify timestamp elements**:
   - Look for `<time>` elements or elements with time/date text
   - Check for `datetime` attributes
   - Example: `<time datetime="2024-11-17T10:30:00Z">10:30 AM</time>`

8. **Identify content blocks**:
   - Find the element that contains the actual message text
   - Example: `<div class="message-content">Hello, world!</div>`

### For DeepSeek (chat.deepseek.com)

Repeat the same process for DeepSeek chat pages.

---

## Updating content.js

Once you've identified the correct selectors, update `content.js`:

### 1. Open content.js in your editor

### 2. Find the selector constants (around line 35-60)

```javascript
const CLAUDE_SELECTORS = {
  messageContainer: '[data-testid="conversation-turn"]',  // UPDATE THIS
  userMessage: '.user-message',                           // UPDATE THIS
  assistantMessage: '.assistant-message',                 // UPDATE THIS
  timestamp: 'time',                                      // UPDATE THIS
  contentBlock: '.message-content'                        // UPDATE THIS
};

const DEEPSEEK_SELECTORS = {
  messageContainer: '.chat-message',                      // UPDATE THIS
  userMessage: '.message-user',                           // UPDATE THIS
  assistantMessage: '.message-assistant',                 // UPDATE THIS
  timestamp: '.message-time',                             // UPDATE THIS
  contentBlock: '.message-text'                           // UPDATE THIS
};
```

### 3. Replace with your findings

**Example for Claude** (hypothetical):
```javascript
const CLAUDE_SELECTORS = {
  messageContainer: '[data-testid="chat-turn"]',          // Found via inspection
  userMessage: '[data-role="user"]',                      // Found via inspection
  assistantMessage: '[data-role="assistant"]',            // Found via inspection
  timestamp: 'time[datetime]',                            // Found via inspection
  contentBlock: '.prose'                                  // Found via inspection
};
```

**Example for DeepSeek** (hypothetical):
```javascript
const DEEPSEEK_SELECTORS = {
  messageContainer: '.ds-message',                        // Found via inspection
  userMessage: '.ds-message--user',                       // Found via inspection
  assistantMessage: '.ds-message--assistant',             // Found via inspection
  timestamp: '.ds-message__time',                         // Found via inspection
  contentBlock: '.ds-message__content'                    // Found via inspection
};
```

### 4. Save the file

### 5. Reload the extension

1. Go to `about:debugging#/runtime/this-firefox`
2. Find "AI Chat Exporter"
3. Click the "Reload" button

### 6. Test again

Try exporting a chat. If it still doesn't work, double-check your selectors.

---

## Selector Tips

### Use Specific Selectors
- ✅ Good: `[data-testid="message"]` (specific attribute)
- ✅ Good: `.chat-message-container` (specific class)
- ❌ Bad: `div` (too generic)
- ❌ Bad: `.message` (might match too many things)

### Test Selectors in Console
You can test selectors directly in the browser console:

```javascript
// Test if selector finds messages
document.querySelectorAll('[data-testid="conversation-turn"]').length

// Should return a number > 0 if selector is correct
```

### Prefer Data Attributes
Data attributes (like `data-testid`) are more stable than class names:
- ✅ `[data-testid="message"]` - less likely to change
- ⚠️ `.message-wrapper-v2-styled` - might change with redesigns

### Check for Multiple Matches
Make sure your `messageContainer` selector matches ALL messages:

```javascript
// In browser console on chat page:
const messages = document.querySelectorAll('YOUR_SELECTOR_HERE');
console.log('Found', messages.length, 'messages');

// Compare this number to the visible messages on the page
```

---

## Troubleshooting

### "No messages found" even after updating selectors

**Possible causes:**
1. **Selector is wrong**: Double-check by testing in console
2. **Messages not loaded yet**: Wait for page to fully load
3. **Dynamic content**: Messages might be in a shadow DOM or iframe

**Solutions:**
- Test selector in console: `document.querySelectorAll('YOUR_SELECTOR')`
- Check if messages are in an iframe: Look for `<iframe>` elements
- Check for shadow DOM: Look for `#shadow-root` in DevTools

### Only some messages are extracted

**Possible causes:**
1. **Role detection failing**: User/assistant selectors might be wrong
2. **Content selector too specific**: Might not match all message types

**Solutions:**
- Check if all messages have the same structure
- Look for variations in user vs assistant message HTML
- Make selectors more general if needed

### Timestamps are empty

**Possible causes:**
1. **Timestamp selector is wrong**
2. **Timestamps are formatted differently than expected**

**Solutions:**
- Check if timestamp elements exist: `document.querySelectorAll('time')`
- Look for alternative time indicators (spans with dates, etc.)
- It's OK if timestamps are empty - the extension will handle it

### Content is garbled or incomplete

**Possible causes:**
1. **Content selector is too narrow**: Might be missing parts of the message
2. **Content selector is too broad**: Might be including UI elements

**Solutions:**
- Inspect the full message structure in DevTools
- Find the element that contains ONLY the message text
- Test extraction in console:
  ```javascript
  const msg = document.querySelector('YOUR_MESSAGE_SELECTOR');
  const content = msg.querySelector('YOUR_CONTENT_SELECTOR');
  console.log(content.textContent);
  ```

---

## Example: Real-World Selector Discovery

Let's walk through a hypothetical example for Claude:

### 1. Inspect the page
```html
<div class="conversation">
  <div data-message-id="123" class="turn">
    <div class="turn-header">
      <span class="role">User</span>
      <time datetime="2024-11-17T10:30:00Z">10:30 AM</time>
    </div>
    <div class="turn-content">
      <p>Hello, how are you?</p>
    </div>
  </div>
  <div data-message-id="124" class="turn">
    <div class="turn-header">
      <span class="role">Assistant</span>
      <time datetime="2024-11-17T10:30:05Z">10:30 AM</time>
    </div>
    <div class="turn-content">
      <p>I'm doing well, thank you!</p>
    </div>
  </div>
</div>
```

### 2. Identify selectors
- **Message container**: `.turn` (wraps each complete message)
- **User message**: `.turn:has(.role:contains("User"))` - but `:contains` doesn't work in CSS
  - Alternative: Check if `.role` text is "User" in JavaScript
- **Assistant message**: Similar approach
- **Timestamp**: `time[datetime]`
- **Content**: `.turn-content`

### 3. Update content.js
```javascript
const CLAUDE_SELECTORS = {
  messageContainer: '.turn',
  userMessage: '.role',  // We'll check text content in JS
  assistantMessage: '.role',  // We'll check text content in JS
  timestamp: 'time[datetime]',
  contentBlock: '.turn-content'
};
```

### 4. Adjust extraction logic if needed
If role detection is complex, you might need to modify the extraction functions in `content.js` to check text content instead of just CSS selectors.

---

## Need Help?

If you're stuck:
1. Take screenshots of the DevTools Inspector showing the message structure
2. Copy the HTML of a few messages
3. Document what you've tried
4. Ask for help with specific details about what's not working

---

## After Successful Update

Once you've updated the selectors and verified they work:
1. Test thoroughly with multiple chats
2. Document the selectors you found (for future reference)
3. Consider contributing them back to the project
4. Update this guide with any lessons learned
