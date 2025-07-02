# Embedded Browser Implementation Plan

## Overview
This implementation plan details the step-by-step execution strategy for adding embedded browser functionality to the GeminiChatbotV7 deep research feature.

## Current Situation Analysis
- ✅ Browser-use library installed and configured
- ✅ Browser agent service running on port 8001
- ✅ WebSocket infrastructure in place
- ❌ Browser opens externally instead of embedded
- ❌ No frame capture/streaming implementation
- ❌ Canvas view shows placeholder instead of browser

## Implementation Approach
We will follow a phased approach, implementing and testing each component before moving to the next.

## Phase 1: Server-Side Browser Streaming (Immediate - 3 hours)

### Step 1.1: Create Browser Stream Service
```bash
# File: browser-agent/browser_stream_service.py
```
- [ ] Implement CDP integration with Playwright
- [ ] Add frame capture functionality
- [ ] Create WebSocket endpoint for streaming
- [ ] Test with simple webpage

### Step 1.2: Enhance Browser Agent
```bash
# File: browser-agent/enhanced_browser_agent.py
```
- [ ] Integrate streaming service with browser-use
- [ ] Maintain existing Claude Sonnet 4 configuration
- [ ] Add session management
- [ ] Test research + streaming combination

### Step 1.3: Update Main Service
```bash
# File: browser-agent/browser_agent_service.py
```
- [ ] Add streaming endpoints
- [ ] Implement session routing
- [ ] Add error handling
- [ ] Test WebSocket connections

## Phase 2: Client-Side Implementation (Next - 3 hours)

### Step 2.1: Create Enhanced LiveBrowserView
```bash
# File: components/live-browser-view-enhanced.tsx
```
- [ ] Replace current LiveBrowserView implementation
- [ ] Add Canvas rendering
- [ ] Implement WebSocket client
- [ ] Add FPS counter and status

### Step 2.2: Update AgentCanvas
```bash
# File: components/agent-canvas.tsx
```
- [ ] Import enhanced LiveBrowserView
- [ ] Add session management
- [ ] Implement research controls
- [ ] Add progress logging

### Step 2.3: Update Deep Research UI
- [ ] Ensure Canvas tab shows browser view
- [ ] Remove external browser triggers
- [ ] Add loading states
- [ ] Test end-to-end flow

## Phase 3: API Integration (Following - 2 hours)

### Step 3.1: Create Browser Session API
```bash
# File: app/api/browser/session/route.ts
```
- [ ] Create POST endpoint
- [ ] Generate session IDs
- [ ] Communicate with browser agent
- [ ] Return streaming URLs

### Step 3.2: Update Chat Route
```bash
# File: app/api/chat/route.ts
```
- [ ] Enhance deep research detection
- [ ] Start browser sessions
- [ ] Return session links
- [ ] Stream status updates

### Step 3.3: Create Progress API
```bash
# File: app/api/browser/research-progress/[sessionId]/route.ts
```
- [ ] Create SSE endpoint
- [ ] Stream research logs
- [ ] Handle completion events
- [ ] Test with UI

## Phase 4: Testing & Debugging (1 hour)

### Step 4.1: Unit Testing
- [ ] Test frame capture
- [ ] Test WebSocket messages
- [ ] Test Canvas rendering
- [ ] Test error scenarios

### Step 4.2: Integration Testing
- [ ] Test full research flow
- [ ] Test reconnection logic
- [ ] Test multiple sessions
- [ ] Test error recovery

### Step 4.3: Performance Testing
- [ ] Measure frame latency
- [ ] Check bandwidth usage
- [ ] Monitor CPU/memory
- [ ] Optimize bottlenecks

## Phase 5: Optimization (If time permits)

### Step 5.1: Implement Adaptive Streaming
- [ ] Add quality presets
- [ ] Monitor network metrics
- [ ] Adjust quality dynamically
- [ ] Test on slow connections

### Step 5.2: Binary Protocol
- [ ] Convert to ArrayBuffer transmission
- [ ] Update client handling
- [ ] Measure bandwidth savings
- [ ] Deploy if stable

## Immediate Next Steps (Right Now)

### 1. Stop browser agent service
```bash
# Find and kill the process
ps aux | grep browser_agent_service
kill -9 [PID]
```

### 2. Create browser_stream_service.py
Start with basic CDP integration

### 3. Test frame capture
Verify we can capture browser frames

### 4. Implement WebSocket streaming
Get frames flowing to client

### 5. Update LiveBrowserView
Display frames on Canvas

## Success Checkpoints

### Checkpoint 1 (1 hour)
- [ ] Frame capture working
- [ ] Basic WebSocket established
- [ ] Single frame displayed

### Checkpoint 2 (3 hours)
- [ ] Continuous streaming working
- [ ] 15+ FPS achieved
- [ ] Browser visible in Canvas

### Checkpoint 3 (5 hours)
- [ ] Full integration complete
- [ ] Deep research triggers streaming
- [ ] No external browsers

### Checkpoint 4 (7 hours)
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Ready for use

## Risk Mitigation

### Risk 1: CDP Integration Issues
- **Mitigation**: Use puppeteer-stream as fallback
- **Detection**: Frame capture fails
- **Action**: Switch to alternative library

### Risk 2: Performance Problems
- **Mitigation**: Reduce quality/framerate
- **Detection**: High latency or CPU
- **Action**: Implement adaptive streaming

### Risk 3: WebSocket Instability
- **Mitigation**: Add reconnection logic
- **Detection**: Frequent disconnections
- **Action**: Implement exponential backoff

## Commands Reference

### Start Development
```bash
cd /Users/andersonwestfield/Desktop/geminichatbotv7/browser-agent
source venv/bin/activate
```

### Install Additional Dependencies
```bash
pip install aiofiles python-multipart
npm install --save-dev @types/ws
```

### Run Services
```bash
# Terminal 1: Browser Agent
python browser_agent_service.py

# Terminal 2: Next.js Dev
npm run dev

# Terminal 3: Monitor logs
tail -f browser-agent.log
```

### Test Endpoints
```bash
# Test session creation
curl -X POST http://localhost:8001/api/browser/start-session \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "enableStreaming": true}'

# Test WebSocket
wscat -c ws://localhost:8001/ws/browser-stream/test-session
```

## Definition of Done

1. ✅ Browser view displays in Canvas tab (not external)
2. ✅ Real-time streaming with < 100ms latency
3. ✅ Minimum 15 FPS achieved
4. ✅ Deep research integration working
5. ✅ No external browser windows
6. ✅ Error handling implemented
7. ✅ Basic documentation updated
8. ✅ Code committed and tested

## Time Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 3 hours | - | Not Started |
| Phase 2 | 3 hours | - | Not Started |
| Phase 3 | 2 hours | - | Not Started |
| Phase 4 | 1 hour | - | Not Started |
| Phase 5 | 1 hour | - | Optional |
| **Total** | **10 hours** | **-** | **0% Complete** |

## Notes
- Prioritize getting basic streaming working first
- Can skip optimization phase if time constrained
- Focus on Chrome/Chromium compatibility only
- Security can be enhanced in future iteration

---
Ready to begin implementation following this plan.