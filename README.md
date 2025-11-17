# AI Chat Exporter

A Firefox extension that exports publicly shared chats from Claude and DeepSeek into CSV files. All processing happens locally in your browser - no data is sent to external servers.

## Features

- **Export to CSV**: Convert chat conversations into spreadsheet-compatible CSV format
- **Multi-platform support**: Works with Claude (claude.ai) and DeepSeek (chat.deepseek.com)
- **Privacy-focused**: All extraction and conversion happens client-side
- **Simple interface**: One-click export from the browser toolbar
- **No dependencies**: Pure JavaScript with no external libraries

## Supported Platforms

- **Claude**: https://claude.ai/* and https://*.claude.ai/*
- **DeepSeek**: https://chat.deepseek.com/* and https://*.deepseek.com/*

## Installation

### Firefox (Development)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to the extension directory and select `manifest.json`
5. The extension icon will appear in your browser toolbar

### Firefox Add-ons Store

*Coming soon - extension will be submitted to Mozilla Add-ons (AMO) for easier installation*

## Usage

1. Navigate to a public chat page on Claude or DeepSeek
2. Click the AI Chat Exporter icon in your browser toolbar
3. A popup will appear showing the current page status
4. Click "Export this chat to CSV"
5. The chat will be downloaded as a CSV file named `chat_export_YYYYMMDD_HHMM.csv`

### CSV Format

The exported CSV contains the following columns:

- **index**: Sequential message number (0-based)
- **role**: Message sender ("user", "assistant", "system", or "other")
- **timestamp**: Message timestamp (if available)
- **content**: Plain text message content with preserved structure
- **source**: Platform name ("claude" or "deepseek")

The CSV file is UTF-8 encoded and follows RFC 4180 standards, making it compatible with Excel, Google Sheets, and other spreadsheet applications.

## Privacy & Security

- **No external servers**: All data extraction and CSV generation happens entirely in your browser
- **No data collection**: The extension does not collect, store, or transmit any data
- **Minimal permissions**: Only requests `activeTab` and `tabs` permissions
- **Open source**: All code is available for inspection and audit
- **No obfuscation**: Plain JavaScript with clear comments

## Troubleshooting

### "This page is not supported" message

**Cause**: You're on a page that isn't a Claude or DeepSeek chat.

**Solution**: Navigate to a public chat page on claude.ai or chat.deepseek.com and try again.

### "No messages found on this page" alert

**Cause**: The extension couldn't find any chat messages on the page. This may happen if:
- The page hasn't fully loaded yet
- The chat is empty
- The DOM structure has changed and selectors need updating

**Solution**: 
1. Wait for the page to fully load and try again
2. Refresh the page and retry
3. If the issue persists, the selectors may need updating (see below)

### "Failed to extract chat" alert

**Cause**: An unexpected error occurred during extraction.

**Solution**:
1. Check the browser console (F12) for detailed error messages
2. Ensure you're on a supported chat page
3. Try refreshing the page
4. If the issue persists, report it as a bug with console error details

### CSV opens incorrectly in Excel

**Cause**: Character encoding issues (rare, as the extension includes UTF-8 BOM).

**Solution**: 
1. Open Excel
2. Use "Data" → "From Text/CSV" instead of double-clicking the file
3. Ensure UTF-8 encoding is selected

### Extension icon is grayed out or unresponsive

**Cause**: Permission or installation issue.

**Solution**:
1. Check that the extension is enabled in `about:addons`
2. Try reloading the extension from `about:debugging`
3. Ensure you're using a recent version of Firefox

## Updating DOM Selectors

Chat platforms occasionally update their HTML structure, which may break message extraction. When this happens, the selectors need to be updated.

### How to Update Selectors

1. Open the browser console (F12) on the affected chat page
2. Inspect the DOM structure of chat messages
3. Identify the correct CSS selectors for:
   - Message container elements
   - User vs assistant message indicators
   - Timestamp elements
   - Message content blocks

4. Edit `content.js` and update the appropriate selector constants:

```javascript
// For Claude
const CLAUDE_SELECTORS = {
  messageContainer: '[data-testid="conversation-turn"]',  // Update this
  userMessage: '.user-message',                           // Update this
  assistantMessage: '.assistant-message',                 // Update this
  timestamp: 'time',                                      // Update this
  contentBlock: '.message-content'                        // Update this
};

// For DeepSeek
const DEEPSEEK_SELECTORS = {
  messageContainer: '.chat-message',                      // Update this
  userMessage: '.message-user',                           // Update this
  assistantMessage: '.message-assistant',                 // Update this
  timestamp: '.message-time',                             // Update this
  contentBlock: '.message-text'                           // Update this
};
```

5. Reload the extension in `about:debugging`
6. Test the export functionality

### Reporting Selector Issues

If you encounter extraction issues and aren't comfortable updating selectors yourself:

1. Open an issue on the project repository
2. Include:
   - The platform (Claude or DeepSeek)
   - The date when extraction stopped working
   - Browser console errors (if any)
   - A screenshot of the chat page structure (F12 → Elements tab)

## Development

### Project Structure

```
ai-chat-exporter/
├── manifest.json      # Extension configuration
├── popup.html         # Popup UI structure
├── popup.js           # Popup logic and script injection
├── content.js         # Message extraction and CSV generation
├── icon.png           # Extension icon (48x48)
└── README.md          # This file
```

### Technical Details

- **Manifest Version**: V2 (for maximum Firefox compatibility)
- **JavaScript**: ES6+ (const/let, arrow functions, template literals)
- **APIs Used**: 
  - `browser.tabs.query()` - Get active tab information
  - `browser.tabs.executeScript()` - Inject content script
  - DOM APIs - Extract message content
  - Blob API - Create CSV file

### Testing

Manual testing checklist:

1. Install extension in Firefox
2. Test on Claude public chat → verify export works
3. Test on DeepSeek public chat → verify export works
4. Test on unsupported site → verify error message
5. Open exported CSV in Excel/Google Sheets → verify formatting
6. Test with special characters (quotes, commas, newlines) → verify escaping
7. Check browser console → verify no errors
8. Check network tab → verify no external requests

## Contributing

Contributions are welcome! Areas for improvement:

- Support for additional platforms (ChatGPT, Gemini, etc.)
- Additional export formats (JSON, Markdown)
- Automated selector testing
- Internationalization (i18n)

## License

[Add your license here]

## Changelog

### Version 1.0.0
- Initial release
- Support for Claude and DeepSeek
- CSV export functionality
- Client-side processing
