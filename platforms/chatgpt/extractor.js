/**
 * AI Chat Exporter - ChatGPT Extractor Module
 * 
 * This module extracts ChatGPT conversation data from the JSON API response
 * and generates two CSV files:
 * - CSV A: Conversation metadata (one row per conversation)
 * - CSV B: Conversation messages (one row per message/node)
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely get nested property from object
 */
function safeGet(obj, path, defaultValue = '') {
    try {
        return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * Extract text content from message content object
 */
function extractTextFromContent(content) {
    if (!content) return '';

    const contentType = content.content_type;

    // Handle text content
    if (contentType === 'text' && Array.isArray(content.parts)) {
        return content.parts.join('\n');
    }

    // Handle multimodal_text content
    if (contentType === 'multimodal_text' && Array.isArray(content.parts)) {
        const textParts = content.parts
            .filter(part => typeof part === 'string' || part.content_type === 'text')
            .map(part => typeof part === 'string' ? part : part.text || '');
        return textParts.join('\n');
    }

    // Handle thoughts content
    if (contentType === 'thoughts' && Array.isArray(content.thoughts)) {
        return content.thoughts
            .map(thought => thought.content || '')
            .join('\n\n');
    }

    // Handle user_editable_context (should not appear in CSV B)
    if (contentType === 'user_editable_context') {
        return '';
    }

    // Handle model_editable_context (should not appear in CSV B)
    if (contentType === 'model_editable_context') {
        return '';
    }

    // Handle execution_output (tool results)
    if (contentType === 'execution_output') {
        return content.text || '';
    }

    return '';
}

/**
 * Check if message content contains images
 */
function hasImages(content) {
    if (!content || content.content_type !== 'multimodal_text') return false;
    if (!Array.isArray(content.parts)) return false;

    return content.parts.some(part =>
        part && typeof part === 'object' && part.content_type === 'image_asset_pointer'
    );
}

/**
 * Extract image IDs from multimodal content
 */
function extractImageIds(content) {
    if (!content || content.content_type !== 'multimodal_text') return '';
    if (!Array.isArray(content.parts)) return '';

    const imageIds = content.parts
        .filter(part => part && typeof part === 'object' && part.content_type === 'image_asset_pointer')
        .map(part => part.asset_pointer || '')
        .filter(id => id);

    return imageIds.join(',');
}

/**
 * Extract user profile from conversation (clean text only)
 */
function extractUserProfile(mapping) {
    for (const nodeId in mapping) {
        const node = mapping[nodeId];
        if (node.message?.content?.content_type === 'user_editable_context') {
            const metadata = node.message.metadata?.user_context_message_data;
            if (metadata && metadata.about_user_message) {
                // Use the clean version from metadata
                return metadata.about_user_message.trim();
            }
            // Fallback: extract from content
            const content = node.message.content;
            const profile = content.user_profile || '';
            const match = profile.match(/User profile:\s*```(.+?)```/s);
            return match ? match[1].trim() : '';
        }
    }
    return '';
}

/**
 * Extract user instructions from conversation (clean text only)
 */
function extractUserInstructions(mapping) {
    for (const nodeId in mapping) {
        const node = mapping[nodeId];
        if (node.message?.content?.content_type === 'user_editable_context') {
            const metadata = node.message.metadata?.user_context_message_data;
            if (metadata && metadata.about_model_message) {
                // Use the clean version from metadata
                return metadata.about_model_message.trim();
            }
            // Fallback: extract from content
            const content = node.message.content;
            const instructions = content.user_instructions || '';
            const match = instructions.match(/```(.+?)```/s);
            return match ? match[1].trim() : '';
        }
    }
    return '';
}

/**
 * Count messages by role
 */
function countMessagesByRole(mapping, role) {
    let count = 0;
    for (const nodeId in mapping) {
        const node = mapping[nodeId];
        if (node.message && node.message.author?.role === role) {
            count++;
        }
    }
    return count;
}

/**
 * Count all messages (excluding system nodes without content)
 */
function countAllMessages(mapping) {
    let count = 0;
    for (const nodeId in mapping) {
        const node = mapping[nodeId];
        if (node.message && node.message.content) {
            const contentType = node.message.content.content_type;
            // Exclude user_editable_context and model_editable_context from count
            if (contentType !== 'user_editable_context' && contentType !== 'model_editable_context') {
                count++;
            }
        }
    }
    return count;
}

/**
 * Get default model slug from conversation
 */
function getDefaultModelSlug(conversationData) {
    // Try to find it in the mapping metadata
    const mapping = conversationData.mapping || {};
    for (const nodeId in mapping) {
        const node = mapping[nodeId];
        const modelSlug = node.message?.metadata?.default_model_slug;
        if (modelSlug) return modelSlug;
    }
    return '';
}

// ============================================================================
// CSV A: CONVERSATION METADATA EXTRACTION
// ============================================================================

/**
 * Extract conversation metadata for CSV A
 * Returns a single object representing one conversation
 */
function extractConversationMetadata(conversationData) {
    const mapping = conversationData.mapping || {};

    return {
        conversation_id: conversationData.conversation_id || conversationData.id || '',
        title: conversationData.title || '',
        create_time: conversationData.create_time || '',
        update_time: conversationData.update_time || '',
        default_model_slug: conversationData.default_model_slug || getDefaultModelSlug(conversationData),
        memory_scope: conversationData.memory_scope || '',
        is_do_not_remember: conversationData.is_do_not_remember || false,
        num_messages: countAllMessages(mapping),
        num_user_messages: countMessagesByRole(mapping, 'user'),
        num_assistant_messages: countMessagesByRole(mapping, 'assistant'),
        num_tool_messages: countMessagesByRole(mapping, 'tool'),
        user_profile: extractUserProfile(mapping),
        user_instructions: extractUserInstructions(mapping)
    };
}

// ============================================================================
// CSV B: CONVERSATION MESSAGES EXTRACTION
// ============================================================================

/**
 * Extract all messages from conversation for CSV B
 * Returns an array of message objects
 */
function extractConversationMessages(conversationData) {
    const messages = [];
    const mapping = conversationData.mapping || {};
    const conversationId = conversationData.conversation_id || conversationData.id || '';

    for (const nodeId in mapping) {
        const node = mapping[nodeId];

        // Skip nodes without messages
        if (!node.message) continue;

        const message = node.message;
        const content = message.content;
        const contentType = content?.content_type || '';

        // Skip user_editable_context and model_editable_context (only in CSV A)
        if (contentType === 'user_editable_context' || contentType === 'model_editable_context') {
            continue;
        }

        const authorRole = message.author?.role || '';
        const text = extractTextFromContent(content);
        const hasImage = hasImages(content);
        const imageIds = extractImageIds(content);
        const isVisuallyHidden = message.metadata?.is_visually_hidden_from_conversation || false;
        const modelSlug = message.metadata?.model_slug || '';
        const toolName = authorRole === 'tool' ? (message.author?.name || '') : '';

        messages.push({
            conversation_id: conversationId,
            node_id: message.id || nodeId,
            parent_id: node.parent || '',
            author_role: authorRole,
            content_type: contentType,
            text: text,
            has_image: hasImage,
            image_ids: imageIds,
            create_time: message.create_time || '',
            status: message.status || '',
            end_turn: message.end_turn || false,
            is_visually_hidden: isVisuallyHidden,
            model_slug: modelSlug,
            tool_name: toolName
        });
    }

    return messages;
}

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Escape CSV field (handle quotes, commas, newlines)
 */
function escapeCSVField(value) {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
}

/**
 * Generate CSV A: Conversation Metadata
 */
function generateMetadataCSV(metadata) {
    const headers = [
        'conversation_id',
        'title',
        'create_time',
        'update_time',
        'default_model_slug',
        'memory_scope',
        'is_do_not_remember',
        'num_messages',
        'num_user_messages',
        'num_assistant_messages',
        'num_tool_messages',
        'user_profile',
        'user_instructions'
    ];

    const row = headers.map(header => escapeCSVField(metadata[header]));

    return [headers.join(','), row.join(',')].join('\n');
}

/**
 * Generate CSV B: Conversation Messages
 */
function generateMessagesCSV(messages) {
    // Simplified headers - focus on essential message data
    const headers = [
        'conversation_id',
        'message_id',
        'author_role',
        'content_type',
        'text',
        'create_time',
        'model_slug'
    ];

    const rows = [headers.join(',')];

    messages.forEach(msg => {
        // Map to simplified structure
        const simplifiedMsg = {
            conversation_id: msg.conversation_id,
            message_id: msg.node_id,
            author_role: msg.author_role,
            content_type: msg.content_type,
            text: msg.text,
            create_time: msg.create_time,
            model_slug: msg.model_slug
        };

        const row = headers.map(header => escapeCSVField(simplifiedMsg[header]));
        rows.push(row.join(','));
    });

    return rows.join('\n');
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Main function to process ChatGPT conversation JSON and generate CSVs
 * @param {Object} conversationData - The full ChatGPT conversation JSON object
 * @returns {Object} Object containing metadata CSV and messages CSV
 */
function extractChatGPTConversation(conversationData) {
    if (!conversationData || !conversationData.mapping) {
        throw new Error('Invalid ChatGPT conversation data: missing mapping');
    }

    const metadata = extractConversationMetadata(conversationData);
    const messages = extractConversationMessages(conversationData);

    const metadataCSV = generateMetadataCSV(metadata);
    const messagesCSV = generateMessagesCSV(messages);

    return {
        metadataCSV,
        messagesCSV,
        metadata,
        messages
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Expose to window for background script usage
if (typeof window !== 'undefined') {
    window.extractChatGPTConversation = extractChatGPTConversation;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extractChatGPTConversation,
        extractConversationMetadata,
        extractConversationMessages,
        generateMetadataCSV,
        generateMessagesCSV
    };
}
