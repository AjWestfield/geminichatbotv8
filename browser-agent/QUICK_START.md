# Browser-use Deep Research Quick Start Guide

Follow these steps to get the browser-based deep research working in your app:

## 1. Install Python Dependencies

```bash
cd browser-agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

## 2. Set API Keys

Add to your `.env.local` file:
```env
OPENAI_API_KEY=your-openai-api-key
# or
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 3. Start the Browser Agent Service

In a new terminal:
```bash
cd browser-agent
source venv/bin/activate
python browser_agent_service.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
```

## 4. Add Chat Route Handler

Add the deep research handling to your `/app/api/chat/route.ts` file.

Look for where web search is detected (around line 100-120) and add:

```typescript
// Check for deep research mode
const isDeepResearchMode = messageContent.startsWith('deep research on ');
const deepResearchQuery = isDeepResearchMode 
  ? messageContent.replace('deep research on ', '').trim() 
  : '';

if (isDeepResearchMode && deepResearchQuery) {
  console.log('[Chat API] Deep research mode detected:', deepResearchQuery);
  
  // Return a streaming response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      controller.enqueue(encoder.encode('🔬 **Deep Research Mode Active**\n\n'));
      controller.enqueue(encoder.encode(`Researching: ${deepResearchQuery}\n\n`));
      controller.enqueue(encoder.encode('Check the Browser tab to watch the research in real-time!\n'));
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

## 5. Test the Integration

1. Start your Next.js app:
   ```bash
   npm run dev
   ```

2. In the chat interface:
   - Click the "Agentic Research" button
   - The AgentCanvas modal should open
   - Enter a research topic
   - Click "Start Research"
   - Watch the browser automation in real-time!

## Troubleshooting

### "Browser agent service is not running"
- Make sure the Python service is running on port 8001
- Check that no firewall is blocking port 8001

### No screenshots appearing
- Ensure Chromium is installed: `playwright install chromium`
- Try running with `headless=True` in the Python service

### API Key errors
- Verify your `.env.local` file has the correct API keys
- Restart both the Python service and Next.js app after adding keys

## Test Commands

Test the WebSocket connection:
```bash
curl http://localhost:8001/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "browser-agent",
  "active_sessions": 0
}
```

## Docker Alternative

If you prefer Docker:
```bash
docker-compose -f docker-compose.browser.yml up browser-agent
```

This will:
- Build the Python service container
- Install all dependencies
- Start the service on port 8001
- Mount your code for hot reloading

## What's Next?

Once running, you can:
1. Customize the research prompts in AgentCanvas
2. Add more sophisticated research strategies
3. Integrate the results back into your chat
4. Save research sessions for later reference

The browser agent will:
- Visit multiple websites
- Extract relevant content
- Take screenshots at each step
- Generate a comprehensive research report
- Stream everything to your web app in real-time!
