// Client-safe browser task detection utility
// This file contains only browser-compatible code

export interface BrowserTaskInfo {
  shouldTrigger: boolean;
  taskType?: 'search' | 'research' | 'browse' | 'extract' | 'navigate';
  query?: string;
  url?: string;
}

export function shouldTriggerBrowserTask(message: string): BrowserTaskInfo {
  const browserTaskPatterns = [
    // Research patterns
    {
      pattern: /(?:research|investigate|find information about|look up|search for) (.+?) (?:on the web|online|on the internet)/i,
      taskType: 'research' as const,
      extractQuery: true
    },
    {
      pattern: /(?:browse|search|google|bing) (?:for )(.+)/i,
      taskType: 'search' as const,
      extractQuery: true
    },
    // Navigation patterns
    {
      pattern: /(?:go to|navigate to|open|visit) (https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(?:com|org|net|io|ai|dev)[^\s]*)/i,
      taskType: 'navigate' as const,
      extractUrl: true
    },
    // Extract patterns
    {
      pattern: /(?:extract|scrape|get|fetch) (?:information|data|content) from (https?:\/\/[^\s]+|www\.[^\s]+)/i,
      taskType: 'extract' as const,
      extractUrl: true
    },
    // General browser patterns
    {
      pattern: /(?:use the browser|open browser|start browser|browser session)/i,
      taskType: 'browse' as const
    },
    // Deep research with browser
    {
      pattern: /(?:deep research|comprehensive research|thorough research).*(?:browse|web|online|internet)/i,
      taskType: 'research' as const,
      extractQuery: true
    }
  ];

  for (const { pattern, taskType, extractQuery, extractUrl } of browserTaskPatterns) {
    const match = message.match(pattern);
    if (match) {
      const result: BrowserTaskInfo = {
        shouldTrigger: true,
        taskType
      };

      if (extractQuery && match[1]) {
        result.query = match[1].trim();
      }

      if (extractUrl && match[1]) {
        let url = match[1].trim();
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        result.url = url;
      }

      return result;
    }
  }

  return { shouldTrigger: false };
}

// Helper to generate search URL from query
export function generateSearchUrl(query: string, engine: 'google' | 'bing' | 'duckduckgo' = 'google'): string {
  const encodedQuery = encodeURIComponent(query);
  
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${encodedQuery}`;
    case 'bing':
      return `https://www.bing.com/search?q=${encodedQuery}`;
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${encodedQuery}`;
    default:
      return `https://www.google.com/search?q=${encodedQuery}`;
  }
}