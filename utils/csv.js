/**
 * CSV Generation Utility Module
 * 
 * Provides functions for generating CSV content from flattened data structures.
 * Handles proper escaping according to RFC 4180.
 */

/**
 * Escapes a field value for CSV format according to RFC 4180
 * 
 * Rules:
 * - Fields containing comma, quote, or newline must be wrapped in quotes
 * - Quotes within fields must be escaped by doubling them
 * - Empty/null values become empty strings
 * 
 * @param {*} value - The value to escape
 * @returns {string} Escaped CSV field value
 */
function escapeCSVField(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  const stringValue = String(value);

  // Check if field needs escaping (contains comma, quote, or newline)
  if (stringValue.includes(',') || stringValue.includes('"') || 
      stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape quotes by doubling them, then wrap in quotes
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
}

/**
 * Generates CSV content from an array of objects
 * 
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {Array<string>} headers - Optional array of header names. If not provided, uses all keys from first object.
 * @returns {string} CSV formatted string
 */
function generateCSV(data, headers = null) {
  if (!data || data.length === 0) {
    return '';
  }

  // If headers not provided, extract from first object
  if (!headers) {
    headers = Object.keys(data[0]);
  }

  // Generate header row
  const headerRow = headers.map(escapeCSVField).join(',');

  // Generate data rows
  const rows = [headerRow];
  for (const row of data) {
    const values = headers.map(header => escapeCSVField(row[header]));
    rows.push(values.join(','));
  }

  return rows.join('\n');
}

/**
 * Generates a CSV file with UTF-8 BOM for Excel compatibility
 * 
 * @param {string} csvContent - The CSV content
 * @returns {Blob} Blob object ready for download
 */
function createCSVBlob(csvContent) {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generates a filename with timestamp
 * 
 * @param {string} prefix - Filename prefix (e.g., 'conversation_messages', 'chatgpt_conversation')
 * @param {string} suffix - Optional suffix to add before timestamp (e.g., conversation ID)
 * @returns {string} Generated filename
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
 * Triggers a download of CSV content in the browser
 * Creates a Blob, generates a download link, and programmatically clicks it
 * 
 * @param {string} csvContent - The CSV content to download
 * @param {string} filename - Filename for the download
 */
function downloadCSV(csvContent, filename) {
  try {
    // Create Blob with UTF-8 BOM for Excel compatibility
    const blob = createCSVBlob(csvContent);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('CSV download triggered successfully');
  } catch (error) {
    console.error('CSV download failed:', error);
    throw new Error('Failed to download CSV file');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeCSVField,
    generateCSV,
    createCSVBlob,
    generateFilename,
    downloadCSV
  };
}


