# Browser Agent Integration

This document describes the real-time browser agent integration that allows users to interact with an AI-powered browser automation system through a chat interface with live visual feedback.

## 🚀 Features

- **Real-time Chat Interface**: Natural language interaction with the browser agent
- **Live Browser View**: Watch the agent work in real-time through an embedded iframe
- **WebSocket Communication**: Real-time progress updates and task status
- **Structured Output**: Organized research results with summaries, findings, and sources
- **Task Control**: Pause, resume, and stop browser agent tasks
- **Multi-tab Management**: Automatic tab coordination for complex research workflows
- **Schema-based Results**: Automatic detection of research vs comparison tasks

## 🏗️ Architecture

### Components

1. **Frontend Components**
   - `BrowserAgentChat`: Main chat interface with embedded browser view
   - `TaskControls`: Pause/resume/stop controls for active tasks
   - `MessageList`: Chat message display with formatting
   - `ChatInput`: Input field with suggestions and shortcuts

2. **Backend Services**
   - `BrowserUseClient`: TypeScript client for Browser-Use Cloud API
   - `WebSocketManager`: Real-time communication for task updates
   - Custom Next.js server with integrated WebSocket support

3. **API Routes**
   - `/api/browser-agent/task`: Task creation, status, and control
   - `/api/ws/browser-agent`: WebSocket endpoint information

### Data Flow

```
User Input → Chat Interface → API Route → Browser-Use Cloud API
                ↓
WebSocket ← Task Progress ← Browser Agent ← Live Browser Session
                ↓
Real-time Updates → Chat Interface → User
```

## 🔧 Setup

### 1. Environment Configuration

Add your Browser-Use API key to `.env.local`:

```bash
# Browser-Use Cloud API - Get from https://cloud.browser-use.com/
BROWSER_USE_API_KEY=bu_your_api_key_here

# WebSocket URL for browser integration
NEXT_PUBLIC_BROWSER_WS_URL=ws://localhost:3000/ws/browser-agent
```

### 2. Dependencies

The following dependencies are already included:

```json
{
  "@types/ws": "^8.18.1",
  "ws": "^8.18.2"
}
```

### 3. Development Server

Start the custom server with WebSocket support:

```bash
npm run dev
```

This runs the custom server (`server.mjs`) which integrates Next.js with WebSocket functionality.

## 📖 Usage

### Accessing the Browser Agent

1. Start the development server: `npm run dev`
2. Navigate to: `http://localhost:3000/browser-agent`
3. Or click "Browser Agent" in the sidebar navigation

### Example Interactions

**Research Tasks:**
- "Research the latest AI developments in 2024"
- "Find information about sustainable energy companies"
- "Research the best restaurants in New York"

**Comparison Tasks:**
- "Compare iPhone 15 vs Samsung Galaxy S24 prices"
- "Compare streaming service prices and features"
- "Find the best laptop deals under $1000"

**Data Extraction:**
- "Find contact information for tech startups in SF"
- "Extract product reviews from multiple e-commerce sites"
- "Monitor news sites for mentions of specific companies"

### Task Control

While a task is running, you can:
- **Pause**: Temporarily halt the browser agent
- **Resume**: Continue a paused task
- **Stop**: Terminate the current task

## 🔍 Technical Details

### Browser-Use Cloud API Integration

The integration uses the Browser-Use Cloud API with the following features:

- **Live View**: Real-time browser session streaming
- **Structured Output**: JSON schema-based result formatting
- **Multi-LLM Support**: GPT-4o, Claude, Gemini, etc.
- **Task Management**: Create, monitor, and control browser automation tasks

### WebSocket Communication

Real-time updates are handled through WebSocket connections:

```typescript
// Message types
interface BrowserAgentMessage {
  type: 'task_progress' | 'task_complete' | 'task_error' | 'task_started' | 'step_update';
  taskId: string;
  data?: any;
  timestamp: string;
}
```

### Structured Output Schemas

The system automatically selects appropriate schemas based on task type:

**Research Schema:**
```json
{
  "summary": "Comprehensive summary of findings",
  "key_findings": ["Finding 1", "Finding 2"],
  "sources": [
    {
      "url": "https://example.com",
      "title": "Source Title",
      "relevance": "Why this source is relevant"
    }
  ],
  "confidence_score": 8.5,
  "recommendations": ["Recommendation 1"]
}
```

**Comparison Schema:**
```json
{
  "comparison_summary": "Summary of comparison results",
  "items": [
    {
      "name": "Product Name",
      "price": "$999",
      "source": "Store Name",
      "url": "https://store.com/product",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1", "Con 2"]
    }
  ],
  "best_value": {
    "name": "Best Product",
    "reason": "Why it's the best value"
  }
}
```

## 🧪 Testing

Run the test script to verify the integration:

```bash
node test-browser-agent.js
```

This tests:
- Browser-Use API connection
- Task creation functionality
- API key validation

## 🔒 Security

- API keys are stored securely in environment variables
- WebSocket connections include authentication
- Browser sessions are sandboxed with appropriate restrictions
- Domain restrictions can be configured for browser automation

## 📊 Monitoring

The system provides comprehensive monitoring:

- Real-time task progress updates
- WebSocket connection status
- Task execution statistics
- Error tracking and reporting

## 🚨 Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Verify the key is correctly set in `.env.local`
   - Check that the key has sufficient credits
   - Ensure the key format is correct: `bu_...`

2. **WebSocket Connection Failed**
   - Ensure the development server is running
   - Check that port 3000 is not blocked
   - Verify the WebSocket URL in environment variables

3. **Task Creation Failed**
   - Check Browser-Use API status
   - Verify network connectivity
   - Review task parameters and limits

4. **Live View Not Loading**
   - Ensure the task was created with `enable_live_view: true`
   - Check iframe sandbox permissions
   - Verify the live URL is accessible

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=browser-agent:*
```

## 🔄 Updates

The browser agent integration is designed to be easily updatable:

1. **API Client**: Update `lib/browser-use-client.ts` for new API features
2. **WebSocket Manager**: Modify `lib/websocket-manager.ts` for new message types
3. **UI Components**: Enhance components in `components/` for new features
4. **Schemas**: Add new output schemas in the client library

## 📚 Resources

- [Browser-Use Documentation](https://docs.browser-use.com/)
- [Browser-Use Cloud API](https://cloud.browser-use.com/)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)

## 🤝 Contributing

When contributing to the browser agent integration:

1. Follow the existing code structure and patterns
2. Add appropriate TypeScript types for new features
3. Update tests when adding new functionality
4. Document any new environment variables or configuration options
5. Ensure WebSocket message types are properly defined

## 📄 License

This browser agent integration is part of the Gemini AI Chatbot project and follows the same licensing terms.
