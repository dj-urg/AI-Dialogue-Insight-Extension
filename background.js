/**
 * Main Background Script - Platform Router
 * 
 * Routes conversation data to platform-specific handlers
 * and manages CSV generation and downloads
 */

// Platform handlers (loaded via script tags in manifest)
const platformHandlers = {};

/**
 * ChatGPT Platform Handler
 * Handles ChatGPT-specific conversation data processing
 */


/**
 * Claude Platform Handler
 * Handles Claude-specific conversation data processing
 */
const ClaudeHandler = {
  /**
   * Extract text content from Claude message content array
   * Claude messages can have multiple content blocks
   */
  extractTextFromContent(content) {
    if (!content || !Array.isArray(content)) {
      return '';
    }

    return content
      .filter(block => block && block.type === 'text')
      .map(block => block.text || '')
      .join('\n\n');
  },

  /**
   * Flatten Claude conversation data into CSV rows
   */
  flattenConversationData(convJson) {
    if (!convJson || !Array.isArray(convJson.chat_messages)) {
      console.warn('[Claude] Invalid conversation data: missing chat_messages');
      return [];
    }

    const messages = convJson.chat_messages;
    const conversationId = convJson.uuid || '';
    const conversationName = convJson.name || '';
    const rows = [];

    for (const msg of messages) {
      try {
        // Extract text from content array
        const text = this.extractTextFromContent(msg.content);

        // Build row
        const row = {
          conversation_id: conversationId,
          conversation_name: conversationName,
          message_id: msg.uuid || '',
          parent_message_id: msg.parent_message_uuid || '',
          sender: msg.sender || '',
          text: text,
          created_at: msg.created_at || '',
          updated_at: msg.updated_at || '',
          index: msg.index !== undefined ? msg.index : '',
          truncated: msg.truncated || false,
          stop_reason: msg.stop_reason || ''
        };

        rows.push(row);
      } catch (error) {
        console.error('[Claude] Error processing message:', error);
        // Continue with next message
      }
    }

    return rows;
  }
};

// Make ClaudeHandler accessible globally
if (typeof window !== 'undefined') {
  window.ClaudeHandler = ClaudeHandler;
}

/**
 * Copilot Platform Handler
 * Handles Copilot-specific conversation data processing
 */
const CopilotHandler = {
  /**
   * Extract text content from Copilot content parts array
   * Copilot messages can have multiple content parts with type "text"
   */
  extractTextFromContent(content) {
    if (!content || !Array.isArray(content)) {
      return '';
    }

    return content
      .filter(part => part && part.type === 'text')
      .map(part => part.text || '')
      .join('\n\n');
  },

  /**
   * Flatten Copilot conversation data into CSV rows
   */
  flattenConversationData(convJson) {
    if (!convJson || !Array.isArray(convJson.results)) {
      console.warn('[Copilot] Invalid conversation data: missing results');
      return [];
    }

    const results = convJson.results;
    const conversationId = convJson.conversationId || '';
    const rows = [];

    for (const result of results) {
      try {
        // Extract text from content array
        const text = this.extractTextFromContent(result.content);

        // Map author.type to role
        const authorType = result.author?.type || '';
        const role = authorType === 'human' ? 'user' :
          authorType === 'ai' ? 'assistant' :
            authorType;

        // Extract part IDs (for reference)
        const partIds = result.content
          ?.filter(part => part && part.type === 'text')
          .map(part => part.partId || '')
          .join(',') || '';

        // Build row
        const row = {
          conversation_id: conversationId,
          message_id: result.id || '',
          role: role,
          text: text,
          created_at: result.createdAt || '',
          channel: result.channel || '',
          mode: result.mode || '',
          part_ids: partIds,
          author_type: authorType
        };

        rows.push(row);
      } catch (error) {
        console.error('[Copilot] Error processing result:', error);
        // Continue with next result
      }
    }

    return rows;
  }
};

// Make CopilotHandler accessible globally
if (typeof window !== 'undefined') {
  window.CopilotHandler = CopilotHandler;
}

/**
 * CSV Utility Functions (from utils/csv.js)
 */

/**
 * Escapes a field value for CSV format according to RFC 4180
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') ||
    stringValue.includes('\n') || stringValue.includes('\r')) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
}

/**
 * Generates CSV content from an array of objects
 */
