# Requirements Document

## Introduction

This document specifies the requirements for a Firefox WebExtension that enables users to export publicly shared chats from Claude and DeepSeek into CSV files.

**Architecture Decision:** This extension performs CSV generation entirely client-side and does not communicate with any backend service. All data extraction, transformation, and file generation occurs within the user's browser using only the DOM content already loaded and rendered by the user. This design choice prioritizes user privacy, eliminates server infrastructure requirements, and simplifies browser extension store approval processes.

**Operational Constraints:** The extension only operates on content already rendered in the user's browser. It does not perform automated HTTP requests to Claude or DeepSeek endpoints, does not attempt to bypass Cloudflare or similar bot protection mechanisms, and only runs on pages the user has manually loaded and passed any authentication challenges for.

## Glossary

- **Extension**: The Firefox WebExtension (browser add-on) being developed
- **Public Chat Page**: A publicly accessible shared conversation URL from Claude or DeepSeek that is already loaded in the user's browser
- **Content Script**: JavaScript code injected into the web page context to access and manipulate the DOM
- **CSV Export**: A comma-separated values file containing extracted chat messages
- **Chat Message**: A single conversational turn containing role, timestamp, and content
- **DOM Extraction**: The process of reading and parsing HTML elements from the loaded page to extract chat data

## Requirements

### Requirement 1: Browser Compatibility

**User Story:** As a Firefox user, I want to install and use the extension in my browser, so that I can export chats without switching browsers.

#### Acceptance Criteria

1. THE Extension SHALL be compatible with Firefox using standard WebExtensions APIs
2. THE Extension SHALL use the browser.* namespace and include a minimal polyfill if Chrome compatibility is later required
3. THE Extension SHALL target Manifest V2 for maximum Firefox compatibility, as Manifest V3 support in Firefox is still evolving as of November 2024
4. THE Extension SHALL design its architecture to maintain a clear migration path to Manifest V3 by avoiding background pages and using only action and content scripts
5. THE Extension SHALL avoid deprecated WebExtension APIs and prefer const/let over var, arrow functions where appropriate, and modern JavaScript features

### Requirement 2: Supported Platforms

**User Story:** As a user of Claude and DeepSeek, I want the extension to work on both platforms, so that I can export chats from either service.

#### Acceptance Criteria

1. THE Extension SHALL support Claude public chat URLs matching the pattern https://claude.ai/* and https://*.claude.ai/*
2. THE Extension SHALL support DeepSeek public chat URLs matching the pattern https://chat.deepseek.com/* and https://*.deepseek.com/*
3. THE Extension SHALL perform domain detection based on location.hostname pattern matching
4. WHEN the Extension detects an unsupported domain, THE Extension SHALL inform the user that the page is not supported
5. THE Extension SHALL declare host_permissions in the manifest scoped only to Claude and DeepSeek domains
6. WHERE Claude or DeepSeek introduce additional regional subdomains, THE Extension SHALL add these to host_permissions and domain detection patterns in a single configuration module

### Requirement 3: User-Initiated Export

**User Story:** As a user viewing a public chat, I want to click the extension icon and export the chat, so that I can save the conversation data.

#### Acceptance Criteria

1. WHEN the user clicks the Extension toolbar icon, THE Extension SHALL display a popup with an export button
2. WHEN the user clicks the "Export this chat to CSV" button on a supported site, THE Extension SHALL inject a Content Script into the active tab
3. WHEN the user clicks the export button on an unsupported site, THE Extension SHALL display a clear message in the popup that this page is not supported and SHALL NOT attempt to inject a content script
4. THE Extension SHALL only execute export operations on explicit user action
5. THE Extension SHALL NOT perform any background scraping or automated navigation

### Requirement 4: Message Extraction

**User Story:** As a user, I want all messages from the chat to be extracted accurately, so that I have a complete record of the conversation.

#### Acceptance Criteria

1. THE Content Script SHALL extract all visible chat messages from the DOM
2. THE Content Script SHALL identify each message's role as "user", "assistant", "system", or "other"
3. WHEN timestamp information is available in the DOM, THE Content Script SHALL extract it
4. WHEN no timestamp is available, THE Content Script SHALL set timestamp to an empty string
5. THE Content Script SHALL extract plain text content from messages, stripping HTML markup appropriately
6. THE Content Script SHALL preserve the logical structure of code blocks and paragraphs by inserting line breaks between block-level elements when converting to plain text
7. THE Content Script SHALL record the source platform as "claude" or "deepseek"
8. THE Content Script SHALL handle chats containing up to 1000 messages without freezing the browser UI

