# Real-Time AI Browser Agent with VNC Streaming

This implementation provides a GPT Operator/Manus.ai-style browser agent where users can watch the AI control a real browser in real-time through VNC streaming.

## 🚀 Features

- **Live Browser Control**: AI controls a real Chromium browser instance
- **VNC Streaming**: Watch mouse movements, clicks, and typing in real-time
- **Takeover Mode**: Users can take manual control when needed
- **Container Isolation**: Each session runs in an isolated environment
- **WebSocket Updates**: Real-time progress and status updates
- **Multi-Model Support**: Works with GPT-4, Claude, Gemini, etc.

## 🏗️ Architecture

```
User → Chat Interface → AI Agent → Browser Automation → VNC Stream
          ↓                ↓              ↓                  ↓
     Next.js App    Gemini/GPT-4    Playwright          noVNC Client
```

### Components

1. **VNC Browser Service** (`vnc_browser_service.py`)
   - Manages browser sessions with Xvfb + Chromium
   - Provides VNC streaming via x11vnc
   - REST API for browser control

2. **AI Browser Agent View** (`ai-browser-agent-view.tsx`)
   - Chat interface for user instructions
   - Integrates VNC viewer for live browser display
   - Takeover mode controls

3. **VNC Browser View** (`vnc-browser-view.tsx`)
   - noVNC-based browser viewer
   - Real-time display of browser actions
   - Manual control capabilities

## 🛠️ Setup Instructions

### Option 1: Docker (Recommended)

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose -f docker-compose.vnc.yml up --build
   ```

2. **Access the application**:
   - Next.js app: http://localhost:3000
   - AI Browser Agent: http://localhost:3000/ai-browser-agent
   - VNC (if needed): vnc://localhost:5900
   - noVNC web: http://localhost:6080

### Option 2: Local Development

1. **Install system dependencies**:

   **Ubuntu/Debian**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y xvfb x11vnc fluxbox chromium-browser
   ```

   **macOS**:
   ```bash
   brew install --cask xquartz
   brew install x11vnc
   # Install Chrome from https://www.google.com/chrome/
   ```

2. **Start the VNC browser service**:
   ```bash
   ./start-vnc-browser.sh
   ```

3. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```

4. **Navigate to the AI Browser Agent**:
   - Open http://localhost:3000/ai-browser-agent

## 🔧 Configuration

### Environment Variables

Add to `.env.local`:

```bash
# VNC Browser Service URL
VNC_BROWSER_SERVICE_URL=http://localhost:8003

# AI Model API Keys (at least one required)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Browser Resolution

Default: 1280x720

To change, modify the resolution in:
- `vnc_browser_service.py`: `CreateSessionRequest.resolution`
- `ai-browser-agent-view.tsx`: `createBrowserSession` function

## 📖 Usage Examples

### Basic Web Search
```
User: "Search for the latest AI news on Google"
Agent: *Opens Google, types "latest AI news", clicks search, summarizes results*
```

### Form Filling
```
User: "Fill out the contact form on example.com"
Agent: *Navigates to site, identifies form fields, fills them appropriately*
```

### Data Extraction
```
User: "Compare prices for iPhone 15 across different retailers"
Agent: *Visits multiple sites, extracts prices, presents comparison*
```

### Complex Workflows
```
User: "Book a flight from NYC to London for next month"
Agent: *Opens travel sites, searches flights, compares options*
Note: Will request takeover for payment details
```

## 🔒 Security Features

1. **Container Isolation**: Each browser session runs in isolation
2. **Takeover Mode**: Manual control for sensitive operations
3. **Domain Restrictions**: Can limit which sites the agent can access
4. **Session Timeouts**: Automatic cleanup of idle sessions
5. **No Credential Storage**: Agent never stores passwords or payment info

## 🛡️ Takeover Mode

When the agent encounters sensitive operations (login forms, payment pages), it will:
1. Pause automation
2. Alert the user
3. Enable manual control
4. Wait for user to complete sensitive steps
5. Resume automation after user confirmation

To manually activate takeover:
- Click "Take Control" button in the browser view
- Use mouse and keyboard normally
- Click "Return to AI" when done

## 🔍 Troubleshooting

### VNC Connection Issues
- Ensure Xvfb is running: `ps aux | grep Xvfb`
- Check VNC server: `ps aux | grep x11vnc`
- Verify ports: `netstat -an | grep 5900`

### Browser Not Displaying
- Check Chrome/Chromium installation
- Verify DISPLAY variable: `echo $DISPLAY`
- Test with: `DISPLAY=:99 chromium --no-sandbox`

### Performance Issues
- Reduce resolution in session creation
- Use container deployment for better isolation
- Check system resources (CPU, memory)

## 🚀 Advanced Features

### Session Recording
Sessions can be recorded for playback:
- Enable in `CreateSessionRequest`
- Videos saved in session recordings directory
- Useful for debugging and audit trails

### Custom AI Models
Switch between models by setting the `model` parameter:
- `gemini-1.5-flash` (default, fast)
- `gemini-1.5-pro` (more capable)
- `gpt-4o` (OpenAI)
- `claude-3-sonnet` (Anthropic)

### Parallel Sessions
The system supports multiple concurrent browser sessions:
- Each session gets unique display number
- Independent VNC ports
- Isolated browser instances

## 📚 API Reference

### Create Browser Session
```
POST /api/vnc-browser/create
{
  "task": "Search for AI news",
  "enable_recording": true,
  "resolution": "1280x720"
}
```

### Execute Action
```
POST /api/vnc-browser/action/{session_id}
{
  "type": "click",
  "selector": "button.search"
}
```

### Get Page Content
```
GET /api/vnc-browser/content/{session_id}
```

### WebSocket Events
```
ws://localhost:8003/ws/vnc/{session_id}

Message Types:
- connected: Initial connection
- action_result: Action execution result
- content: Page content update
- error: Error message
```

## 🤝 Contributing

To add new features:
1. Extend browser actions in `vnc_browser_service.py`
2. Add AI capabilities in `browser-agent/execute/route.ts`
3. Enhance UI in `ai-browser-agent-view.tsx`
4. Update VNC streaming in `vnc-browser-view.tsx`

## 📄 License

This implementation is part of the Gemini Chatbot v7 project.