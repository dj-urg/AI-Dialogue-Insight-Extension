# AI Chat Exporter

A Firefox extension that exports chats from ChatGPT and Claude into CSV files. All processing happens locally in your browser - no data is sent to external servers.

## Features

- **Export to CSV**: Convert chat conversations into spreadsheet-compatible CSV format
- **Multi-platform support**: Works with ChatGPT (chatgpt.com) and Claude (claude.ai)
- **Privacy-focused**: All extraction and conversion happens client-side
- **Simple interface**: One-click export from the browser toolbar
- **No dependencies**: Pure JavaScript with no external libraries
- **Advanced ChatGPT support**: Exports both conversation metadata and full message history with support for thoughts, tools, and multimodal content
- **Claude support**: Exports Claude conversations with full message history, content blocks, and parent-child relationships

## Supported Platforms

- **ChatGPT**: https://chatgpt.com/* and https://chat.openai.com/* (Fully supported)
- **Claude**: https://claude.ai/chat/* (Fully supported)

### Planned Platforms
- **DeepSeek**: https://chat.deepseek.com/* (Coming soon)
- **Gemini**: https://gemini.google.com/* (Coming soon)
- **Copilot**: https://copilot.microsoft.com/* (Coming soon)

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

### ChatGPT

1. Navigate to any ChatGPT conversation (you must be logged in)
2. Click the AI Chat Exporter icon in your browser toolbar
3. A popup will appear showing the current page status
4. Click "Export this chat to CSV"
5. Two CSV files will be downloaded:
   - `chatgpt_metadata_TIMESTAMP.csv` - Conversation metadata (one row)
   - `chatgpt_messages_TIMESTAMP.csv` - All messages in the conversation

### Claude

1. Navigate to any Claude conversation at https://claude.ai/chat/*
2. Click the AI Chat Exporter icon in your browser toolbar
3. A popup will appear showing the current page status
4. Click "Export this chat to CSV"
5. A CSV file will be downloaded named `claude_conversation_TIMESTAMP.csv`

### CSV Format

#### ChatGPT

**Metadata CSV (CSV A)** - One row per conversation:
- **conversation_id**: Unique conversation identifier
- **title**: Conversation title
- **create_time**: Unix timestamp for conversation start
- **update_time**: Unix timestamp for last update
- **default_model_slug**: Model used (e.g., gpt-5-1)
- **memory_scope**: Memory setting (e.g., global_enabled)
- **is_do_not_remember**: Boolean flag for memory opt-out
- **num_messages**: Total count of all messages
- **num_user_messages**: Count of user messages
- **num_assistant_messages**: Count of assistant messages
- **num_tool_messages**: Count of tool messages
- **user_editable_context**: User profile and custom instructions (JSON string)

**Messages CSV (CSV B)** - One row per message/node:
- **conversation_id**: Links to metadata CSV
- **node_id**: Unique message/node identifier
- **parent_id**: Parent node ID (conversation graph structure)
- **author_role**: Message author (user, assistant, tool, system)
- **content_type**: Type of content (text, thoughts, multimodal_text, etc.)
- **text**: Extracted text content
- **has_image**: Boolean indicating if message contains images
- **image_ids**: Comma-separated image asset pointers
- **create_time**: Message timestamp
- **status**: Message status (e.g., finished_successfully)
- **end_turn**: Boolean indicating end of turn
- **is_visually_hidden**: Boolean indicating if message is hidden in UI
- **model_slug**: Model used for this specific message
- **tool_name**: Tool name (if author_role is "tool")

#### Claude

**Single CSV** - One row per message:
- **conversation_id**: Unique conversation identifier (UUID)
- **conversation_name**: Title of the conversation
- **message_id**: Unique message identifier (UUID)
- **parent_message_id**: Parent message UUID (for conversation threading)
- **sender**: Message author ("human" or "assistant")
- **text**: Extracted text content from content blocks
- **created_at**: Message creation timestamp (ISO 8601 format)
- **updated_at**: Message update timestamp (ISO 8601 format)
- **index**: Sequential message number in conversation
- **truncated**: Boolean indicating if message was truncated
- **stop_reason**: Reason assistant stopped generating (if applicable)

