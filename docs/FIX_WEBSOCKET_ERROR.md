# Fix for WebSocket Error in Research Feature

## Problem
When clicking the research button, you get:
```
Error: Stream WebSocket error
at live-browser-view.tsx:329:37
```

## Root Cause
The browser research feature requires two Python backend services that handle browser automation and streaming:
1. **Browser Agent Service** (port 8001) - Controls the browser
2. **Browser Stream Service** (port 8002) - Streams browser frames via WebSocket

These services were not running, causing the WebSocket connection to fail.

## Solution

### Quick Fix (Recommended)
1. Use the provided start script:
   ```bash
   cd /Users/andersonwestfield/Desktop/geminichatbotv7
   ./start-browser-services.sh
   ```

2. Check service status:
   ```bash
   ./check-browser-services.sh
   ```

### Manual Fix
If the script doesn't work:

1. **Terminal 1 - Start Browser Agent Service:**
   ```bash
   cd /Users/andersonwestfield/Desktop/geminichatbotv7/browser-agent
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium
   python browser_agent_service.py
   ```

2. **Terminal 2 - Start Browser Stream Service:**
   ```bash
   cd /Users/andersonwestfield/Desktop/geminichatbotv7/browser-agent
   source venv/bin/activate
   python browser_stream_service.py
   ```

## Improvements Made

1. **Better Error Messages**: The app now shows clear instructions when services aren't running
2. **Connection Timeout**: WebSocket connection attempts timeout after 5 seconds
3. **Health Check**: The app checks if services are reachable before attempting WebSocket connection
4. **Helpful Scripts**:
   - `start-browser-services.sh` - Starts both services automatically
   - `check-browser-services.sh` - Checks service status

## Testing

1. Start the services using the script
2. Refresh your browser
3. Click the research button
4. The browser view should now work without WebSocket errors

## Troubleshooting

If you still get errors:

1. **Check Python version**: Ensure you have Python 3.8+
   ```bash
   python3 --version
   ```

2. **Check ports**: Make sure ports 8001 and 8002 are free
   ```bash
   lsof -i:8001
   lsof -i:8002
   ```

3. **Check logs**:
   ```bash
   tail -f browser-agent/agent.log
   tail -f browser-agent/stream.log
   ```

4. **Reinstall dependencies**:
   ```bash
   cd browser-agent
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   playwright install chromium --with-deps
   ```

## Next Steps

Once the services are running, the research feature will:
- Open a browser window programmatically
- Navigate to websites
- Extract information
- Stream the browser view in real-time to your app

The WebSocket connection enables real-time streaming of the browser session, allowing you to see what the AI agent is doing as it researches.
