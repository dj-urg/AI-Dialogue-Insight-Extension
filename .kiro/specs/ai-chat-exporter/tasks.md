# Implementation Plan

- [x] 1. Create extension manifest and basic structure
  - Create `manifest.json` with Manifest V2 configuration
  - Define minimal permissions: `activeTab` and `tabs`
  - Configure `browser_action` with popup
  - Create placeholder icon file (48x48 PNG)
  - _Requirements: 1.1, 1.2, 1.3, 9.5_

- [x] 2. Implement popup UI and domain validation
  - Create `popup.html` with title, status div, and export button
  - Add minimal CSS styling for clean UI
  - _Requirements: 3.1_

- [x] 2.1 Implement popup.js domain detection logic
  - Define `SUPPORTED_DOMAINS` constant with Claude and DeepSeek domains
  - Implement `getSiteType()` function using exact match or `endsWith` for security
  - Query active tab on popup load using `browser.tabs.query()`
  - Display appropriate status message based on current URL
  - _Requirements: 2.3, 2.4, 3.3_

- [x] 2.2 Implement popup.js script injection
  - Add click handler for export button
  - Validate current tab URL before injection
  - Use `browser.tabs.executeScript()` to inject `content.js`
  - Handle injection errors with user-facing message and console logging
  - _Requirements: 3.2, 8.4_

- [x] 3. Implement content script core structure
  - Create `content.js` with IIFE wrapper for isolation
  - Implement main execution flow: detect site → extract → validate → generate CSV → download
  - Add try-catch wrapper for top-level error handling
  - _Requirements: 4.1, 8.3_

- [x] 3.1 Implement site detection in content script
  - Create `detectSite()` function that checks `window.location.hostname`
  - Return 'claude', 'deepseek', or null based on domain matching
  - Use same domain matching logic as popup (exact match or `endsWith`)
  - _Requirements: 2.3, 5.3_

- [x] 3.2 Define DOM selector constants
  - Create `CLAUDE_SELECTORS` object with placeholder selectors for message container, user/assistant messages, timestamp, and content
  - Create `DEEPSEEK_SELECTORS` object with placeholder selectors
  - Add comments indicating these are placeholders requiring inspection of live DOM
  - _Requirements: 5.8, 10.6_

- [x] 4. Implement message extraction functions
  - Create dispatcher function `extractMessages(siteType)` that calls appropriate extractor
  - Handle unsupported site type by returning empty array
  - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [x] 4.1 Implement extractClaudeMessages function
  - Query all message container nodes using `CLAUDE_SELECTORS.messageContainer`
  - Iterate through nodes with try-catch for each message
  - Determine role by checking outermost container first, then nested elements
  - Extract timestamp from time element (datetime attribute or textContent)
  - Extract content using `extractTextContent()` helper
  - Build ChatMessage object with index, role, timestamp, content, source
  - Log warnings for failed messages but continue extraction
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.9_

- [x] 4.2 Implement extractDeepseekMessages function
  - Query all message container nodes using `DEEPSEEK_SELECTORS.messageContainer`
  - Iterate through nodes with try-catch for each message
  - Determine role by checking class names
  - Extract timestamp from time element
  - Extract content using `extractTextContent()` helper
  - Build ChatMessage object with index, role, timestamp, content, source
  - Log warnings for failed messages but continue extraction
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.2, 5.9_

- [x] 4.3 Implement extractTextContent helper function
  - Clone element to avoid modifying original DOM
  - Insert line breaks after block elements (p, div, pre, li)
  - Replace BR elements with newline characters
  - Extract textContent from clone
  - Normalize whitespace: trim lines, filter empty lines, join with newlines
  - _Requirements: 4.6_

- [x] 5. Implement CSV generation
  - Create `generateCSV(messages)` function that builds CSV string from message array
  - Add header row: index, role, timestamp, content, source
  - Map each message to CSV row using `escapeCSVField()` helper
  - Join rows with newlines
  - _Requirements: 6.1, 6.2, 6.6_

- [x] 5.1 Implement CSV field escaping
  - Create `escapeCSVField(field)` function
  - Check if field contains comma, double quote, or newline
  - If yes: escape double quotes by doubling them, wrap field in quotes
  - If no: return field as-is
  - _Requirements: 6.3, 6.4_

- [x] 6. Implement CSV download mechanism
  - Create `downloadCSV(csvContent)` function
  - Generate timestamp using `toISOString()` with replacements for filesystem safety
  - Build filename: `chat_export_${timestamp}.csv`
  - Create Blob with UTF-8 BOM (`\uFEFF`) prepended to CSV content
  - Set MIME type to `text/csv;charset=utf-8;`
  - Create object URL from blob
  - Create hidden anchor element with download attribute
  - Append to body, trigger click, remove element
  - Revoke object URL after 100ms delay
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Implement error handling and user feedback
  - Add check for empty messages array after extraction
  - Display alert "No messages found on this page." if empty
  - Catch exceptions in main try-catch block
  - Display alert "Failed to extract chat..." on exception
  - Log technical error details to console with `console.error()`
  - Log warnings for individual message parsing failures with `console.warn()`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 5.7_

- [x] 8. Create README documentation
  - Document extension purpose and features
  - List supported platforms (Claude, DeepSeek)
  - Provide installation instructions for Firefox
  - Explain how to use the extension
  - Note privacy guarantees (client-side only, no data sent)
  - Include section on updating selectors when DOM changes
  - Add troubleshooting section
  - _Requirements: 10.3_

- [-] 9. Manual testing and validation
  - Load extension in Firefox using about:debugging
  - Test on Claude public chat page
  - Test on DeepSeek public chat page
  - Test on unsupported site
  - Verify CSV downloads with correct filename format
  - Open CSV in Excel and Google Sheets to verify formatting
  - Test with chat containing special characters (quotes, commas, newlines)
  - Verify no network requests in browser DevTools
  - Check console for proper error logging
  - _Requirements: All requirements_