**Key Features:**
- Handles Claude's content block array structure (multiple text blocks concatenated with `\n\n`)
- Preserves parent-child message relationships
- ISO 8601 timestamps for easy parsing
- Includes conversation metadata in each row

All CSV files are UTF-8 encoded and follow RFC 4180 standards, making them compatible with Excel, Google Sheets, R, Python pandas, and other data analysis tools.

## Privacy & Security

- **No external servers**: All data extraction and CSV generation happens entirely in your browser
- **No data collection**: The extension does not collect, store, or transmit any data
- **Minimal permissions**: Only requests `activeTab` and `tabs` permissions
- **Open source**: All code is available for inspection and audit
- **No obfuscation**: Plain JavaScript with clear comments

## Troubleshooting

### "This page is not supported" message

**Cause**: You're on a page that isn't a ChatGPT or Claude chat.

**Solution**: Navigate to a chat page on chatgpt.com or claude.ai/chat/* and try again.

### "No conversation data captured" message

**Cause**: The extension hasn't captured conversation data yet. This may happen if:
- The page hasn't fully loaded yet
- The conversation is empty
- The API interception hasn't triggered

**Solution**: 
1. Wait for the page to fully load and try again
2. Refresh the page to trigger API calls
3. Navigate to a different conversation and back
4. Check browser console (F12) for capture confirmation messages

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

### ChatGPT: "Failed to fetch conversation data" (404 error)

**Cause**: The extension couldn't extract conversation data from the page or API.

**Solution**:
1. **Refresh the page** - Make sure the conversation is fully loaded
2. **Check you're logged in** - You must be logged into ChatGPT
3. **Wait a moment** - Let the page fully load before clicking export
4. **Use debug tool** - Open `CHATGPT_DEBUG_BOOKMARKLET.html` for detailed diagnostics
5. **Manual extraction** - See `DEBUG_CHATGPT.md` for alternative methods

**Debug in console (F12)**:
- ✅ "Found conversation data in __NEXT_DATA__" - Working correctly
- ⚠️ "Data not found on page, trying API fetch..." - Using fallback method
- ❌ "API fetch also failed" - Both methods failed

If both methods fail, ChatGPT may have changed their page structure. Use the manual extraction method in `DEBUG_CHATGPT.md`.

### Claude: "No conversation data captured"

**Cause**: The extension hasn't intercepted Claude API responses yet.

**Solution**:
1. **Refresh the page** - This triggers the API calls that the extension intercepts
2. **Check console logs** - Open browser console (F12) and look for:
   - ✅ "[Claude] Fetch interceptor installed" - Extension loaded correctly
   - ✅ "[Claude] ✓ Captured conversation data" - Data captured successfully
3. **Navigate within Claude** - Switch to another conversation and back
4. **Verify URL** - Ensure you're on a URL matching `https://claude.ai/chat/*`

**Debug checklist**:
- Extension is enabled in `about:addons`
- You're on a Claude conversation page (not the home page)
- Browser console shows no errors
- Content script is injected (check for "[Claude]" logs)

### Extension icon is grayed out or unresponsive

**Cause**: Permission or installation issue.

**Solution**:
1. Check that the extension is enabled in `about:addons`
2. Try reloading the extension from `about:debugging`
3. Ensure you're using a recent version of Firefox

## API Changes and Updates

ChatGPT and Claude use API interception rather than DOM scraping, making the extension more resilient to UI changes. However, if the platforms change their API structure, the extension may need updates.

### Reporting API Issues

If you encounter extraction issues:

1. Open an issue on the project repository
2. Include:
   - The platform (ChatGPT or Claude)
   - The date when extraction stopped working
   - Browser console errors (if any)
   - Console logs showing "[Platform] Fetch interceptor installed" status

## Development

### Project Structure

```
ai-chat-exporter/
├── manifest.json           # Extension configuration
├── background.js           # Background script with platform handlers
├── popup.html              # Popup UI structure
├── popup.js                # Popup logic and messaging
├── config/
│   └── settings.js         # Platform configuration
├── platforms/
│   ├── chatgpt/
│   │   ├── content.js      # ChatGPT content script
│   │   └── inject.js       # ChatGPT API interceptor
│   └── claude/
│       ├── content.js      # Claude content script
│       └── inject.js       # Claude API interceptor
├── utils/
│   ├── csv.js              # CSV generation utilities
│   ├── flatten.js          # Object flattening utilities
│   └── helpers.js          # General helper functions
├── tests/                  # Test files and test data
├── icon.png                # Extension icon
└── README.md               # This file
```

### Technical Details

- **Manifest Version**: V2 (for maximum Firefox compatibility)
- **JavaScript**: ES6+ (const/let, arrow functions, template literals)
- **Architecture**: Modular platform-specific handlers with shared utilities
- **Data Capture**: API interception via fetch hooks (no DOM scraping)
- **Privacy**: All processing happens locally in the browser
- **APIs Used**:
  - `window.fetch` hook - Intercept API responses (inject scripts)
  - `window.postMessage` - Page to content script communication
  - `browser.runtime.sendMessage()` - Content script to background communication
  - `browser.downloads` - Trigger CSV file downloads
  - Blob API - Create CSV files

### Testing

Manual testing checklist:

1. Install extension in Firefox
2. Test on ChatGPT conversation → verify export works
3. Test on Claude conversation → verify export works
4. Test on unsupported site → verify error message
5. Open exported CSV in Excel/Google Sheets → verify formatting
6. Test with special characters (quotes, commas, newlines) → verify escaping
7. Check browser console → verify capture logs appear
8. Check network tab → verify no external requests

Automated testing:

- `tests/test_chatgpt_extractor.js` - ChatGPT data extraction tests
- `tests/test_claude_extractor.js` - Claude data extraction tests
- `tests/test_flatten_utility.js` - Object flattening tests
- Test data in `tests/chatgpt.com/` and `tests/claude.ai/`

### Architecture Highlights

This extension uses a robust architecture for reliable data capture:

1. **API Interception**: Captures data directly from platform APIs rather than scraping DOM
   - More reliable than DOM scraping
   - Resilient to UI changes
   - Gets complete conversation data

2. **Modular Platform Handlers**: Each platform has dedicated processing logic
   - `ChatGPTHandler` - Handles hierarchical message mapping
   - `ClaudeHandler` - Handles flat message array structure
   - Shared CSV utilities for consistent output

3. **Three-Layer Communication**:
   - Inject script (page context) → Content script (isolated) → Background script (processing)
   - Secure message passing between contexts
   - No data leakage between layers

4. **Privacy-First Design**:
   - All processing happens locally
   - No external network requests
   - No data storage or tracking

## Contributing

Contributions are welcome! Areas for improvement:

- Support for additional platforms (DeepSeek, Gemini, Copilot)
- Additional export formats (JSON, Markdown)
- Automated testing improvements
- Internationalization (i18n)
- Chrome Web Store publication

## License

[Add your license here]

## Changelog

### Version 2.1.0 (2024-11-18)
- **NEW**: Claude.ai conversation export support
- **NEW**: ClaudeHandler for flat message array processing
- **NEW**: Support for Claude's content block array structure
- Added Claude inject and content scripts
- ISO 8601 timestamp handling for Claude
- Updated documentation for Claude platform
- Added test suite for Claude extraction

### Version 2.0.0
- Code cleanup and consolidation
- Removed duplicate files and utilities
- Consolidated CSV and flatten utilities
- Integrated platform handlers into main background script
- Updated architecture documentation

### Version 1.2.0
- **NEW**: ChatGPT conversation export support
- **NEW**: Dual CSV output for ChatGPT (metadata + messages)
- **NEW**: Support for ChatGPT thoughts, tools, and multimodal content
- Added ChatGPT domains to supported sites
- Updated manifest permissions for ChatGPT API access
- Created dedicated content script for ChatGPT
- Added test suite for ChatGPT extraction

### Version 1.0.0
- Initial release
- Basic CSV export functionality
- Client-side processing
