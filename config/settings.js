/**
 * General Settings and Configuration
 * 
 * Central configuration for the extension including:
 * - Supported platforms and their domains
 * - Extension metadata
 * - Default settings
 */

const EXTENSION_CONFIG = {
  // Extension metadata
  name: 'AI Chat Exporter',
  version: '2.0.0',
  description: 'Export conversations from ChatGPT, Claude, DeepSeek, Gemini, and Co-pilot to CSV. All processing happens locally in your browser.',

  // Supported platforms
  platforms: {
    chatgpt: {
      name: 'ChatGPT',
      domains: ['chatgpt.com', 'chat.openai.com'],
      enabled: true,
      contentScript: 'platforms/chatgpt/content.js',
      injectScript: 'platforms/chatgpt/inject.js',
      backgroundHandler: 'chatgpt'
    },
    claude: {
      name: 'Claude',
      domains: ['claude.ai'],
      enabled: true,
      contentScript: 'platforms/claude/content.js',
      injectScript: 'platforms/claude/inject.js',
      backgroundHandler: 'ClaudeHandler'
    },
    deepseek: {
      name: 'DeepSeek',
      domains: ['chat.deepseek.com', 'deepseek.com'],
      enabled: true,
      contentScript: 'platforms/deepseek/content.js',
      backgroundHandler: 'deepseek'
    },
    gemini: {
      name: 'Gemini',
      domains: ['gemini.google.com', 'bard.google.com'],
      enabled: false, // Not implemented yet
      contentScript: 'platforms/gemini/content.js',
      backgroundHandler: 'gemini'
    },
    copilot: {
      name: 'Co-pilot',
      domains: ['copilot.microsoft.com', 'copilotstudio.microsoft.com'],
      enabled: true,
      contentScript: 'platforms/copilot/content.js',
      injectScript: 'platforms/copilot/inject.js',
      backgroundHandler: 'copilot'
    }
  },

  // CSV export settings
  csv: {
    includeBOM: true, // UTF-8 BOM for Excel compatibility
    dateFormat: 'YYYY-MM-DD_HH-MM-SS',
    filenamePrefix: 'conversation_export'
  },

  // Debug settings
  debug: {
    enabled: false, // Set to true for verbose logging
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

/**
 * Get platform configuration by domain
 * @param {string} url - The URL to check
 * @returns {Object|null} Platform config or null if not supported
 */
function getPlatformByUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    
    for (const [platformId, platform] of Object.entries(EXTENSION_CONFIG.platforms)) {
      if (!platform.enabled) continue;
      
      if (platform.domains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      )) {
        return { id: platformId, ...platform };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Get all enabled platforms
 * @returns {Array} Array of enabled platform configs
 */
function getEnabledPlatforms() {
  return Object.entries(EXTENSION_CONFIG.platforms)
    .filter(([id, platform]) => platform.enabled)
    .map(([id, platform]) => ({ id, ...platform }));
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EXTENSION_CONFIG,
    getPlatformByUrl,
    getEnabledPlatforms
  };
}


