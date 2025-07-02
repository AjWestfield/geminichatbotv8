# Browser Service Auto-Management

## Overview

The browser service is now automatically managed by the application, eliminating the need to manually start and stop the Python browser agent service. The service starts when needed and stays running in the background with automatic health checks and recovery.

## Features

### 🚀 Automatic Startup
- Browser service starts automatically when the app launches
- No manual intervention required
- Service only runs in development mode

### 🔄 Health Monitoring
- Health checks every 30 seconds
- Automatic restart if service becomes unresponsive
- Maximum 5 retry attempts with 3-second delays

### 📊 Status Indicator
- Small indicator in bottom-right corner shows service status
- 🟢 Green = Service running
- 🟡 Yellow = Service starting
- Hover to see PID and details

### 🛡️ Process Management
- Graceful shutdown on app termination
- PID tracking for clean process management
- Resource cleanup on exit

## Usage

### Quick Start
```bash
# Use Node 20
bash -c "source ~/.nvm/nvm.sh && nvm use 20"

# Start with automatic browser service
npm run dev:auto
```

### Alternative Methods
```bash
# Traditional method (manual service start)
npm run dev

# Just Next.js (no browser service)
npm run dev:nextjs-only
```

### Check Service Status
```bash
# Via npm script
npm run browser:status

# Via API
curl http://localhost:3000/api/browser-service
```

### Manual Control (if needed)
```bash
# Start service
curl -X POST http://localhost:3000/api/browser-service -H "Content-Type: application/json" -d '{"action":"start"}'

# Stop service
curl -X POST http://localhost:3000/api/browser-service -H "Content-Type: application/json" -d '{"action":"stop"}'

# Restart service
curl -X POST http://localhost:3000/api/browser-service -H "Content-Type: application/json" -d '{"action":"restart"}'
```

## Architecture

### Components

1. **BrowserServiceManager** (`/lib/services/browser-service-manager.ts`)
   - Core service management logic
   - Process spawning and monitoring
   - Health check implementation
   - Event-based status updates

2. **BrowserServiceAutoStarter** (`/components/browser-service-auto-starter.tsx`)
   - React component for automatic startup
   - Status indicator UI
   - Toast notifications

3. **Browser Service API** (`/app/api/browser-service/route.ts`)
   - REST API for service control
   - Status checking endpoint
   - Start/stop/restart actions

### Flow
```
App Start → BrowserServiceAutoStarter → BrowserServiceManager → Python Process
     ↓                                           ↓                      ↓
Status UI ← Service Events ← Health Checks ← Running Service
```

## Configuration

### Environment Variables
```bash
# Port for browser service (default: 8001)
BROWSER_AGENT_PORT=8001

# Auto-start in development (set by dev-auto.sh)
AUTO_START_BROWSER_SERVICE=true
```

### Service Configuration
```typescript
{
  pythonPath: 'python3',           // Python executable
  servicePath: './browser-agent',   // Service directory
  port: 8001,                       // Service port
  maxRetries: 5,                    // Max restart attempts
  retryDelay: 3000,                 // Delay between retries (ms)
  healthCheckInterval: 30000        // Health check interval (ms)
}
```

## Troubleshooting

### Service Won't Start
1. Check Python installation: `python3 --version`
2. Verify virtual environment: `ls browser-agent/venv`
3. Check port availability: `lsof -i:8001`
4. View logs in console for detailed errors

### Service Keeps Restarting
1. Check Python dependencies: `cd browser-agent && pip install -r requirements.txt`
2. Verify no port conflicts
3. Check system resources (CPU/Memory)

### Health Checks Failing
1. Ensure `/health` endpoint exists in Python service
2. Check firewall settings
3. Verify service is binding to correct port

### Manual Recovery
```bash
# Kill any stuck processes
pkill -f browser_agent_service

# Remove PID file if exists
rm .browser-service.pid

# Restart the app
npm run dev:auto
```

## Benefits

1. **Zero Configuration**: Works out of the box
2. **Reliability**: Automatic recovery from crashes
3. **Resource Efficient**: Only runs when needed
4. **Developer Friendly**: No manual process management
5. **Production Safe**: Only activates in development

## Future Enhancements

- [ ] Support for multiple browser instances
- [ ] Resource usage monitoring
- [ ] Service logs viewer in UI
- [ ] Performance metrics dashboard
- [ ] Docker container option
