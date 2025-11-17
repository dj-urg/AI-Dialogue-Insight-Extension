(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION: Supported Domains
  // ============================================================================
  
  const SUPPORTED_DOMAINS = {
    claude: ['claude.ai'],
    deepseek: ['chat.deepseek.com', 'deepseek.com']
  };

  // ============================================================================
  // SITE DETECTION
  // ============================================================================
  
  /**
   * Detects which AI chat platform the current page belongs to.
   * Uses exact match or endsWith logic to prevent false positives.
   * 
   * @returns {string|null} 'claude', 'deepseek', or null if unsupported
   */
  function detectSite() {
    const hostname = window.location.hostname;
    
    for (const [site, domains] of Object.entries(SUPPORTED_DOMAINS)) {
      // Use exact match or endsWith to avoid false positives like "evilclaude.ai.example.com"
      if (domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return site;
      }
    }
    
    return null;
  }

  // ============================================================================
  // DOM SELECTORS
  // ============================================================================
  
  // NOTE: These are PLACEHOLDER selectors that must be updated after inspecting
  // the live DOM structure of Claude and DeepSeek chat pages.
  // To find the correct selectors:
  // 1. Open a public chat page in the browser
  // 2. Open DevTools (F12) and inspect message elements
  // 3. Identify stable selectors (data-testid, class names, etc.)
  // 4. Update these constants accordingly
  
  const CLAUDE_SELECTORS = {
    // User messages have a data-testid attribute
    userMessage: '[data-testid="user-message"]',
    // AI messages have standard-markdown class
    assistantMessage: '.standard-markdown',
    // Fallback: try to find any message-like containers
    fallbackContainers: [
      '[data-testid*="message"]',
      '[class*="message"]',
      '[class*="font-claude"]',
      'div[class*="grid"]'
    ],
    // Timestamp selector
    timestamp: 'time'
  };
  
  const DEEPSEEK_SELECTORS = {
    // Primary selector for DeepSeek messages (based on actual DOM inspection)
    messageContainer: '.ds-message',
    // User message has this additional class
    userClass: 'd29f3d7d',
    // Fallback selectors if primary fails
    fallbackContainers: [
      '[class*="ds-message"]',
      '[class*="message"]',
      '[class*="chat-item"]',
      'article',
      '[data-testid*="message"]'
    ],
    // Role detection patterns (for fallback)
    userPatterns: ['user', 'human', 'question', 'prompt', 'query', 'd29f3d7d'],
    assistantPatterns: ['assistant', 'ai', 'bot', 'model', 'answer', 'response']
  };

  // Debug mode - set to true to see what elements are found
  // WARNING: Debug mode logs message content to console, which may expose private data
  // Only enable for development/debugging, never in production
  const DEBUG_MODE = false;

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Validates and sanitizes a timestamp string from untrusted DOM content.
   * Accepts ISO 8601 format or converts to ISO format if possible.
   * Returns current timestamp if invalid.
   *
   * @param {string} timestampStr - The timestamp string to validate
   * @returns {string} Valid ISO 8601 timestamp
   */
  function sanitizeTimestamp(timestampStr) {
    if (!timestampStr || typeof timestampStr !== 'string') {
      return new Date().toISOString();
    }

    // Remove any potential CSV injection characters
    const cleaned = timestampStr.trim().replace(/[=+\-@]/g, '');

    // Try to parse as date
    const date = new Date(cleaned);

    // Check if valid date (not NaN and reasonable range)
    if (isNaN(date.getTime()) || date.getFullYear() < 2020 || date.getFullYear() > 2100) {
      return new Date().toISOString();
    }

    return date.toISOString();
  }

  // ============================================================================
  // TEXT CONTENT EXTRACTION
  // ============================================================================

  /**
   * Extracts plain text content from an HTML element while preserving structure.
   * Inserts line breaks after block elements and normalizes whitespace.
   *
   * @param {HTMLElement} element - The DOM element to extract text from
   * @returns {string} Plain text content with preserved structure
   */
  function extractTextContent(element) {
    // Clone to avoid modifying original DOM
    const clone = element.cloneNode(true);
    
    // Add line breaks after block elements
    const blockElements = clone.querySelectorAll('p, div, pre, li');
    blockElements.forEach(el => {
      el.insertAdjacentText('afterend', '\n');
    });
    
    // Replace BR elements with newline characters
    const brElements = clone.querySelectorAll('br');
    brElements.forEach(br => {
      br.replaceWith('\n');
    });
    
    // Get text content
    let text = clone.textContent || '';
    
    // Normalize whitespace: trim lines, filter empty lines, join with newlines
    text = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    return text;
  }

  // ============================================================================
  // MESSAGE EXTRACTION
  // ============================================================================
  
  /**
   * Finds Claude message container elements.
   *
   * @returns {Array<HTMLElement>} Array of message container elements
   */
  function findClaudeMessageContainers() {
    if (DEBUG_MODE) {
      console.log('AI Chat Exporter: Searching for Claude message containers...');
    }

    const messages = [];

    // Find user messages
    const userMessages = document.querySelectorAll(CLAUDE_SELECTORS.userMessage);
    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Found ${userMessages.length} user messages`);
    }
    messages.push(...Array.from(userMessages).map(el => ({ element: el, role: 'user' })));

    // Find assistant messages
    const assistantMessages = document.querySelectorAll(CLAUDE_SELECTORS.assistantMessage);
    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Found ${assistantMessages.length} assistant messages`);
    }
    messages.push(...Array.from(assistantMessages).map(el => ({ element: el, role: 'assistant' })));

    // Sort by DOM order (position in document)
    messages.sort((a, b) => {
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1; // a comes before b
      } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1; // b comes before a
      }
      return 0;
    });

    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Total ${messages.length} messages in DOM order`);
    }

    return messages;
  }

  /**
   * Extracts messages from Claude chat pages.
   *
   * @returns {Array<Object>} Array of ChatMessage objects
   */
  function extractClaudeMessages() {
    const messages = [];

    // Find message containers with their roles
    const messageData = findClaudeMessageContainers();

    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Processing ${messageData.length} Claude messages`);
    }

    messageData.forEach((data, index) => {
      try {
        const { element, role } = data;

        if (DEBUG_MODE && index < 3) {
          console.log(`AI Chat Exporter: Message ${index} - Role: ${role}, Tag: ${element.tagName}`);
        }

        // Extract timestamp
        const timeElement = element.querySelector(CLAUDE_SELECTORS.timestamp);
        let timestamp = '';
        if (timeElement) {
          const rawTimestamp = timeElement.getAttribute('datetime') || timeElement.textContent.trim();
          timestamp = sanitizeTimestamp(rawTimestamp);
        } else {
          timestamp = new Date().toISOString();
        }

        // Extract content
        const content = extractTextContent(element);

        if (DEBUG_MODE && index < 3) {
          console.log(`AI Chat Exporter: Message ${index} - Content length: ${content.length} chars`);
        }

        // Only add messages with actual content
        if (content.length > 0) {
          messages.push({
            index: messages.length,
            role,
            timestamp,
            content,
            source: 'claude'
          });
        }
      } catch (error) {
        console.warn(`AI Chat Exporter: Failed to parse message ${index}:`, error);
        // Continue with next message - best-effort extraction
      }
    });

    return messages;
  }
  
  /**
   * Detects the role (user/assistant) from a DeepSeek message element.
   *
   * @param {HTMLElement} element - The element to check
   * @returns {string} 'user' or 'assistant'
   */
  function detectDeepseekRole(element) {
    // Check if element has the user-specific class
    if (element.classList.contains(DEEPSEEK_SELECTORS.userClass)) {
      return 'user';
    }

    // Fallback: check class names for patterns
    const classNames = element.className.toLowerCase();
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .map(attr => attr.value.toLowerCase())
      .join(' ');
    const combinedText = `${classNames} ${dataAttrs}`;

    // Check for user patterns
    if (DEEPSEEK_SELECTORS.userPatterns.some(pattern => combinedText.includes(pattern))) {
      return 'user';
    }

    // Check for assistant patterns
    if (DEEPSEEK_SELECTORS.assistantPatterns.some(pattern => combinedText.includes(pattern))) {
      return 'assistant';
    }

    // Default to assistant if no user indicators found
    return 'assistant';
  }

  /**
   * Finds DeepSeek message container elements using primary and fallback strategies.
   *
   * @returns {Array<HTMLElement>} Array of message container elements
   */
  function findDeepseekMessageContainers() {
    if (DEBUG_MODE) {
      console.log('AI Chat Exporter: Searching for DeepSeek message containers...');
    }

    // Try primary selector first
    let elements = document.querySelectorAll(DEEPSEEK_SELECTORS.messageContainer);
    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Primary selector "${DEEPSEEK_SELECTORS.messageContainer}" found ${elements.length} elements`);
    }

    // If primary selector works, use it
    if (elements.length > 0) {
      const validElements = Array.from(elements).filter(el => {
        const text = el.textContent.trim();
        return text.length > 10; // Messages should have at least some content
      });

      if (validElements.length > 0) {
        if (DEBUG_MODE) {
          console.log(`AI Chat Exporter: Using primary selector with ${validElements.length} valid messages`);
          console.log('AI Chat Exporter: Sample element classes:', validElements[0].className);
        }
        return validElements;
      }
    }

    // Fallback: try alternative selectors
    if (DEBUG_MODE) {
      console.log('AI Chat Exporter: Primary selector failed, trying fallbacks...');
    }

    for (const selector of DEEPSEEK_SELECTORS.fallbackContainers) {
      elements = document.querySelectorAll(selector);
      if (DEBUG_MODE) {
        console.log(`AI Chat Exporter: Fallback selector "${selector}" found ${elements.length} elements`);
      }

      const validElements = Array.from(elements).filter(el => {
        const text = el.textContent.trim();
        return text.length > 20;
      });

      if (validElements.length > 0) {
        if (DEBUG_MODE) {
          console.log(`AI Chat Exporter: Using fallback selector "${selector}" with ${validElements.length} valid elements`);
        }
        return validElements;
      }
    }

    if (DEBUG_MODE) {
      console.log('AI Chat Exporter: No message containers found with any selector');
    }
    return [];
  }

  /**
   * Extracts messages from DeepSeek chat pages.
   *
   * @returns {Array<Object>} Array of ChatMessage objects
   */
  function extractDeepseekMessages() {
    const messages = [];

    // Find message containers
    const messageNodes = findDeepseekMessageContainers();

    if (DEBUG_MODE) {
      console.log(`AI Chat Exporter: Processing ${messageNodes.length} message nodes`);
    }

    messageNodes.forEach((node, index) => {
      try {
        // Determine role (user or assistant)
        const role = detectDeepseekRole(node);

        if (DEBUG_MODE && index < 3) {
          console.log(`AI Chat Exporter: Message ${index} - Role: ${role}, Classes: ${node.className}`);
        }

        // Extract timestamp (try multiple approaches)
        let timestamp = '';
        const timeElement = node.querySelector('time');
        if (timeElement) {
          const rawTimestamp = timeElement.getAttribute('datetime') || timeElement.textContent.trim();
          timestamp = sanitizeTimestamp(rawTimestamp);
        } else {
          timestamp = new Date().toISOString();
        }

        // Extract content
        const content = extractTextContent(node);

        if (DEBUG_MODE && index < 3) {
          console.log(`AI Chat Exporter: Message ${index} - Content length: ${content.length} chars`);
        }

        // Only add messages with actual content
        if (content.length > 0) {
          messages.push({
            index: messages.length, // Use sequential index for messages with content
            role,
            timestamp,
            content,
            source: 'deepseek'
          });
        }
      } catch (error) {
        console.warn(`AI Chat Exporter: Failed to parse message ${index}:`, error);
        // Continue with next message
      }
    });

    return messages;
  }
  
  /**
   * Dispatcher function that calls the appropriate message extractor based on site type.
   * 
   * @param {string} siteType - The detected site type ('claude', 'deepseek', or null)
   * @returns {Array<Object>} Array of ChatMessage objects, or empty array if unsupported
   */
  function extractMessages(siteType) {
    if (siteType === 'claude') {
      return extractClaudeMessages();
    } else if (siteType === 'deepseek') {
      return extractDeepseekMessages();
    } else {
      // Unsupported site type - return empty array
      return [];
    }
  }

  // ============================================================================
  // CSV GENERATION
  // ============================================================================
  
  /**
   * Escapes a CSV field according to RFC 4180.
   * Wraps field in quotes if it contains comma, double quote, or newline.
   * Escapes double quotes by doubling them.
   * 
   * @param {*} field - The field value to escape
   * @returns {string} Escaped CSV field
   */
  function escapeCSVField(field) {
    // Convert to string
    const str = String(field);
    
    // Check if escaping is needed
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      // Escape quotes by doubling them
      const escaped = str.replace(/"/g, '""');
      // Wrap in quotes
      return `"${escaped}"`;
    }
    
    return str;
  }
  
  /**
   * Generates CSV content from an array of chat messages.
   * 
   * @param {Array<Object>} messages - Array of ChatMessage objects
   * @returns {string} CSV formatted string
   */
  function generateCSV(messages) {
    // Header row
    const headers = ['index', 'role', 'timestamp', 'content', 'source'];
    const rows = [headers];
    
    // Data rows
    messages.forEach(msg => {
      rows.push([
        msg.index.toString(),
        escapeCSVField(msg.role),
        escapeCSVField(msg.timestamp),
        escapeCSVField(msg.content),
        escapeCSVField(msg.source)
      ]);
    });
    
    // Join rows with newlines
    return rows.map(row => row.join(',')).join('\n');
  }

  // ============================================================================
  // CSV DOWNLOAD
  // ============================================================================
  
  /**
   * Triggers a browser download of the CSV content.
   * Creates a Blob with UTF-8 BOM for Excel compatibility and generates a
   * timestamped filename.
   *
   * @param {string} csvContent - The CSV formatted string to download
   */
  function downloadCSV(csvContent) {
    // Generate timestamp for filename using ISO format with filesystem-safe replacements
    const now = new Date();

    let filename;
    // Validate date object
    if (isNaN(now.getTime())) {
      console.error('AI Chat Exporter: Invalid date object, using fallback timestamp');
      const fallbackTimestamp = Date.now();
      filename = `chat_export_${fallbackTimestamp}.csv`;
    } else {
      const timestamp = now.toISOString()
        .replace(/:/g, '-')           // Replace colons with hyphens
        .replace(/\..+/, '')          // Remove milliseconds
        .replace('T', '_');           // Replace T with underscore
      // Example result: "2024-11-17_10-30-00"

      // Sanitize filename to ensure filesystem safety (remove any non-alphanumeric except dash, underscore, dot)
      const safeTimestamp = timestamp.replace(/[^a-zA-Z0-9\-_]/g, '-');
      filename = `chat_export_${safeTimestamp}.csv`;
    }
    
    // Create Blob with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Create object URL from blob
    const url = URL.createObjectURL(blob);
    
    // Create hidden anchor element with download attribute
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Append to body, trigger click, remove element
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke object URL after 100ms delay to ensure download starts
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
    console.log(`AI Chat Exporter: Download triggered for ${filename}`);
  }

  // ============================================================================
  // MAIN EXECUTION FLOW
  // ============================================================================
  
  try {
    // 1. Detect current site
    const siteType = detectSite();

    if (!siteType) {
      alert('This page is not supported. Please navigate to a Claude or DeepSeek chat page.');
      return;
    }

    console.log(`AI Chat Exporter: Detected site type: ${siteType}`);

    // 2. Extract messages
    const messages = extractMessages(siteType);

    // 3. Validate extraction
    if (messages.length === 0) {
      const debugInfo = DEBUG_MODE ? '\n\nCheck the browser console (F12) for debug information.' : '';
      alert(`No messages found on this page.${debugInfo}\n\nPlease ensure:\n1. The page has fully loaded\n2. You are on a shared chat page\n3. Messages are visible on screen`);

      if (DEBUG_MODE) {
        console.log('AI Chat Exporter: Debug - Page HTML structure:');
        console.log('AI Chat Exporter: Site type:', siteType);
        console.log('AI Chat Exporter: Body classes:', document.body.className);

        if (siteType === 'deepseek') {
          console.log('AI Chat Exporter: .ds-message elements:',
            document.querySelectorAll('.ds-message').length);
        } else if (siteType === 'claude') {
          console.log('AI Chat Exporter: [data-testid="user-message"] elements:',
            document.querySelectorAll('[data-testid="user-message"]').length);
          console.log('AI Chat Exporter: .standard-markdown elements:',
            document.querySelectorAll('.standard-markdown').length);
        }

        console.log('AI Chat Exporter: All divs with "message" in class:',
          document.querySelectorAll('[class*="message"]').length);
        console.log('AI Chat Exporter: All divs with "chat" in class:',
          document.querySelectorAll('[class*="chat"]').length);
      }
      return;
    }

    console.log(`AI Chat Exporter: Extracted ${messages.length} messages`);

    // 4. Generate CSV
    const csv = generateCSV(messages);
    console.log('AI Chat Exporter: CSV generation completed');

    // 5. Trigger download
    downloadCSV(csv);

    // Show success message
    alert(`Successfully exported ${messages.length} messages!`);

  } catch (error) {
    console.error('AI Chat Exporter: Export failed:', error);
    alert(`Failed to extract chat: ${error.message}\n\nPlease check the browser console (F12) for more details.`);
  }

})();
