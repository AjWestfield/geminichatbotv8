# Browser Integration Guide

## Overview

This application now includes a real browser integration powered by Playwright, allowing users and AI agents to interact with live web pages in real-time.

## Architecture

### Components

1. **PlaywrightBrowserService** (`lib/services/playwright-browser.ts`)
   - Manages browser sessions using Playwright
   - Handles navigation, screenshots, and user interactions
   - Emits events for real-time updates

2. **Browser Session API** (`app/api/browser/session/route.ts`)
   - REST API for browser operations
   - Supports create, navigate, click, type, scroll, etc.

3. **WebSocket Server** (`lib/services/browser-websocket.ts`)
   - Real-time communication for browser events
   - Streams screenshots and updates
   - Handles user interactions

4. **LiveBrowserView** (`components/live-browser-view.tsx`)
   - React component for displaying browser
   - Interactive layer for user clicks
   - Real-time screenshot streaming

## Getting Started

### 1. Start the WebSocket Server

In a separate terminal, run:

```bash
node scripts/browser-ws-server.js
```

This starts the WebSocket server on port 3001 (configurable via `BROWSER_WS_PORT` env var).

### 2. Use the Browser in Your App

The browser is available in the Canvas view under the "Browser" tab.

### 3. Browser Features

- **Navigation**: Enter URLs and navigate
- **Interactions**: Click, type, scroll
- **Screenshots**: Manual capture or live streaming
- **Session Management**: Create/close browser sessions

## API Usage

### Create a Browser Session

```typescript
const response = await fetch('/api/browser/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    options: {
      headless: false,
      viewport: { width: 1280, height: 720 }
    }
  })
});
```

### Navigate to a URL

```typescript
const response = await fetch('/api/browser/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'navigate',
    sessionId: 'your-session-id',
    url: 'https://example.com'
  })
});
```

### Click on Page

```typescript
const response = await fetch('/api/browser/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'click',
    sessionId: 'your-session-id',
    position: { x: 100, y: 200 }
  })
});
```

## WebSocket Events

Connect to `ws://localhost:3001` and subscribe to a session:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.send(JSON.stringify({
  type: 'subscribe',
  sessionId: 'your-session-id'
}));

// Receive events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle screenshot, navigation, error events
};
```

## Environment Variables

- `BROWSER_WS_URL`: WebSocket server URL (default: `ws://localhost:3001`)
- `BROWSER_WS_PORT`: WebSocket server port (default: `3001`)

## Security Considerations

- Sessions timeout after 30 minutes of inactivity
- Browser runs in sandboxed mode
- CORS and authentication should be configured for production

## Future Enhancements

- [ ] Stagehand integration for AI capabilities
- [ ] WebRTC for lower latency streaming
- [ ] Multi-tab support
- [ ] Browser recording and playback
- [ ] Collaborative browsing features

## Troubleshooting

### WebSocket Connection Failed
- Ensure the WebSocket server is running
- Check firewall settings for port 3001
- Verify BROWSER_WS_URL environment variable

### Browser Session Not Starting
- Ensure Playwright browsers are installed: `npx playwright install chromium`
- Check system dependencies: `npx playwright install-deps`

### Performance Issues
- Reduce screenshot streaming frequency
- Use headless mode for better performance
- Increase system resources