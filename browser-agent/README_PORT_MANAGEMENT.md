# Browser Agent Service - Port Management Guide

## Overview

The Enhanced Browser Agent Service now includes robust port conflict resolution and automatic port management to prevent the persistent "address already in use" errors.

## Quick Start

### Recommended Method (Using Startup Script)

```bash
cd browser-agent
./start_browser_agent.sh
```

This script automatically:
- ✅ Detects port conflicts
- ✅ Terminates conflicting processes
- ✅ Finds alternative ports if needed
- ✅ Provides clear status messages
- ✅ Handles graceful shutdown

### Manual Method

```bash
cd browser-agent
python browser_agent_service.py
```

The Python script now includes automatic port management.

## Port Management Features

### 1. Automatic Port Cleanup
- Detects processes using port 8001
- Attempts graceful termination (SIGTERM)
- Falls back to force termination (SIGKILL)
- Verifies port is actually freed

### 2. Alternative Port Discovery
- If port 8001 cannot be freed, finds next available port
- Searches ports 8002-8010 automatically
- Updates CORS configuration dynamically
- Logs the actual port being used

### 3. Enhanced Error Handling
- Clear error messages with troubleshooting steps
- Graceful handling of keyboard interrupts
- Proper cleanup on service shutdown

## Troubleshooting

### Port Conflict Errors

If you still encounter port conflicts:

1. **Check what's using the port:**
   ```bash
   lsof -i :8001
   ```

2. **Kill specific process:**
   ```bash
   kill -TERM <PID>
   # or force kill:
   kill -9 <PID>
   ```

3. **Kill all processes on port:**
   ```bash
   lsof -ti:8001 | xargs kill -9
   ```

4. **Use the startup script:**
   ```bash
   ./start_browser_agent.sh
   ```

### Service Won't Start

1. **Check Python environment:**
   ```bash
   python --version
   pip list | grep fastapi
   ```

2. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn
   ```

3. **Check file permissions:**
   ```bash
   chmod +x start_browser_agent.sh
   ```

### Frontend Connection Issues

1. **Verify service is running:**
   ```bash
   curl http://localhost:8001/health
   ```

2. **Check CORS configuration:**
   - Service automatically includes localhost:3000 in CORS
   - Also includes 127.0.0.1 variants

3. **Test endpoints:**
   ```bash
   # Health check
   curl http://localhost:8001/health
   
   # Execute endpoint
   curl -X POST http://localhost:8001/api/execute \
     -H "Content-Type: application/json" \
     -d '{"session_id": "test", "action": {"type": "navigate", "value": "https://google.com"}}'
   ```

## Service Endpoints

### Core Endpoints
- `GET /health` - Service health check
- `POST /api/execute` - Execute browser actions
- `POST /api/command` - Process natural language commands (streaming)

### Research Endpoints
- `POST /api/browser/start-integrated-research` - Start research session
- `GET /api/browser/sessions` - List all sessions
- `WebSocket /ws/browser-agent` - Real-time communication

## Environment Variables

- `BROWSER_AGENT_PORT` - Override default port (set by startup script)
- `BROWSER_AGENT_URL` - Frontend uses this to connect (default: http://localhost:8001)

## Integration with Frontend

The frontend expects the service on port 8001. If using an alternative port:

1. **Update environment variable:**
   ```bash
   export BROWSER_AGENT_URL=http://localhost:8002
   ```

2. **Or update .env.local:**
   ```
   BROWSER_AGENT_URL=http://localhost:8002
   ```

## Monitoring

### Service Logs
The service provides detailed logging:
- Port management activities
- Request processing
- Error conditions
- Performance metrics

### Health Monitoring
```bash
# Continuous health monitoring
watch -n 5 'curl -s http://localhost:8001/health | jq .'
```

## Best Practices

1. **Always use the startup script** for production
2. **Monitor logs** for any issues
3. **Keep the service running** in a dedicated terminal
4. **Use Ctrl+C** for graceful shutdown
5. **Check health endpoint** before frontend testing

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Port 8001 in use | Previous service instance | Use startup script or kill processes |
| Service won't start | Missing dependencies | Install FastAPI and Uvicorn |
| Frontend can't connect | Wrong port/CORS | Check service logs for actual port |
| Streaming not working | Network issues | Verify WebSocket support |

## Support

If you continue to experience issues:

1. Check the service logs for detailed error messages
2. Verify all dependencies are installed
3. Ensure no firewall is blocking the ports
4. Test with curl commands before frontend integration

The enhanced port management should resolve all persistent port conflict issues!
