"""
Browser Stream Service - Captures and streams browser frames using CDP
"""
import asyncio
import base64
import json
import logging
from typing import Dict, Optional, Set
from datetime import datetime

from playwright.async_api import async_playwright, Page, Browser
from fastapi import WebSocket, WebSocketDisconnect
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BrowserStreamService:
    """Handles browser frame capture and streaming via CDP"""
    
    def __init__(self):
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.sessions: Dict[str, dict] = {}  # sessionId -> session data
        self.active_streams: Set[WebSocket] = set()
        
    async def initialize(self):
        """Initialize Playwright and browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,  # Run headless for embedded display
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        logger.info("Browser initialized successfully")
        
    async def get_page_for_session(self, session_id: str) -> Optional[Page]:
        """Get the page instance for a session (for AI agent control)"""
        session = self.sessions.get(session_id)
        if session:
            return session['page']
        return None
    
    async def create_session(self, session_id: str) -> Page:
        """Create a new browser session with CDP enabled"""
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
        )
        page = await context.new_page()
        
        # Enable CDP session
        cdp = await page.context.new_cdp_session(page)
        
        # Store session data
        self.sessions[session_id] = {
            'page': page,
            'context': context,
            'cdp': cdp,
            'created_at': datetime.now(),
            'frame_count': 0,
            'active_streams': set()
        }
        
        logger.info(f"Created session: {session_id}")
        return page

    async def start_frame_capture(self, session_id: str, websocket: WebSocket):
        """Start capturing and streaming frames for a session"""
        session = self.sessions.get(session_id)
        if not session:
            await websocket.send_json({
                'type': 'error',
                'message': f'Session {session_id} not found'
            })
            return
            
        cdp = session['cdp']
        session['active_streams'].add(websocket)
        
        try:
            # Configure screencast parameters
            await cdp.send('Page.startScreencast', {
                'format': 'jpeg',
                'quality': 70,  # Balance between quality and performance
                'maxWidth': 1920,
                'maxHeight': 1080,
                'everyNthFrame': 2  # Capture every 2nd frame for ~30fps
            })
            
            logger.info(f"Started screencast for session {session_id}")
            
            # Set up frame handler
            async def on_screencast_frame(params):
                frame_data = {
                    'type': 'frame',
                    'data': params['data'],  # Base64 encoded JPEG
                    'timestamp': datetime.now().isoformat(),
                    'sessionId': session_id,  # Use our session ID, not CDP's
                    'frameNumber': session['frame_count']
                }
                
                session['frame_count'] += 1
                
                # Send frame to all active streams for this session
                disconnected = set()
                for ws in session['active_streams']:
                    try:
                        await ws.send_json(frame_data)
                    except:
                        disconnected.add(ws)
                
                # Remove disconnected streams
                session['active_streams'] -= disconnected
                
                # Acknowledge frame received
                await cdp.send('Page.screencastFrameAck', {
                    'sessionId': params['sessionId']
                })
            
            # Register frame handler
            cdp.on('Page.screencastFrame', on_screencast_frame)
            
            # Send initial status
            await websocket.send_json({
                'type': 'status',
                'message': 'Streaming started',
                'sessionId': session_id
            })
            
        except Exception as e:
            logger.error(f"Error starting screencast: {e}")
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })

    async def handle_interaction(self, session_id: str, command: dict):
        """Handle user interactions (click, type, scroll, navigate)"""
        session = self.sessions.get(session_id)
        if not session:
            return
            
        page = session['page']
        
        try:
            if command['type'] == 'click':
                await page.mouse.click(command['x'], command['y'])
                logger.info(f"Click at ({command['x']}, {command['y']})")
                
            elif command['type'] == 'type':
                await page.keyboard.type(command['text'])
                logger.info(f"Typed: {command['text'][:20]}...")
                
            elif command['type'] == 'scroll':
                await page.mouse.wheel(0, command['deltaY'])
                logger.info(f"Scrolled: {command['deltaY']}")
                
            elif command['type'] == 'navigate' or command.get('navigate'):
                url = command.get('url') or command.get('navigate')
                await page.goto(url)
                logger.info(f"Navigated to: {url}")
                
        except Exception as e:
            logger.error(f"Interaction error: {e}")
    
    async def stop_session(self, session_id: str):
        """Stop and cleanup a browser session"""
        session = self.sessions.get(session_id)
        if not session:
            return
            
        try:
            # Stop screencast
            await session['cdp'].send('Page.stopScreencast')
            
            # Close page and context
            await session['page'].close()
            await session['context'].close()
            
            # Remove session
            del self.sessions[session_id]
            logger.info(f"Stopped session: {session_id}")
            
        except Exception as e:
            logger.error(f"Error stopping session: {e}")

# Create global instance
browser_service = BrowserStreamService()

# FastAPI app setup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateSessionRequest(BaseModel):
    sessionId: str
    url: Optional[str] = "https://www.google.com"

class InteractionCommand(BaseModel):
    type: str
    x: Optional[float] = None
    y: Optional[float] = None
    text: Optional[str] = None
    deltaY: Optional[float] = None
    url: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize browser on startup"""
    await browser_service.initialize()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if browser_service.browser:
        await browser_service.browser.close()
    if browser_service.playwright:
        await browser_service.playwright.stop()

@app.post("/api/browser/create-session")
async def create_session(request: CreateSessionRequest):
    """Create a new browser session"""
    try:
        page = await browser_service.create_session(request.sessionId)
        await page.goto(request.url)
        
        return {
            "sessionId": request.sessionId,
            "status": "created",
            "streamUrl": f"ws://localhost:8002/ws/stream/{request.sessionId}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/browser/session/{session_id}")
async def stop_session(session_id: str):
    """Stop a browser session"""
    await browser_service.stop_session(session_id)
    return {"status": "stopped"}

@app.websocket("/ws/stream/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for browser streaming"""
    await websocket.accept()
    logger.info(f"WebSocket connected for session: {session_id}")
    
    try:
        # Start frame capture
        await browser_service.start_frame_capture(session_id, websocket)
        
        # Handle incoming commands
        while True:
            try:
                data = await websocket.receive_json()
                
                if data.get('type') == 'interaction':
                    await browser_service.handle_interaction(session_id, data)
                elif data.get('type') == 'ping':
                    await websocket.send_json({'type': 'pong'})
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session: {session_id}")
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await websocket.send_json({
                    'type': 'error',
                    'message': str(e)
                })
                
    finally:
        # Remove from active streams
        session = browser_service.sessions.get(session_id)
        if session and websocket in session['active_streams']:
            session['active_streams'].remove(websocket)

@app.get("/api/browser/sessions")
async def list_sessions():
    """List active browser sessions"""
    return {
        "sessions": [
            {
                "sessionId": sid,
                "createdAt": session['created_at'].isoformat(),
                "frameCount": session['frame_count'],
                "activeStreams": len(session['active_streams'])
            }
            for sid, session in browser_service.sessions.items()
        ]
    }

if __name__ == "__main__":
    # Run with a different port to avoid conflict
    uvicorn.run(app, host="0.0.0.0", port=8002)