### Requirement 5: Site-Specific Extraction Logic

**User Story:** As a developer, I want separate extraction functions for each platform, so that the code is maintainable and adaptable to DOM changes.

#### Acceptance Criteria

1. THE Extension SHALL implement a function extractClaudeMessages that returns an array of ChatMessage objects
2. THE Extension SHALL implement a function extractDeepseekMessages that returns an array of ChatMessage objects
3. THE Extension SHALL implement a dispatcher function that detects the current site based on location.hostname
4. WHEN the dispatcher detects Claude domain, THE Extension SHALL call extractClaudeMessages
5. WHEN the dispatcher detects DeepSeek domain, THE Extension SHALL call extractDeepseekMessages
6. WHEN the dispatcher detects an unsupported domain, THE Extension SHALL return an empty array
7. WHEN the dispatcher returns an empty array due to unsupported domain, THE Extension SHALL display a user-facing message and SHALL NOT attempt CSV generation
8. THE Extension SHALL centralize DOM selectors in clearly documented constants to simplify updates when platform DOM structures change
9. WHEN some message nodes cannot be parsed, THE Extension SHALL skip those nodes but SHALL NOT crash the entire export operation

### Requirement 6: CSV Generation

**User Story:** As a user, I want the exported data in CSV format, so that I can open it in spreadsheet applications or process it programmatically.

#### Acceptance Criteria

1. THE Extension SHALL generate CSV output with columns: index, role, timestamp, content, source
2. THE Extension SHALL use comma as the field delimiter
3. THE Extension SHALL wrap fields in quotes when they contain commas, line breaks, or double quotes
4. THE Extension SHALL escape double quotes in fields by doubling them, in accordance with RFC 4180
5. THE Extension SHALL encode the CSV file as UTF-8
6. THE Extension SHALL perform all CSV conversion client-side without external libraries

### Requirement 7: File Download

**User Story:** As a user, I want the CSV file to download automatically, so that I can access my exported chat data immediately.

#### Acceptance Criteria

1. WHEN CSV generation completes successfully, THE Extension SHALL trigger a browser download
2. THE Extension SHALL name the downloaded file using the pattern "chat_export_YYYYMMDD_HHMM.csv" to prevent filename collisions when exporting multiple chats
3. THE Extension SHALL set the MIME type to "text/csv;charset=utf-8"
4. THE Extension SHALL clean up temporary resources after download initiation

### Requirement 8: Error Handling

**User Story:** As a user, I want clear feedback when export fails, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN no messages are found on the page, THE Extension SHALL display an alert stating "No messages found on this page."
2. WHEN an exception occurs during extraction, THE Extension SHALL display an alert stating "Failed to extract chat. Please check that this is a Claude or DeepSeek public chat page."
3. THE Extension SHALL catch and handle all exceptions during the export process
4. THE Extension SHALL log technical error details to the JavaScript console for debugging purposes, while keeping user-facing messages simple and non-technical
5. THE Extension SHALL NOT silently fail without user notification

### Requirement 9: Privacy and Security

**User Story:** As a privacy-conscious user, I want all processing to happen locally, so that my chat data is not sent to external servers.

#### Acceptance Criteria

1. THE Extension SHALL process all data entirely client-side
2. THE Extension SHALL NOT send any data to external servers
3. THE Extension SHALL NOT perform automated CAPTCHA or Cloudflare challenge handling
4. THE Extension SHALL NOT handle authentication, cookies, or tokens
5. THE Extension SHALL request only the minimal necessary permissions: activeTab, tabs (for Manifest V2 script injection), and domain-scoped host_permissions for Claude and DeepSeek
6. THE Extension SHALL NOT store extracted chat data in extension storage beyond the lifetime of the current export operation

### Requirement 10: Code Quality and Auditability

**User Story:** As a security-conscious user, I want the extension code to be transparent and auditable, so that I can verify it does not contain malicious functionality.

#### Acceptance Criteria

1. THE Extension SHALL use vanilla JavaScript without external dependencies
2. THE Extension SHALL NOT include obfuscated code
3. THE Extension SHALL include clear comments explaining selector logic and CSV generation
4. THE Extension SHALL organize the extraction logic for each platform in a clearly separated section of the code to simplify audits and maintenance
5. THE Extension SHALL organize code into small, focused functions with single responsibilities
6. THE Extension SHALL centralize configuration values such as domain patterns and DOM selectors in clearly documented constants
