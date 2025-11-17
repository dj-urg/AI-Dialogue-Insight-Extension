# Quick Test Checklist

Use this as a quick reference while testing. See TESTING_GUIDE.md for detailed instructions.

## Setup
- [ ] Load extension in Firefox (`about:debugging#/runtime/this-firefox`)
- [ ] Verify extension icon appears in toolbar

## Core Functionality Tests
- [ ] **Claude Export**: Navigate to Claude chat → Click icon → Export → Verify CSV downloads
- [ ] **DeepSeek Export**: Navigate to DeepSeek chat → Click icon → Export → Verify CSV downloads
- [ ] **Unsupported Site**: Go to google.com → Click icon → Verify error message & disabled button

## CSV Validation
- [ ] Open CSV in text editor → Verify header: `index,role,timestamp,content,source`
- [ ] Open CSV in Excel → Verify columns align correctly
- [ ] Open CSV in Google Sheets → Verify no formatting issues

## Special Cases
- [ ] **Special Characters**: Test with messages containing commas, quotes, newlines
- [ ] **Empty Chat**: Try exporting page with no messages → Verify alert appears
- [ ] **Multiple Exports**: Export same chat 3 times → Verify separate files created

## Privacy & Security
- [ ] Open DevTools Network tab → Export chat → Verify NO external requests
- [ ] Open DevTools Console → Export chat → Verify proper logging (no errors)

## Performance
- [ ] Test with large chat (50+ messages) → Verify completes quickly, no freezing

---

## Expected Results Summary

### ✅ Success Indicators
- CSV files download with pattern: `chat_export_YYYYMMDD_HHMMSS.csv`
- Popup shows correct status for each site type
- No JavaScript errors in console
- No network requests to external servers
- CSV opens correctly in Excel and Google Sheets

### ⚠️ Known Issue
- **Placeholder Selectors**: The DOM selectors in `content.js` are placeholders
- If you get "No messages found" alert, you need to:
  1. Open DevTools (F12) on the chat page
  2. Inspect message elements
  3. Update `CLAUDE_SELECTORS` or `DEEPSEEK_SELECTORS` in `content.js`
  4. Reload extension in `about:debugging`

---

## Quick Commands

### Load Extension
```
1. Firefox → about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on..."
3. Select manifest.json
```

### Reload Extension (after code changes)
```
1. Go to about:debugging#/runtime/this-firefox
2. Find "AI Chat Exporter"
3. Click "Reload" button
```

### View Console Logs
```
1. Open chat page
2. Press F12 (DevTools)
3. Go to Console tab
4. Export chat
5. Look for "AI Chat Exporter:" messages
```

### Check Network Activity
```
1. Open chat page
2. Press F12 (DevTools)
3. Go to Network tab
4. Check "Persist Logs"
5. Clear log (trash icon)
6. Export chat
7. Verify no XHR/Fetch requests
```

---

## Test URLs (Examples)

You'll need actual chat pages to test. Look for:
- **Claude**: Public shared chats at `https://claude.ai/chat/*`
- **DeepSeek**: Public shared chats at `https://chat.deepseek.com/*`

---

## Reporting Results

After testing, document:
- ✅ Which tests passed
- ❌ Which tests failed (with details)
- ⚠️ Any warnings or unexpected behavior
- 📝 Browser version and OS

Then update the task status in `.kiro/specs/ai-chat-exporter/tasks.md`
