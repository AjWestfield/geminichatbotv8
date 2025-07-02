# Embedded Browser View Implementation Guide for GeminiChatbotV7

## Overview
This guide outlines the implementation of an embedded browser view for the deep research functionality in the GeminiChatbotV7 project. The goal is to display browser automation sessions within the web app's Canvas view instead of opening external browser windows.

## Problem Statement
Current implementation issues:
- Browser view opens external browser window (about:blank)
- Deep research automation not visible within the app
- WebSocket connection failing to stream browser content
- Canvas view shows "Start Browser Session" but doesn't display actual browser

## Solution Architecture

### Core Components
1. **Browser Frame Capture Service** (Server-side)
   - Uses Chrome DevTools Protocol (CDP) via Playwright
   - Captures browser frames in real-time
   - Streams frames via WebSocket

2. **Canvas Renderer** (Client-side)
   - Receives frame data via WebSocket
   - Renders frames on HTML5 Canvas
   - Handles user interactions

3. **Integration Layer**
   - Bridges browser-use library with streaming service
   - Manages WebSocket connections
   - Coordinates browser automation

## Implementation Plan

### Phase 1: Server-Side Browser Streaming Service

#### 1.1 Create Browser Stream Service
**File**: `browser-agent/browser_stream_service.py`

```python
import asyncio
import base64
from playwright.async_api import async_playwright
from fastapi import WebSocket
import json

class BrowserStreamService:
    def __init__(self):
        self.browser = None
        self.page = None
        self.cdp_session = None
        
    async def initialize(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=True)
        self.page = await self.browser.new_page()
        self.cdp_session = await self.page.context.new_cdp_session(self.page)
        
    async def start_streaming(self, websocket: WebSocket):
        # Enable screen capture
        await self.cdp_session.send("Page.startScreencast", {
            "format": "jpeg",
            "quality": 70,
            "maxWidth": 1920,
            "maxHeight": 1080,
            "everyNthFrame": 2
        })
        
        # Handle incoming frames
        async def on_screencast_frame(params):
            frame_data = {
                "type": "frame",
                "data": params["data"],
                "timestamp": asyncio.get_event_loop().time(),
                "sessionId": params["sessionId"]
            }
            await websocket.send_json(frame_data)
            
            # Acknowledge frame
            await self.cdp_session.send("Page.screencastFrameAck", {
                "sessionId": params["sessionId"]
            })
            
        self.cdp_session.on("Page.screencastFrame", on_screencast_frame)
```

#### 1.2 Integrate with Browser-Use
**File**: `browser-agent/enhanced_browser_agent.py`

```python
from browser_use import Agent
from browser_stream_service import BrowserStreamService

class EnhancedBrowserAgent:
    def __init__(self, llm, stream_service):
        self.agent = Agent(llm=llm)
        self.stream_service = stream_service
        
    async def research_with_streaming(self, query, websocket):
        # Start browser streaming
        await self.stream_service.start_streaming(websocket)
        
        # Inject page into agent
        self.agent._page = self.stream_service.page
        
        # Run research task
        result = await self.agent.run(task=f"Research: {query}")
        return result
```

### Phase 2: Client-Side Canvas Implementation

#### 2.1 Enhanced LiveBrowserView Component
**File**: `components/live-browser-view-enhanced.tsx`

