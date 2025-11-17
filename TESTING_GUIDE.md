# AI Chat Exporter - Manual Testing Guide

This guide will walk you through testing all aspects of the AI Chat Exporter extension.

## Prerequisites

- Firefox browser (latest version recommended)
- Access to Claude public chat pages (https://claude.ai)
- Access to DeepSeek public chat pages (https://chat.deepseek.com)

## Test Setup

### 1. Load Extension in Firefox

1. Open Firefox
2. Type `about:debugging#/runtime/this-firefox` in the address bar and press Enter
3. Click the "Load Temporary Add-on..." button
4. Navigate to the extension directory
5. Select the `manifest.json` file
6. Verify the extension appears in the list with:
   - Name: "AI Chat Exporter"
   - Version: "1.0.0"
   - Status: "Running"
7. Check that the extension icon appears in the Firefox toolbar

**Expected Result**: ✓ Extension loads without errors and icon is visible in toolbar

---

## Test Cases

### Test 1: Claude Public Chat Export

**Objective**: Verify the extension can export a Claude chat to CSV

**Steps**:
1. Navigate to a Claude public chat page (e.g., https://claude.ai/chat/*)
2. Ensure the chat has loaded and contains visible messages
3. Click the AI Chat Exporter icon in the toolbar
4. Verify the popup displays:
   - Title: "AI Chat Exporter"
   - Status message: "Claude chat detected. Ready to export." (green background)
   - Button: "Export this chat to CSV" (enabled, blue)
5. Click the "Export this chat to CSV" button
6. Wait for the download to complete
7. Check your Downloads folder for a file named `chat_export_YYYYMMDD_HHMMSS.csv`

**Expected Results**:
- ✓ Popup correctly identifies Claude chat
- ✓ Export button is enabled
- ✓ CSV file downloads automatically
- ✓ Filename follows the pattern `chat_export_YYYYMMDD_HHMMSS.csv`
- ✓ No error alerts appear

**Notes**: Record the number of messages visible in the chat for comparison with CSV content.

---

### Test 2: DeepSeek Public Chat Export

**Objective**: Verify the extension can export a DeepSeek chat to CSV

**Steps**:
1. Navigate to a DeepSeek public chat page (e.g., https://chat.deepseek.com/*)
2. Ensure the chat has loaded and contains visible messages
3. Click the AI Chat Exporter icon in the toolbar
4. Verify the popup displays:
   - Status message: "Deepseek chat detected. Ready to export." (green background)
   - Button: "Export this chat to CSV" (enabled, blue)
5. Click the "Export this chat to CSV" button
6. Wait for the download to complete
7. Check your Downloads folder for the CSV file

**Expected Results**:
- ✓ Popup correctly identifies DeepSeek chat
- ✓ Export button is enabled
- ✓ CSV file downloads automatically
- ✓ Filename follows the correct pattern
- ✓ No error alerts appear

---

### Test 3: Unsupported Site Detection

**Objective**: Verify the extension correctly handles unsupported websites

**Steps**:
1. Navigate to an unsupported website (e.g., https://google.com, https://github.com)
2. Click the AI Chat Exporter icon in the toolbar
3. Verify the popup displays:
   - Status message: "This page is not supported. Please navigate to a Claude or DeepSeek chat." (orange background)
   - Button: "Export this chat to CSV" (disabled, gray)
4. Try clicking the disabled button (it should not respond)

**Expected Results**:
- ✓ Popup correctly identifies unsupported site
- ✓ Export button is disabled
- ✓ Clear error message is displayed
- ✓ No script injection occurs

---

### Test 4: CSV File Format Validation

**Objective**: Verify the CSV file is correctly formatted and can be opened in spreadsheet applications

**Steps**:
1. Export a chat from Claude or DeepSeek (use Test 1 or Test 2)
2. Locate the downloaded CSV file
3. Open the file in a text editor (e.g., TextEdit, Notepad, VS Code)
4. Verify the structure:
   - First line is the header: `index,role,timestamp,content,source`
   - Each subsequent line represents one message
   - Fields are comma-separated
   - Fields containing commas, quotes, or newlines are wrapped in quotes
5. Open the same file in Excel:
   - Double-click the CSV file, or
   - Open Excel → File → Open → Select the CSV file
6. Verify in Excel:
   - All columns are properly separated
   - No data appears in wrong columns
   - Special characters display correctly
   - Multi-line content is contained in single cells
7. Open the file in Google Sheets:
   - Go to https://sheets.google.com
   - File → Import → Upload → Select the CSV file
   - Choose "Import location: Replace spreadsheet"
8. Verify in Google Sheets:
   - Same checks as Excel above

**Expected Results**:
- ✓ CSV header is correct: `index,role,timestamp,content,source`
- ✓ Each message is on its own row
- ✓ Fields are properly escaped (quotes doubled, wrapped in quotes when needed)
- ✓ File opens correctly in Excel without errors
- ✓ File opens correctly in Google Sheets without errors
- ✓ No data corruption or misalignment
- ✓ UTF-8 characters (emojis, special characters) display correctly

---

### Test 5: Special Characters Handling

**Objective**: Verify the extension correctly handles messages with special characters

**Test Data Needed**: A chat containing messages with:
- Commas: "Hello, how are you?"
- Double quotes: 'He said "hello" to me'
- Newlines: Multi-paragraph messages
- Code blocks with special characters
- Emojis: 😀 🎉 ✨

**Steps**:
1. If possible, create or find a chat with the special characters listed above
2. Export the chat to CSV
3. Open the CSV in a text editor
4. Verify that:
   - Fields with commas are wrapped in quotes: `"Hello, how are you?"`
   - Double quotes are escaped by doubling: `"He said ""hello"" to me"`
   - Newlines within content are preserved and the field is quoted
   - Emojis are preserved
5. Open the CSV in Excel/Google Sheets
6. Verify all special characters display correctly

**Expected Results**:
- ✓ Commas in content don't break column alignment
- ✓ Quotes are properly escaped (doubled)
- ✓ Multi-line content stays in single cells
- ✓ Emojis and Unicode characters display correctly
- ✓ Code blocks are readable

**Note**: If you can't create a test chat with special characters, you can manually verify the escaping logic by inspecting the `escapeCSVField()` function in `content.js`.

---

### Test 6: Network Privacy Verification

**Objective**: Verify the extension does not make any external network requests

**Steps**:
1. Open Firefox DevTools (F12)
2. Go to the "Network" tab
3. Ensure "Persist Logs" is checked
4. Clear the network log (trash icon)
5. Navigate to a Claude or DeepSeek chat page
6. Click the extension icon and export the chat
7. Review the Network tab for any requests made during export
8. Filter by:
   - XHR requests
   - Fetch requests
   - Any requests to domains other than claude.ai or chat.deepseek.com

**Expected Results**:
- ✓ No XHR or Fetch requests are made by the extension
- ✓ No requests to external servers or APIs
- ✓ Only the page's own requests (if any) appear
- ✓ The CSV download appears as a blob: URL (local)

---

### Test 7: Console Error Logging

**Objective**: Verify proper error logging and no unexpected errors

**Steps**:
1. Open Firefox DevTools (F12)
2. Go to the "Console" tab
3. Clear the console
4. Navigate to a Claude chat page
5. Click the extension icon and export the chat
6. Review console messages for:
   - Info logs from the extension (prefixed with "AI Chat Exporter:")
   - Any warnings or errors
7. Repeat for DeepSeek
8. Test on an unsupported site and check console

**Expected Results**:
- ✓ Console shows: "AI Chat Exporter: Detected site type: claude" (or deepseek)
- ✓ Console shows: "AI Chat Exporter: Extracted X messages"
- ✓ Console shows: "AI Chat Exporter: CSV generation completed"
- ✓ Console shows: "AI Chat Exporter: Download triggered for chat_export_*.csv"
- ✓ No unexpected errors or warnings
- ✓ On unsupported sites, no errors appear (extension doesn't inject)

---

### Test 8: Empty Chat Handling

**Objective**: Verify the extension handles pages with no messages gracefully

**Steps**:
1. Navigate to a Claude or DeepSeek page that has no messages (if possible)
   - Alternatively, test on a page where messages haven't loaded yet
2. Click the extension icon and try to export
3. Observe the alert message

**Expected Results**:
- ✓ Alert appears: "No messages found on this page."
- ✓ No CSV download occurs
- ✓ No JavaScript errors in console
- ✓ Extension remains functional for subsequent exports

---

### Test 9: Rapid Successive Exports

**Objective**: Verify the extension handles multiple exports without issues

**Steps**:
1. Navigate to a Claude or DeepSeek chat
2. Click the extension icon and export the chat
3. Immediately click the extension icon again
4. Export the chat again
5. Repeat 2-3 more times in quick succession
6. Check Downloads folder for multiple CSV files

**Expected Results**:
- ✓ Each export generates a separate CSV file
- ✓ Filenames have different timestamps (or same if within same second)
- ✓ No errors or crashes occur
- ✓ All CSV files contain the same data
- ✓ Extension remains responsive

---

### Test 10: Large Chat Performance

**Objective**: Verify the extension can handle chats with many messages

**Test Requirement**: A chat with 50+ messages (ideally 100+)

**Steps**:
1. Navigate to a long Claude or DeepSeek chat
2. Note the approximate number of messages visible
3. Open DevTools → Console
4. Click the extension icon and export
5. Observe:
   - Time taken for export to complete
   - Browser responsiveness during export
   - Any console warnings or errors
6. Open the CSV and verify:
   - All messages are present
   - Message count matches what was visible

**Expected Results**:
- ✓ Export completes in under 5 seconds for 100 messages
- ✓ Browser remains responsive (no freezing)
- ✓ All messages are extracted
- ✓ CSV file size is reasonable
- ✓ No memory issues or crashes

---

## Test Results Summary

Use this checklist to track your testing progress:

- [ ] Test 1: Claude Public Chat Export
- [ ] Test 2: DeepSeek Public Chat Export
- [ ] Test 3: Unsupported Site Detection
- [ ] Test 4: CSV File Format Validation
- [ ] Test 5: Special Characters Handling
- [ ] Test 6: Network Privacy Verification
- [ ] Test 7: Console Error Logging
- [ ] Test 8: Empty Chat Handling
- [ ] Test 9: Rapid Successive Exports
- [ ] Test 10: Large Chat Performance

## Known Issues / Notes

**Important**: The DOM selectors in `content.js` are PLACEHOLDERS. They need to be updated after inspecting the actual DOM structure of Claude and DeepSeek chat pages. If Tests 1 or 2 fail with "No messages found", this is likely the cause.

To update selectors:
1. Open DevTools (F12) on the chat page
2. Inspect message elements
3. Identify correct CSS selectors
4. Update `CLAUDE_SELECTORS` or `DEEPSEEK_SELECTORS` in `content.js`
5. Reload the extension in `about:debugging`

## Reporting Issues

If any test fails, please document:
1. Test number and name
2. Steps to reproduce
3. Expected vs actual result
4. Browser console errors (if any)
5. Screenshots (if applicable)
6. Firefox version
7. Operating system

---

## Post-Testing

After completing all tests:

1. Review all test results
2. Document any failures or unexpected behavior
3. Update selectors if needed (see Known Issues above)
4. Re-test any failed cases after fixes
5. Mark the task as complete in `tasks.md` once all tests pass

**Note**: Some tests (especially Tests 1, 2, and 10) require actual chat pages with content. If you don't have access to suitable test pages, you may need to create test chats or use publicly shared chat links.
