/**
 * Simple token counter for estimating token usage
 * Gemini models don't use the same tokenization as GPT models,
 * so we use character-based estimation
 */

export interface TokenCount {
  messages: number;
  systemPrompt: number;
  tools: number;
  total: number;
}

/**
 * Estimates token count based on character length
 * Rough approximation: 1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // More accurate estimation considering punctuation and whitespace
  return Math.ceil(text.length / 3.5);
}

/**
 * Counts tokens in a message array
 */
export function countMessageTokens(messages: any[]): number {
  if (!messages || !Array.isArray(messages)) return 0;
  
  let totalTokens = 0;
  
  for (const message of messages) {
    // Count role tokens
    totalTokens += 10; // Overhead for message structure
    
    // Count content tokens
    if (typeof message.content === 'string') {
      totalTokens += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      // Handle multimodal content
      for (const part of message.content) {
        if (part.type === 'text' && part.text) {
          totalTokens += estimateTokens(part.text);
        } else if (part.type === 'image' || part.type === 'file') {
          // Images and files consume significant tokens
          totalTokens += 1000; // Conservative estimate
        }
      }
    }
  }
  
  return totalTokens;
}

/**
 * Counts tokens in the complete request
 */
export function countRequestTokens(
  messages: any[],
  systemPrompt?: string,
  tools?: any[]
): TokenCount {
  const messageTokens = countMessageTokens(messages);
  const systemTokens = systemPrompt ? estimateTokens(systemPrompt) : 0;
  const toolTokens = tools ? estimateTokens(JSON.stringify(tools)) : 0;
  
  return {
    messages: messageTokens,
    systemPrompt: systemTokens,
    tools: toolTokens,
    total: messageTokens + systemTokens + toolTokens
  };
}

/**
 * Truncates messages to fit within token limit
 */
export function truncateMessages(
  messages: any[],
  maxTokens: number,
  systemTokens: number = 0,
  toolTokens: number = 0
): any[] {
  const availableTokens = maxTokens - systemTokens - toolTokens - 1000; // Safety buffer
  
  if (messages.length === 0) return messages;
  
  // Always keep the latest message
  const truncated = [...messages];
  let currentTokens = countMessageTokens(truncated);
  
  // Remove oldest messages until we're under the limit
  while (currentTokens > availableTokens && truncated.length > 1) {
    truncated.shift(); // Remove oldest message
    currentTokens = countMessageTokens(truncated);
  }
  
  // If still over limit, truncate the oldest remaining message
  if (currentTokens > availableTokens && truncated.length > 0) {
    const firstMessage = truncated[0];
    if (typeof firstMessage.content === 'string') {
      const maxLength = Math.floor((availableTokens / currentTokens) * firstMessage.content.length);
      firstMessage.content = firstMessage.content.substring(0, maxLength) + '... [truncated]';
    }
  }
  
  return truncated;
}

/**
 * Gemini model token limits
 */
export const GEMINI_TOKEN_LIMITS = {
  'gemini-2.0-flash': 200000,
  'gemini-2.5-flash-preview-05-20': 200000,
  'gemini-2.5-pro-preview-06-05': 200000,
  'gemini-1.5-pro': 128000,
  'gemini-1.5-flash': 128000
};