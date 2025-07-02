/**
 * Utility functions for deep research mode
 */

// Patterns that indicate a research request
const RESEARCH_PATTERNS = [
  /^(?:deep\s+)?research\s+(?:on\s+|about\s+|for\s+)?(.+)$/i,
  /^(?:please\s+)?(?:search|look\s+up|find|investigate|explore)\s+(?:for\s+|about\s+)?(.+)$/i,
  /^(?:can\s+you\s+)?(?:research|search|find\s+information\s+about)\s+(.+)$/i,
  /^what\s+(?:is|are)\s+(.+)\?$/i,
  /^tell\s+me\s+about\s+(.+)$/i,
  /^(?:i\s+want\s+to\s+)?learn\s+(?:about|more\s+about)\s+(.+)$/i,
];

/**
 * Extract research query from user input
 */
export function extractResearchQuery(input: string): string | null {
  const trimmed = input.trim();
  
  // Check each pattern
  for (const pattern of RESEARCH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      // Clean up the query
      return match[1]
        .trim()
        .replace(/\?+$/, '') // Remove trailing question marks
        .replace(/\.+$/, '') // Remove trailing periods
        .trim();
    }
  }
  
  return null;
}

/**
 * Check if input is a research request
 */
export function isResearchRequest(input: string): boolean {
  return extractResearchQuery(input) !== null;
}

/**
 * Format search query for URL
 */
export function formatSearchQuery(query: string): string {
  // Remove common filler words for better search results
  const fillerWords = ['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for'];
  const words = query.toLowerCase().split(/\s+/);
  
  // Keep important words, but preserve the original query structure
  const cleanQuery = words
    .filter((word, index) => {
      // Keep the first word and any word that's not a filler
      return index === 0 || !fillerWords.includes(word) || word.length > 3;
    })
    .join(' ');
  
  return cleanQuery || query;
}

/**
 * Generate search URL for different search engines
 */
export function generateSearchUrl(query: string, engine: 'duckduckgo' | 'bing' | 'startpage' = 'duckduckgo'): string {
  const encodedQuery = encodeURIComponent(formatSearchQuery(query));
  
  switch (engine) {
    case 'bing':
      return `https://www.bing.com/search?q=${encodedQuery}`;
    case 'startpage':
      return `https://www.startpage.com/search?q=${encodedQuery}`;
    case 'duckduckgo':
    default:
      return `https://duckduckgo.com/?q=${encodedQuery}`;
  }
}