```typescript
interface LiveBrowserViewEnhancedProps {
  sessionId: string | null
  onSessionChange: (id: string | null) => void
  browserAgentUrl?: string
}

export function LiveBrowserViewEnhanced({
  sessionId,
  onSessionChange,
  browserAgentUrl = 'localhost:8001'
}: LiveBrowserViewEnhancedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [fps, setFps] = useState(0)
  
  useEffect(() => {
    if (!sessionId) return
    
    // Connect to browser stream
    const ws = new WebSocket(`ws://${browserAgentUrl}/ws/browser-stream/${sessionId}`)
    wsRef.current = ws
    
    let frameCount = 0
    let lastFpsUpdate = Date.now()
    
    ws.onopen = () => {
      setIsConnected(true)
      console.log('Browser stream connected')
    }
    
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'frame' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        
        // Render frame
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
          ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height)
          
          // Update FPS counter
          frameCount++
          const now = Date.now()
          if (now - lastFpsUpdate > 1000) {
            setFps(frameCount)
            frameCount = 0
            lastFpsUpdate = now
          }
        }
        img.src = `data:image/jpeg;base64,${data.data}`
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }
    
    ws.onclose = () => {
      setIsConnected(false)
    }
    
    return () => {
      ws.close()
    }
  }, [sessionId, browserAgentUrl])
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!wsRef.current || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
    const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
    
    wsRef.current.send(JSON.stringify({
      type: 'click',
      x: Math.round(x),
      y: Math.round(y)
    }))
  }
  
  return (
    <div className="relative h-full bg-black">
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleCanvasClick}
      />
      
      {/* Status overlay */}
      <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {isConnected && <span>• {fps} FPS</span>}
        </div>
      </div>
    </div>
  )
}
```

#### 2.2 Update AgentCanvas Component
**File**: `components/agent-canvas.tsx`

```typescript
export function AgentCanvas({ query, onClose }: AgentCanvasProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isResearching, setIsResearching] = useState(false)
  const [researchLog, setResearchLog] = useState<string[]>([])
  
  const startResearch = async () => {
    setIsResearching(true)
    
    try {
      // Start browser session with streaming
      const response = await fetch('/api/browser/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          enableStreaming: true,
          llm: 'claude-sonnet-4-20250514'
        })
      })
      
      const { sessionId } = await response.json()
      setSessionId(sessionId)
      
      // Connect to research progress stream
      const eventSource = new EventSource(`/api/browser/research-progress/${sessionId}`)
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setResearchLog(prev => [...prev, data.message])
      }
      
    } catch (error) {
      console.error('Failed to start research:', error)
      setIsResearching(false)
    }
  }
  
  return (
    <div className="flex h-full">
      {/* Browser View */}
      <div className="flex-1">
        <LiveBrowserViewEnhanced 
          sessionId={sessionId}
          onSessionChange={setSessionId}
          browserAgentUrl="localhost:8001"
        />
      </div>
      
      {/* Control Panel */}
      <div className="w-96 border-l p-4 space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Research Query</h3>
          <p className="text-sm text-muted-foreground mb-4">{query}</p>
          <Button 
            onClick={startResearch} 
            disabled={isResearching}
            className="w-full"
          >
            {isResearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Research
              </>
            )}
          </Button>
        </Card>
        
        {/* Research Log */}
        <Card className="p-4 flex-1 overflow-hidden">
          <h3 className="font-semibold mb-2">Research Progress</h3>
          <ScrollArea className="h-[400px]">
            {researchLog.map((log, index) => (
              <div key={index} className="text-sm py-1 border-b">
                {log}
              </div>
            ))}
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
```

### Phase 3: API Routes and Integration

#### 3.1 Browser Session API Route
**File**: `app/api/browser/session/route.ts`

```typescript
export async function POST(request: Request) {
  const { query, enableStreaming, llm } = await request.json()
  
  // Generate session ID
  const sessionId = crypto.randomUUID()
  
  // Start browser agent with streaming
  const response = await fetch('http://localhost:8001/api/browser/start-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      query,
      enableStreaming,
      llm
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to start browser session')
  }
  
  return NextResponse.json({ sessionId })
}
```

#### 3.2 Update Chat Route for Deep Research
**File**: `app/api/chat/route.ts` (modification)

```typescript
if (isDeepResearchMode && deepResearchQuery) {
  console.log('[Chat API] Deep research mode detected:', deepResearchQuery)
  
  // Start browser session
  const sessionResponse = await fetch('http://localhost:3000/api/browser/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: deepResearchQuery,
      enableStreaming: true,
      llm: 'claude-sonnet-4-20250514'
    })
  })
  
  const { sessionId } = await sessionResponse.json()
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      controller.enqueue(encoder.encode('🔬 **Deep Research Mode Active**\n\n'))
      controller.enqueue(encoder.encode(`🎯 **Research Topic:** ${deepResearchQuery}\n\n`))
      controller.enqueue(encoder.encode('🌐 **Starting browser-based research...**\n\n'))
      controller.enqueue(encoder.encode(`📺 **Live Browser Session:** Click [here](/canvas?session=${sessionId}) to watch\n\n`))
      controller.enqueue(encoder.encode('🤖 **AI Agent:** Claude Sonnet 4 is navigating the web for you\n\n'))
      
      controller.close()
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

