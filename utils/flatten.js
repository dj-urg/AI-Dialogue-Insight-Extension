/**
 * Flatten Utility Module
 * 
 * Flattens nested objects into flat key-value pairs suitable for CSV export.
 * Handles nested objects, arrays, and special cases like metadata.
 * 
 * Example:
 *   { a: 1, b: { c: 2, d: 3 } } 
 *   => { a: 1, 'b.c': 2, 'b.d': 3 }
 */

/**
 * Recursively flattens a nested object into a flat object with dot-notation keys
 * 
 * @param {Object} obj - The object to flatten
 * @param {string} prefix - Prefix for keys (used in recursion)
 * @param {Object} result - Accumulator object (used in recursion)
 * @param {number} maxDepth - Maximum depth to flatten (prevents infinite recursion)
 * @param {number} currentDepth - Current depth (used in recursion)
 * @returns {Object} Flattened object with dot-notation keys
 */
function flattenObject(obj, prefix = '', result = {}, maxDepth = 10, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    // If we've hit max depth, just stringify the value
    result[prefix || 'value'] = JSON.stringify(obj);
    return result;
  }

  if (obj === null || obj === undefined) {
    if (prefix) {
      result[prefix] = '';
    }
    return result;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    result[prefix || 'value'] = obj;
    return result;
  }

  // Handle arrays - convert to comma-separated string or flatten with indices
  if (Array.isArray(obj)) {
    // For arrays, we have two options:
    // 1. Join as comma-separated string (for simple arrays)
    // 2. Flatten with indices (for complex arrays)
    
    // Check if array contains only primitives
    const isSimpleArray = obj.every(item => 
      typeof item !== 'object' || item === null
    );
    
    if (isSimpleArray) {
      result[prefix || 'array'] = obj.join(',');
    } else {
      // Flatten complex arrays with indices
      obj.forEach((item, index) => {
        const newPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
        flattenObject(item, newPrefix, result, maxDepth, currentDepth + 1);
      });
    }
    return result;
  }

  // Handle objects - recursively flatten
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      flattenObject(obj[key], newPrefix, result, maxDepth, currentDepth + 1);
    }
  }

  return result;
}

/**
 * Flattens a message node from ChatGPT conversation JSON
 * Extracts all scalar fields and flattens nested structures like metadata
 * 
 * @param {Object} node - The message node from mapping
 * @param {string} conversationId - The conversation ID
 * @returns {Object} Flattened message object suitable for CSV
 */
function flattenMessageNode(node, conversationId) {
  const flat = {
    conversation_id: conversationId,
    node_id: node.id || '',
    parent_id: node.parent || '',
  };

  if (node.message) {
    const msg = node.message;
    
    // Basic message fields
    flat.role = msg.author?.role || '';
    flat.content_type = msg.content?.content_type || '';
    flat.create_time = msg.create_time || '';
    flat.update_time = msg.update_time || '';
    flat.status = msg.status || '';
    flat.end_turn = msg.end_turn || false;
    
    // Extract text content (flattened)
    if (msg.content) {
      flat.content_text = extractTextFromContent(msg.content);
    }
    
    // Flatten metadata
    if (msg.metadata) {
      const metadataFlat = flattenObject(msg.metadata, 'metadata', {}, 5, 0);
      Object.assign(flat, metadataFlat);
    }
    
    // Flatten author info
    if (msg.author) {
      flat.author_role = msg.author.role || '';
      flat.author_name = msg.author.name || '';
      if (msg.author.metadata) {
        const authorMetaFlat = flattenObject(msg.author.metadata, 'author.metadata', {}, 3, 0);
        Object.assign(flat, authorMetaFlat);
      }
    }
    
    // Additional fields that might be useful
    if (msg.recipient) {
      flat.recipient = msg.recipient || '';
    }
    
    // Flatten content object (but keep text separate)
    if (msg.content && typeof msg.content === 'object') {
      const contentFlat = flattenObject(msg.content, 'content', {}, 3, 0);
      // Remove content_text from content.* if we already have it
      delete contentFlat.content_text;
      Object.assign(flat, contentFlat);
    }
  }

  // Flatten any other node-level properties
  for (const key in node) {
    if (key !== 'message' && key !== 'id' && key !== 'parent' && !flat.hasOwnProperty(key)) {
      const value = node[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedFlat = flattenObject(value, key, {}, 3, 0);
        Object.assign(flat, nestedFlat);
      } else {
        flat[key] = value;
      }
    }
  }

  return flat;
}

/**
 * Extracts text content from a message content object
 * Handles different content types: text, multimodal_text, thoughts, execution_output, etc.
 * 
 * @param {Object} content - The content object
 * @returns {string} Extracted text content
 */
function extractTextFromContent(content) {
  if (!content) return '';
  
  const contentType = content.content_type;
  
  // Simple text content
  if (contentType === 'text' && Array.isArray(content.parts)) {
    return content.parts.join('\n');
  }
  
  // Multimodal text - extract only text parts
  if (contentType === 'multimodal_text' && Array.isArray(content.parts)) {
    const textParts = content.parts
      .filter(part => typeof part === 'string' || (part && part.content_type === 'text'))
      .map(part => typeof part === 'string' ? part : (part.text || ''));
    return textParts.join('\n');
  }
  
  // Thoughts content (reasoning/chain-of-thought)
  if (contentType === 'thoughts' && Array.isArray(content.thoughts)) {
    return content.thoughts
      .map(thought => thought.content || '')
      .join('\n\n');
  }
  
  // Execution output (tool results, code execution)
  if (contentType === 'execution_output') {
    return content.text || '';
  }
  
  // User editable context (system prompts, user profiles)
  if (contentType === 'user_editable_context') {
    const parts = [];
    if (content.user_profile) parts.push(content.user_profile);
    if (content.user_instructions) parts.push(content.user_instructions);
    return parts.join('\n\n');
  }
  
  // Model editable context (model-set context)
  if (contentType === 'model_editable_context') {
    return content.model_set_context || '';
  }
  
  // Code content (inline code execution, calculator, etc.)
  if (contentType === 'code') {
    // Extract the actual code/text content, not the wrapper
    return content.text || '';
  }
  
  // Reasoning recap (summary of reasoning steps)
  if (contentType === 'reasoning_recap') {
    if (Array.isArray(content.parts)) {
      return content.parts.join('\n');
    }
    return content.recap || content.text || '';
  }
  
  // Fallback: try to find any text field
  if (content.text) {
    return content.text;
  }
  
  // Last resort: if parts array exists, try to extract strings
  if (Array.isArray(content.parts)) {
    return content.parts
      .filter(part => typeof part === 'string')
      .join('\n');
  }
  
  return '';
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    flattenObject,
    flattenMessageNode,
    extractTextFromContent
  };
}


