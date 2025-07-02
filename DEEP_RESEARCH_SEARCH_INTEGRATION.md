# Deep Research Automatic Search Integration

## What Was Implemented

### 1. **Automatic Search Query Extraction**
- Created `lib/deep-research-utils.ts` with utilities to:
  - Extract research queries from natural language input
  - Detect research intent patterns
  - Format queries for search engines

### 2. **Enhanced Deep Research Mode**
- Updated `handleDeepResearch` to accept an optional search query
- When a query is provided, it automatically searches for it
- Shows the search query in the toast notification

### 3. **Automatic Research Detection**
- Added automatic detection of research requests in chat input
- Patterns detected include:
  - "research on [topic]"
  - "search for [topic]"
  - "what is [topic]?"
  - "tell me about [topic]"
  - "learn about [topic]"
  - And more...

### 4. **Seamless Browser Integration**
- When deep research is triggered with a query, the browser:
  - Switches to the Browser tab
  - Navigates directly to search results
  - Shows what's being searched in the notification

## How to Use

### Method 1: Click the Deep Research Button
1. Type your search query in the chat input
2. Click the 🔍 button
3. The browser will search for your query automatically

### Method 2: Natural Language (Automatic)
Just type naturally in the chat:
- "research quantum computing"
- "search for machine learning algorithms"
- "what is blockchain technology?"
- "tell me about climate change"

The system will:
1. Detect the research intent
2. Extract the search query
3. Open the browser tab
4. Perform the search automatically

### Method 3: Manual Deep Research Mode
1. Click the 🔍 button without typing anything
2. Browser opens to DuckDuckGo homepage
3. Search manually as needed

## Examples

| User Input | Extracted Query | Search URL |
|------------|----------------|------------|
| "research on AI ethics" | "AI ethics" | `https://duckduckgo.com/?q=AI+ethics` |
| "search for best programming languages 2024" | "best programming languages 2024" | `https://duckduckgo.com/?q=best+programming+languages+2024` |
| "what is quantum entanglement?" | "quantum entanglement" | `https://duckduckgo.com/?q=quantum+entanglement` |
| "tell me about the solar system" | "the solar system" | `https://duckduckgo.com/?q=the+solar+system` |

## Benefits

1. **Faster Research**: No need to manually navigate and search
2. **Natural Interaction**: Use natural language to trigger research
3. **Context Preservation**: The AI knows what you're researching
4. **Seamless Workflow**: Browser and chat work together

## Technical Details

### Research Pattern Detection
The system uses regular expressions to detect various research patterns:
```typescript
/^(?:deep\s+)?research\s+(?:on\s+|about\s+|for\s+)?(.+)$/i
/^(?:please\s+)?(?:search|look\s+up|find|investigate|explore)\s+(?:for\s+|about\s+)?(.+)$/i
/^what\s+(?:is|are)\s+(.+)\?$/i
/^tell\s+me\s+about\s+(.+)$/i
```

### Query Processing
- Removes trailing punctuation
- Encodes special characters for URLs
- Preserves the natural query structure
- Filters common filler words for better results

### Integration Points
1. **Chat Interface**: Detects research intent on submission
2. **Deep Research Button**: Accepts current input as query
3. **Embedded Browser**: Receives search URL via localStorage
4. **Deep Research Panel**: Shows the active search query

## Content Extraction Feature

### New: Send Page to AI for Analysis
A new button has been added to the embedded browser toolbar that allows you to send the current page to the AI for analysis.

#### How It Works
1. Navigate to any webpage in the embedded browser
2. Click the **Send** button (→ icon) in the toolbar
3. The AI will receive information about the page and provide analysis

#### What the AI Analyzes
Due to iframe security restrictions, the AI receives:
- The page URL
- The page title
- General knowledge about the topic

The AI then provides:
- General information about the topic
- Key concepts and important points
- Relevant insights and analysis

#### Best Practices
- For full content analysis, open the page in a new tab
- Use this feature to quickly get AI insights about your research
- Combine with deep research mode for comprehensive analysis

## Future Enhancements

1. **Multi-Engine Support**: Search across multiple search engines
2. **Query Refinement**: AI suggests better search terms
3. **Enhanced Content Extraction**: Extract actual page content when possible
4. **Search History**: Track and revisit previous searches
5. **Smart Navigation**: AI navigates to the most relevant results
6. **Research Notes**: Save and organize research findings
7. **Multi-Tab Support**: Research multiple topics simultaneously