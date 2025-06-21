/**
 * Utility functions for cleaning and formatting search result content
 * Removes technical markers, JSON metadata, and other internal formatting
 */

/**
 * Comprehensive function to clean search result content of all technical markers
 */
export function cleanSearchContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return ''
  }

  return content
    // API key protocol messages
    .replace(/REQUEST_API_KEY:\{[^}]+\}/g, '')
    .replace(/API_KEY_PROVIDED:\{[^}]+\}/g, '')
    
    // Video and image generation markers
    .replace(/\[VIDEO_GENERATION_STARTED\][\s\S]*?\[\/VIDEO_GENERATION_STARTED\]/g, '')
    .replace(/\[IMAGE_GENERATION_COMPLETED\][\s\S]*?\[\/IMAGE_GENERATION_COMPLETED\]/g, '')
    .replace(/\[IMAGE_EDITING_COMPLETED\][\s\S]*?\[\/IMAGE_EDITING_COMPLETED\]/g, '')
    .replace(/\[IMAGE_OPTIONS\][\s\S]*?\[\/IMAGE_OPTIONS\]/g, '')
    .replace(/\[VIDEO_OPTIONS\][\s\S]*?\[\/VIDEO_OPTIONS\]/g, '')
    .replace(/\[TTS_GENERATION_STARTED\][\s\S]*?\[\/TTS_GENERATION_STARTED\]/g, '')
    .replace(/\[TTS_GENERATION_COMPLETED\][\s\S]*?\[\/TTS_GENERATION_COMPLETED\]/g, '')
    
    // Web search markers - comprehensive removal
    .replace(/\[WEB_SEARCH_STARTED\][\s\S]*?\[\/WEB_SEARCH_STARTED\]/g, '')
    .replace(/\[WEB_SEARCH_COMPLETED\][\s\S]*?\[\/WEB_SEARCH_COMPLETED\]/g, '')
    .replace(/\[SEARCH_METADATA\][\s\S]*?\[\/SEARCH_METADATA\]/g, '')
    .replace(/\[SEARCHING_WEB\]/g, '')
    .replace(/\[WEB_SEARCH_ERROR\][\s\S]*?\[\/WEB_SEARCH_ERROR\]/g, '')
    
    // Research markers
    .replace(/\[DEEP_RESEARCH_STARTED\]/g, '')
    .replace(/\[DEEP_RESEARCH_METADATA\][\s\S]*?\[\/DEEP_RESEARCH_METADATA\]/g, '')
    
    // Remove any remaining JSON-like metadata blocks that might leak through
    .replace(/\{[\s\S]*?"hasSearch"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"searchResults"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"citations"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"needsSearch"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"images"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"followUpQuestions"[\s\S]*?\}/g, '')
    .replace(/\{[\s\S]*?"relatedQuestions"[\s\S]*?\}/g, '')
    
    // Remove standalone JSON objects that might appear
    .replace(/^\s*\{[\s\S]*?\}\s*$/gm, '')
    
    // Clean up extra whitespace and newlines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/^\s+|\s+$/g, '') // trim
    .replace(/\s+$/, '') // remove trailing whitespace
}

/**
 * Extract and clean the main content from search results, removing sources section
 */
export function extractMainContent(content: string): string {
  const cleaned = cleanSearchContent(content)
  
  // Remove the sources section if it exists (we'll render it separately)
  return cleaned
    .replace(/\n\n\*\*Sources:\*\*[\s\S]*$/, '')
    .replace(/\n\n## Sources[\s\S]*$/, '')
    .replace(/\n\n### Sources[\s\S]*$/, '')
    .trim()
}

/**
 * Check if content contains any technical markers that should be hidden
 */
export function containsTechnicalMarkers(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false
  }

  const markers = [
    /\[WEB_SEARCH_STARTED\]/,
    /\[WEB_SEARCH_COMPLETED\]/,
    /\[SEARCH_METADATA\]/,
    /\[SEARCHING_WEB\]/,
    /\{[\s\S]*?"hasSearch"[\s\S]*?\}/,
    /\{[\s\S]*?"searchResults"[\s\S]*?\}/,
    /REQUEST_API_KEY:/,
    /API_KEY_PROVIDED:/
  ]

  return markers.some(marker => marker.test(content))
}

/**
 * Format search result descriptions for better readability
 */
export function formatSearchDescription(description: string): string {
  if (!description) return ''
  
  return description
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/\.{2,}/g, '...') // normalize ellipsis
    .trim()
}

/**
 * Extract domain name from URL for display
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

/**
 * Format date for display in search results
 */
export function formatSearchDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}
