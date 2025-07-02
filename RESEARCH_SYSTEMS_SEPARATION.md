# Research Systems Separation Guide

## Overview

This document explains how the two web research systems are properly separated in the chat interface to avoid conflicts and ensure each system operates independently based on the deep research mode toggle.

## Two Research Systems

### 1. Perplexity Sonar Pro API 🌐
- **Purpose**: Regular web search and fact-checking
- **When Active**: Deep Research Mode is OFF (default state)
- **API**: Perplexity Sonar Pro API
- **Strengths**: Fast, accurate, real-time web search with citations
- **Use Cases**: Current events, quick facts, general web search

### 2. Browser Use Agent 🤖
- **Purpose**: Complex autonomous research tasks
- **When Active**: Deep Research Mode is ON (user-activated)
- **Service**: Browser Use Agent on port 8001
- **Strengths**: AI-powered browsing, complex data extraction, multi-step research
- **Use Cases**: In-depth research, price comparisons, complex analysis

## How the Separation Works

### Frontend Logic (chat-interface.tsx)

```typescript
// Deep research mode toggle determines which system to use
if (isDeepResearchMode && trimmedInput) {
  // Route to Browser Use Agent
  const deepResearchInput = `deep research on ${trimmedInput}`
  // Send to chat API with special prefix
  // Also send to browser agent for real-time feedback
} else {
  // Normal flow - will use Perplexity if search intent detected
}
```

### Backend Logic (app/api/chat/route.ts)

```typescript
// Check for deep research mode first
const isDeepResearchMode = messageContent.startsWith('deep research on ');

if (isDeepResearchMode) {
  // Route to Browser Use Agent
  return browserUseResponse();
}

// Only check for Perplexity search if NOT in deep research mode
if (model !== "Claude Sonnet 4" && !isDeepResearchMode) {
  // Use Perplexity Sonar Pro API
  const searchIntent = detector.detectSearchIntent(messageContent);
  // ... perform Perplexity search
}
```

## User Experience Flow

### Default Mode (Perplexity Active)
1. User types: "What's the latest AI news?"
2. System detects search intent
3. Routes to Perplexity Sonar Pro API
4. Returns web search results with citations

### Deep Research Mode (Browser Use Active)
1. User clicks "Deep Research" toggle button
2. User types: "Research AI companies and their valuations"
3. Frontend adds "deep research on" prefix
4. Backend routes to Browser Use Agent
5. AI agent autonomously browses and researches
6. Returns comprehensive research results

## Key Implementation Details

### 1. Toggle State Management
- `isDeepResearchMode` state controls which system is active
- Toggle button provides clear visual feedback
- State persists during the chat session

### 2. Message Routing
- Deep research messages get "deep research on" prefix
- Backend checks for this prefix to route appropriately
- Prevents conflicts between the two systems

### 3. Error Handling
- If Browser Use Agent fails, graceful fallback
- Clear error messages for each system
- Independent health checks for both services

### 4. Backward Compatibility
- Existing Perplexity functionality unchanged
- No breaking changes to current workflows
- Both systems can coexist safely

## Configuration

### Environment Variables Required

```bash
# For Perplexity Sonar Pro API
PERPLEXITY_API_KEY=your_perplexity_key

# For Browser Use Agent
OPENAI_API_KEY=your_openai_key  # or
ANTHROPIC_API_KEY=your_anthropic_key  # or
GEMINI_API_KEY=your_gemini_key
```

### Service Dependencies

1. **Perplexity System**: No additional services needed
2. **Browser Use System**: Requires Browser Use Agent service on port 8001

## Testing the Separation

### Manual Testing
1. Open the chat interface
2. Test with deep research mode OFF:
   - Ask: "What's the weather today?"
   - Should use Perplexity API
3. Toggle deep research mode ON:
   - Ask: "Research the top AI companies"
   - Should use Browser Use Agent

### Automated Testing
Use the test file: `test-research-separation.html`
- Open in browser
- Test both modes
- Verify proper routing

## Troubleshooting

### Perplexity Not Working
- Check `PERPLEXITY_API_KEY` in `.env.local`
- Verify API key is valid
- Check network connectivity

### Browser Use Agent Not Working
- Ensure service is running on port 8001
- Check AI API keys (OpenAI/Anthropic/Gemini)
- Verify browser dependencies installed

### Conflicts Between Systems
- Check that deep research mode toggle is working
- Verify message prefixes are being added correctly
- Check backend routing logic

## Benefits of This Separation

1. **Clear Responsibility**: Each system handles what it does best
2. **User Control**: Users choose which system to use
3. **No Conflicts**: Systems operate independently
4. **Backward Compatibility**: Existing functionality preserved
5. **Scalability**: Easy to add more research systems

## Future Enhancements

1. **Auto-Detection**: Automatically choose system based on query complexity
2. **Hybrid Mode**: Use both systems for comprehensive research
3. **Custom Workflows**: User-defined research pipelines
4. **Performance Metrics**: Compare effectiveness of each system

## Summary

The research systems separation ensures:
- ✅ Perplexity handles regular web search (default)
- ✅ Browser Use Agent handles complex research (when activated)
- ✅ No conflicts between systems
- ✅ Clear user control via toggle
- ✅ Backward compatibility maintained
- ✅ Independent error handling
- ✅ Proper service health monitoring

Both systems now work independently and efficiently based on user preference and research complexity needs.
