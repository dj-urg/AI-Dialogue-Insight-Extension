// Supported domains configuration
const SUPPORTED_DOMAINS = {
  claude: ['claude.ai'],
  deepseek: ['chat.deepseek.com', 'deepseek.com']
};

/**
 * Determines the site type based on URL hostname
 * Uses exact match or endsWith to prevent false positives
 * @param {string} url - The URL to check
 * @returns {string|null} - 'claude', 'deepseek', or null if unsupported
 */
function getSiteType(url) {
  try {
    const hostname = new URL(url).hostname;
    
    for (const [site, domains] of Object.entries(SUPPORTED_DOMAINS)) {
      // Use exact match or endsWith to avoid false positives like "evilclaude.ai.example.com"
      if (domains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
        return site;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Updates the status message and button state based on current tab
 * @param {object} tab - The active tab object
 */
function updateStatus(tab) {
  const statusDiv = document.getElementById('status');
  const exportBtn = document.getElementById('exportBtn');
  
  if (!tab || !tab.url) {
    statusDiv.textContent = 'No active tab found.';
    statusDiv.className = 'error';
    exportBtn.disabled = true;
    return;
  }
  
  const siteType = getSiteType(tab.url);
  
  if (siteType) {
    const siteName = siteType.charAt(0).toUpperCase() + siteType.slice(1);
    statusDiv.textContent = `${siteName} chat detected. Ready to export.`;
    statusDiv.className = 'supported';
    exportBtn.disabled = false;
  } else {
    statusDiv.textContent = 'This page is not supported. Please navigate to a Claude or DeepSeek chat.';
    statusDiv.className = 'unsupported';
    exportBtn.disabled = true;
  }
}

/**
 * Handles the export button click event
 * Validates the current tab and injects the content script
 */
function handleExportClick() {
  const statusDiv = document.getElementById('status');
  const exportBtn = document.getElementById('exportBtn');
  
  // Query the active tab
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      if (tabs.length === 0) {
        statusDiv.textContent = 'No active tab found.';
        statusDiv.className = 'error';
        return;
      }
      
      const tab = tabs[0];
      const siteType = getSiteType(tab.url);
      
      // Validate current tab URL before injection
      if (!siteType) {
        statusDiv.textContent = 'This page is not supported. Please navigate to a Claude or DeepSeek chat.';
        statusDiv.className = 'unsupported';
        return;
      }
      
      // Disable button during injection
      exportBtn.disabled = true;
      statusDiv.textContent = 'Exporting chat...';
      statusDiv.className = 'supported';
      
      // Inject content script
      browser.tabs.executeScript(tab.id, { file: 'content.js' })
        .then(() => {
          // Success - content script will handle the rest
          statusDiv.textContent = 'Export initiated. Check your downloads.';
          statusDiv.className = 'supported';
          
          // Re-enable button after a short delay
          setTimeout(() => {
            exportBtn.disabled = false;
            statusDiv.textContent = `${siteType.charAt(0).toUpperCase() + siteType.slice(1)} chat detected. Ready to export.`;
          }, 2000);
        })
        .catch(error => {
          console.error('Injection failed:', error);
          statusDiv.textContent = 'Failed to inject export script into this page.';
          statusDiv.className = 'error';
          exportBtn.disabled = false;
        });
    })
    .catch(error => {
      console.error('Error querying tabs:', error);
      statusDiv.textContent = 'Error accessing tab information.';
      statusDiv.className = 'error';
    });
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Query the active tab
  browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
      if (tabs.length > 0) {
        updateStatus(tabs[0]);
      } else {
        updateStatus(null);
      }
    })
    .catch(error => {
      console.error('Error querying tabs:', error);
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = 'Error accessing tab information.';
      statusDiv.className = 'error';
      document.getElementById('exportBtn').disabled = true;
    });
  
  // Add click handler for export button
  document.getElementById('exportBtn').addEventListener('click', handleExportClick);
});