function generateCSV(data, headers = null) {
  if (!data || data.length === 0) {
    return '';
  }

  if (!headers) {
    headers = Object.keys(data[0]);
  }

  const headerRow = headers.map(escapeCSVField).join(',');

  const rows = [headerRow];
  for (const row of data) {
    const values = headers.map(header => escapeCSVField(row[header]));
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

/**
 * Generates a CSV file with UTF-8 BOM for Excel compatibility
 */
function createCSVBlob(csvContent) {
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generates a filename with timestamp
 */
function generateFilename(prefix = 'export', suffix = '') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

  if (suffix) {
    return `${prefix}_${suffix}_${timestamp}.csv`;
  }

  return `${prefix}_${timestamp}.csv`;
}

/**
 * Handle conversation data from any platform
 */
function handleConversationData(message) {
  const platform = message.platform || 'unknown';
  const conversationData = message.payload;

  if (!conversationData) {
    console.error(`[${platform}] No conversation data in message`);
    return;
  }

  console.log(`[${platform}] Processing conversation data`);

  try {
    // Get platform-specific handler
    let rows;
    let csvFiles = []; // Array of { filename, content }

    if (platform === 'chatgpt') {
      // Use the new extractor which returns multiple CSVs
      if (typeof extractChatGPTConversation === 'function') {
        const result = extractChatGPTConversation(conversationData);

        const conversationId = conversationData.conversation_id || conversationData.id || 'unknown';
        const idShort = conversationId.substring(0, 8);

        csvFiles.push({
          filename: generateFilename(`chatgpt_metadata`, idShort),
          content: result.metadataCSV
        });

        csvFiles.push({
          filename: generateFilename(`chatgpt_messages`, idShort),
          content: result.messagesCSV
        });
      } else {
        console.error('[ChatGPT] Extractor function not found');
        return;
      }
    } else if (platform === 'claude' && ClaudeHandler) {
      rows = ClaudeHandler.flattenConversationData(conversationData);
    } else if (platform === 'copilot' && CopilotHandler) {
      rows = CopilotHandler.flattenConversationData(conversationData);
    } else {
      // Fallback: try to use generic handler or platform-specific handler
      const handler = platformHandlers[platform];
      if (handler && handler.flattenConversationData) {
        rows = handler.flattenConversationData(conversationData);
      } else {
        console.error(`[${platform}] No handler found for platform`);
        return;
      }
    }

    // If we have rows (legacy single CSV path), convert to csvFiles format
    if (rows && rows.length > 0) {
      const csv = generateCSV(rows);
      const conversationId = conversationData.conversation_id || conversationData.id || 'unknown';
      const idShort = conversationId.substring(0, 8);
      const filename = generateFilename(`${platform}_conversation`, idShort);

      csvFiles.push({
        filename: filename,
        content: csv
      });
    } else if (csvFiles.length === 0) {
      console.warn(`[${platform}] No data extracted from conversation`);
      return;
    }

    // Process all CSV files
    csvFiles.forEach((file, index) => {
      // Create blob with UTF-8 BOM
      const blob = createCSVBlob(file.content);
      const url = URL.createObjectURL(blob);

      // Trigger download with a small delay between files to ensure browser handles them
      setTimeout(() => {
        browser.downloads.download({
          url: url,
          filename: file.filename,
          saveAs: false
        }).then(() => {
          console.log(`[${platform}] ✓ Download triggered`, {
            filename: file.filename
          });

          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        }).catch(error => {
          console.error(`[${platform}] ✗ Download failed:`, error);
          URL.revokeObjectURL(url);
        });
      }, index * 500);
    });

  } catch (error) {
    console.error(`[${platform}] Error processing conversation data:`, error);
  }
}

/**
 * Message listener - routes to platform handlers
 */
browser.runtime.onMessage.addListener((message, sender) => {
  // Validate sender
  if (sender.id !== browser.runtime.id) return;

  // Handle ChatGPT conversation data
  if (message.type === 'CHATGPT_CONVERSATION_DATA') {
    handleConversationData({
      platform: message.platform || 'chatgpt',
      payload: message.payload
    });
    return false;
  }

  // Handle Claude conversation data
  if (message.type === 'CLAUDE_CONVERSATION_DATA') {
    handleConversationData({
      platform: message.platform || 'claude',
      payload: message.payload
    });
    return false;
  }

  // Handle Copilot conversation data
  if (message.type === 'COPILOT_CONVERSATION_DATA') {
    handleConversationData({
      platform: message.platform || 'copilot',
      payload: message.payload
    });
    return false;
  }

  // Add other platform message types here as they're implemented
  // if (message.type === 'DEEPSEEK_CONVERSATION_DATA') { ... }

  return false;
});

console.log('AI Chat Exporter: Main background script loaded');