### Phase 4: Performance Optimization

#### 4.1 Implement Adaptive Streaming
```python
class AdaptiveStreamingService:
    def __init__(self):
        self.quality_presets = {
            'high': {'quality': 85, 'maxWidth': 1920, 'maxHeight': 1080, 'everyNthFrame': 1},
            'medium': {'quality': 70, 'maxWidth': 1280, 'maxHeight': 720, 'everyNthFrame': 2},
            'low': {'quality': 50, 'maxWidth': 854, 'maxHeight': 480, 'everyNthFrame': 3}
        }
        self.current_quality = 'medium'
        
    async def adjust_quality(self, network_metrics):
        if network_metrics['latency'] > 200:
            self.current_quality = 'low'
        elif network_metrics['bandwidth'] > 5000000:
            self.current_quality = 'high'
        else:
            self.current_quality = 'medium'
```

#### 4.2 Binary WebSocket Protocol
```typescript
// Use binary frames for better performance
ws.binaryType = 'arraybuffer'

ws.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    const blob = new Blob([event.data], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
}
```

### Phase 5: Security Implementation

#### 5.1 WebSocket Authentication
```python
async def authenticate_websocket(websocket: WebSocket, token: str):
    # Verify JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except:
        await websocket.close(code=1008, reason="Unauthorized")
        return None
```

#### 5.2 Content Security Policy
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Set CSP headers for browser isolation
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; connect-src 'self' ws://localhost:8001"
  )
  
  return response
}
```

## Testing Plan

### Unit Tests
1. Test browser frame capture
2. Test WebSocket message handling
3. Test canvas rendering
4. Test user interaction forwarding

### Integration Tests
1. Test end-to-end browser streaming
2. Test deep research workflow
3. Test error handling and reconnection
4. Test performance under load

### User Acceptance Tests
1. Verify browser view displays correctly
2. Verify real-time updates (< 100ms latency)
3. Verify interaction responsiveness
4. Verify research results accuracy

## Deployment Considerations

1. **Docker Configuration**
   - Add Playwright dependencies to Dockerfile
   - Configure for headless browser operation
   - Set up volume mounts for browser cache

2. **Scaling Strategy**
   - Horizontal scaling with session affinity
   - Redis for session management
   - Load balancer with WebSocket support

3. **Monitoring**
   - Track frame rates and latency
   - Monitor WebSocket connections
   - Log browser automation errors

## Success Criteria

1. Browser view displays within Canvas tab (not external)
2. Real-time streaming with < 100ms latency
3. Full browser interactivity (click, type, scroll)
4. Seamless integration with browser-use agent
5. Stable performance for 30+ minute sessions

## Timeline

- Phase 1: 2-3 hours (Server-side streaming)
- Phase 2: 2-3 hours (Client-side implementation)
- Phase 3: 1-2 hours (API integration)
- Phase 4: 1-2 hours (Performance optimization)
- Phase 5: 1 hour (Security implementation)
- Testing: 2-3 hours

Total estimated time: 10-14 hours

## Next Steps

1. Set up development environment
2. Implement Phase 1 (Browser Stream Service)
3. Test frame capture with simple webpage
4. Implement Phase 2 (Canvas Renderer)
5. Integrate with existing browser-use agent
6. Implement remaining phases
7. Comprehensive testing
8. Documentation update

This guide provides a complete roadmap for implementing the embedded browser view functionality, transforming the current external browser approach into a fully integrated, real-time browser streaming solution within the Canvas view.