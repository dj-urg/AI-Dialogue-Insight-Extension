# 🚀 Start Here: Testing the AI Chat Exporter

Welcome! This document will guide you through testing the AI Chat Exporter extension.

## ✅ Pre-Testing Validation

The extension has been validated and is ready for testing:
- ✓ All required files are present
- ✓ Manifest is valid
- ✓ JavaScript syntax is correct
- ✓ Icon is properly formatted
- ⚠️ DOM selectors are placeholders (will need updating during testing)

## 📚 Documentation Overview

You have several testing documents available:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **TESTING_GUIDE.md** | Comprehensive testing instructions | Full detailed testing process |
| **QUICK_TEST_CHECKLIST.md** | Quick reference checklist | During testing for quick checks |
| **SELECTOR_UPDATE_GUIDE.md** | How to update DOM selectors | If "No messages found" error occurs |
| **validate_extension.sh** | Validation script | Before testing to verify files |
| **START_HERE.md** | This file | Getting started |

## 🎯 Quick Start (5 minutes)

### Step 1: Load the Extension
1. Open Firefox
2. Type in address bar: `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to this directory and select `manifest.json`
5. Verify the extension icon appears in your toolbar

### Step 2: Test on a Supported Site
1. Navigate to a Claude or DeepSeek public chat page
   - Claude: `https://claude.ai/chat/*`
   - DeepSeek: `https://chat.deepseek.com/*`
2. Click the extension icon in the toolbar
3. Click "Export this chat to CSV"
4. Check your Downloads folder for the CSV file

### Step 3: Verify the CSV
1. Open the downloaded CSV in Excel or Google Sheets
2. Verify it contains:
   - Header row: `index,role,timestamp,content,source`
   - Message data in proper columns
   - No formatting errors

## ⚠️ Expected Issue: Placeholder Selectors

The DOM selectors in `content.js` are **placeholders**. If you get an alert saying "No messages found on this page," you'll need to:

1. Open DevTools (F12) on the chat page
2. Inspect message elements to find correct selectors
3. Update `CLAUDE_SELECTORS` or `DEEPSEEK_SELECTORS` in `content.js`
4. Reload the extension
5. Try again

**See SELECTOR_UPDATE_GUIDE.md for detailed instructions.**

## 📋 Full Testing Checklist

For comprehensive testing, follow **TESTING_GUIDE.md** which includes:

### Core Tests
- ✓ Claude chat export
- ✓ DeepSeek chat export  
- ✓ Unsupported site handling
- ✓ CSV format validation

### Advanced Tests
- ✓ Special characters (commas, quotes, newlines)
- ✓ Network privacy verification
- ✓ Console error logging
- ✓ Empty chat handling
- ✓ Multiple exports
- ✓ Large chat performance

## 🔧 Troubleshooting

### "No messages found on this page"
→ See **SELECTOR_UPDATE_GUIDE.md**

### Extension icon doesn't appear
→ Check `about:addons` to ensure extension is enabled

### CSV doesn't download
→ Check browser console (F12) for errors

### CSV formatting is wrong
→ Verify file opens correctly in text editor first

### Extension button is disabled
→ Make sure you're on a Claude or DeepSeek chat page

## 📊 Testing Progress

Track your progress using **QUICK_TEST_CHECKLIST.md**:

```
Setup:
- [ ] Load extension in Firefox
- [ ] Verify icon appears

Core Tests:
- [ ] Claude export works
- [ ] DeepSeek export works
- [ ] Unsupported site shows error

Validation:
- [ ] CSV opens in Excel
- [ ] CSV opens in Google Sheets
- [ ] No network requests
- [ ] Console shows proper logs
```

## 🎓 Learning Resources

### Understanding the Extension

The extension has 3 main components:

1. **manifest.json**: Configuration and permissions
2. **popup.html + popup.js**: User interface and domain validation
3. **content.js**: Message extraction and CSV generation

### Key Features

- ✅ Client-side only (no server communication)
- ✅ Minimal permissions (activeTab + tabs)
- ✅ RFC 4180 compliant CSV
- ✅ UTF-8 with BOM for Excel compatibility
- ✅ Graceful error handling

## 🐛 Reporting Issues

If you encounter problems, document:
1. Which test failed
2. Steps to reproduce
3. Expected vs actual result
4. Browser console errors (F12 → Console)
5. Screenshots if applicable
6. Firefox version and OS

## ✨ After Testing

Once all tests pass:

1. Mark the task as complete in `.kiro/specs/ai-chat-exporter/tasks.md`
2. Document any selector updates you made
3. Note any issues or improvements for future versions

## 🚦 Next Steps

Choose your path:

### Quick Test (10 minutes)
→ Follow "Quick Start" above + use **QUICK_TEST_CHECKLIST.md**

### Comprehensive Test (30-60 minutes)
→ Follow **TESTING_GUIDE.md** completely

### Just Validate Files
→ Run `./validate_extension.sh`

---

## 📞 Need Help?

- Check **TESTING_GUIDE.md** for detailed instructions
- Check **SELECTOR_UPDATE_GUIDE.md** for selector issues
- Review browser console for error messages
- Inspect the DOM structure of chat pages

---

**Ready to start?** 

1. Run `./validate_extension.sh` to confirm everything is ready
2. Open Firefox and load the extension
3. Follow the Quick Start above or dive into TESTING_GUIDE.md

Good luck! 🎉
