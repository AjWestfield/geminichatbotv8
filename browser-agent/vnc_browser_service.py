#!/usr/bin/env python3
"""
VNC Browser Service - Provides real-time browser automation with VNC streaming
This service runs a browser in a virtual display and streams it via VNC
"""

import os
import asyncio
import uuid
import logging
import subprocess
import signal
import json
import base64
from typing import Dict, Optional, Any, List
from datetime import datetime
from contextlib import asynccontextmanager
import tempfile
import shutil

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import numpy as np
from PIL import Image
import io

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BrowserSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.display_num = None
        self.xvfb_proc = None
        self.vnc_proc = None
        self.browser = None
        self.context = None
        self.page = None
        self.vnc_port = None
        self.vnc_password = None
        self.created_at = datetime.now()
        self.status = "initializing"
        self.recordings_dir = None
        
    async def cleanup(self):
        """Clean up all resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.vnc_proc:
                self.vnc_proc.terminate()
                self.vnc_proc.wait(timeout=5)
            if self.xvfb_proc:
                self.xvfb_proc.terminate()
                self.xvfb_proc.wait(timeout=5)
            if self.recordings_dir and os.path.exists(self.recordings_dir):
                shutil.rmtree(self.recordings_dir)
        except Exception as e:
            logger.error(f"Error cleaning up session {self.session_id}: {e}")

class CreateSessionRequest(BaseModel):
    task: str
    enable_recording: bool = True
    resolution: str = "1280x720"
    
class BrowserAction(BaseModel):
    type: str  # click, type, navigate, scroll, screenshot
    selector: Optional[str] = None
    value: Optional[str] = None
    coordinates: Optional[Dict[str, int]] = None

class VNCBrowserService:
    def __init__(self):
        self.sessions: Dict[str, BrowserSession] = {}
        self.playwright = None
        self.display_counter = 100  # Start from display :100
        
    async def initialize(self):
        """Initialize playwright"""
        self.playwright = await async_playwright().start()
        
    async def cleanup(self):
        """Clean up all sessions and playwright"""
        for session in list(self.sessions.values()):
            await session.cleanup()
        if self.playwright:
            await self.playwright.stop()
            
    def find_free_port(self, start_port: int = 5900) -> int:
        """Find a free port for VNC"""
        import socket
        for port in range(start_port, start_port + 100):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                try:
                    s.bind(('', port))
                    return port
                except OSError:
                    continue
        raise RuntimeError("No free ports available")
        
    async def create_session(self, session_id: str, task: str, resolution: str = "1280x720") -> BrowserSession:
        """Create a new browser session with VNC streaming"""
        session = BrowserSession(session_id)
        self.sessions[session_id] = session
        
        try:
            # Parse resolution
            width, height = map(int, resolution.split('x'))
            
            # Find free display number
            session.display_num = self.display_counter
            self.display_counter += 1
            
            # Start Xvfb (virtual display)
            xvfb_cmd = [
                'Xvfb',
                f':{session.display_num}',
                '-screen', '0', f'{width}x{height}x24',
                '-ac',  # Disable access control
                '+extension', 'GLX',
                '+render',
                '-noreset'
            ]
            session.xvfb_proc = subprocess.Popen(xvfb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            await asyncio.sleep(1)  # Give Xvfb time to start
            
            # Start x11vnc
            session.vnc_port = self.find_free_port()
            session.vnc_password = str(uuid.uuid4())[:8]
            
            vnc_cmd = [
                'x11vnc',
                '-display', f':{session.display_num}',
                '-port', str(session.vnc_port),
                '-passwd', session.vnc_password,
                '-forever',
                '-shared',
                '-quiet',
                '-noxdamage'  # Improves performance
            ]
            session.vnc_proc = subprocess.Popen(vnc_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            await asyncio.sleep(1)  # Give VNC time to start
            
            # Launch browser with display
            env = os.environ.copy()
            env['DISPLAY'] = f':{session.display_num}'
            
            session.browser = await self.playwright.chromium.launch(
                headless=False,  # We need a real browser window for VNC
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    f'--window-size={width},{height}',
                    '--window-position=0,0'
                ],
                env=env
            )
            
            # Create context with recording if enabled
            context_options = {
                'viewport': {'width': width, 'height': height},
                'screen': {'width': width, 'height': height},
            }
            
            if session.recordings_dir:
                session.recordings_dir = tempfile.mkdtemp(prefix=f"browser_session_{session_id}_")
                context_options['record_video_dir'] = session.recordings_dir
                context_options['record_video_size'] = {'width': width, 'height': height}
            
            session.context = await session.browser.new_context(**context_options)
            session.page = await session.context.new_page()
            
            # Set up console message logging
            session.page.on("console", lambda msg: logger.info(f"Browser console: {msg.text}"))
            
            session.status = "ready"
            logger.info(f"Session {session_id} created on display :{session.display_num}, VNC port {session.vnc_port}")
            
            return session
            
        except Exception as e:
            session.status = "error"
            await session.cleanup()
            del self.sessions[session_id]
            raise e
            
    async def execute_action(self, session_id: str, action: BrowserAction) -> Dict[str, Any]:
        """Execute a browser action"""
        session = self.sessions.get(session_id)
        if not session or session.status != "ready":
            raise ValueError(f"Session {session_id} not ready")
            
        page = session.page
        result = {"success": True, "action": action.type}
        
        try:
            if action.type == "navigate":
                await page.goto(action.value, wait_until="domcontentloaded")
                result["url"] = page.url
                
            elif action.type == "click":
                if action.selector:
                    await page.click(action.selector)
                elif action.coordinates:
                    await page.mouse.click(action.coordinates["x"], action.coordinates["y"])
                    
            elif action.type == "type":
                if action.selector:
                    await page.fill(action.selector, action.value)
                else:
                    await page.keyboard.type(action.value)
                    
            elif action.type == "scroll":
                if action.coordinates:
                    await page.mouse.wheel(action.coordinates.get("deltaX", 0), action.coordinates.get("deltaY", 100))
                else:
                    await page.evaluate("window.scrollBy(0, 100)")
                    
            elif action.type == "screenshot":
                screenshot = await page.screenshot()
                result["screenshot"] = base64.b64encode(screenshot).decode()
                
            elif action.type == "wait":
                await asyncio.sleep(float(action.value or 1))
                
            elif action.type == "press":
                await page.keyboard.press(action.value)
                
            elif action.type == "evaluate":
                result["value"] = await page.evaluate(action.value)
                
            # Get current page info
            result["page_info"] = {
                "url": page.url,
                "title": await page.title(),
                "viewport": page.viewport_size
            }
            
        except Exception as e:
            result["success"] = False
            result["error"] = str(e)
            logger.error(f"Error executing action {action.type}: {e}")
            
        return result
        
    async def get_page_content(self, session_id: str) -> Dict[str, Any]:
        """Get current page content and interactive elements"""
        session = self.sessions.get(session_id)
        if not session or session.status != "ready":
            raise ValueError(f"Session {session_id} not ready")
            
        page = session.page
        
        # Get interactive elements
        elements = await page.evaluate("""
            () => {
                const elements = [];
                const selectors = ['a', 'button', 'input', 'select', 'textarea', '[onclick]', '[role="button"]'];
                
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach((el, index) => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            elements.push({
                                type: el.tagName.toLowerCase(),
                                selector: `${selector}:nth-of-type(${index + 1})`,
                                text: el.textContent?.trim().substring(0, 50),
                                value: el.value,
                                position: {
                                    x: rect.x + rect.width / 2,
                                    y: rect.y + rect.height / 2
                                },
                                attributes: {
                                    href: el.href,
                                    placeholder: el.placeholder,
                                    type: el.type
                                }
                            });
                        }
                    });
                });
                
                return elements;
            }
        """)
        
        return {
            "url": page.url,
            "title": await page.title(),
            "elements": elements,
            "text_content": await page.evaluate("() => document.body.innerText"),
            "timestamp": datetime.now().isoformat()
        }

# Create service instance
vnc_service = VNCBrowserService()

# Create FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await vnc_service.initialize()
    yield
    # Shutdown
    await vnc_service.cleanup()

app = FastAPI(title="VNC Browser Service", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/vnc-browser/create")
async def create_browser_session(request: CreateSessionRequest):
    """Create a new browser session with VNC streaming"""
    try:
        session_id = str(uuid.uuid4())
        session = await vnc_service.create_session(session_id, request.task, request.resolution)
        
        return {
            "session_id": session_id,
            "vnc_port": session.vnc_port,
            "vnc_password": session.vnc_password,
            "display_num": session.display_num,
            "status": session.status,
            "websocket_url": f"ws://localhost:8003/ws/vnc/{session_id}",
            "vnc_url": f"vnc://localhost:{session.vnc_port}"
        }
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vnc-browser/action/{session_id}")
async def execute_browser_action(session_id: str, action: BrowserAction):
    """Execute an action in the browser"""
    try:
        result = await vnc_service.execute_action(session_id, action)
        return result
    except Exception as e:
        logger.error(f"Error executing action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vnc-browser/content/{session_id}")
async def get_browser_content(session_id: str):
    """Get current page content and interactive elements"""
    try:
        content = await vnc_service.get_page_content(session_id)
        return content
    except Exception as e:
        logger.error(f"Error getting content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/vnc-browser/session/{session_id}")
async def close_browser_session(session_id: str):
    """Close a browser session"""
    session = vnc_service.sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    await session.cleanup()
    del vnc_service.sessions[session_id]
    
    return {"message": "Session closed successfully"}

@app.websocket("/ws/vnc/{session_id}")
async def vnc_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time browser updates"""
    await websocket.accept()
    
    session = vnc_service.sessions.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return
        
    try:
        # Send initial connection info
        await websocket.send_json({
            "type": "connected",
            "session_id": session_id,
            "vnc_port": session.vnc_port,
            "status": session.status
        })
        
        # Handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "action":
                action = BrowserAction(**data.get("action", {}))
                result = await vnc_service.execute_action(session_id, action)
                await websocket.send_json({
                    "type": "action_result",
                    "result": result
                })
            elif data.get("type") == "get_content":
                content = await vnc_service.get_page_content(session_id)
                await websocket.send_json({
                    "type": "content",
                    "content": content
                })
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})

@app.get("/api/vnc-browser/sessions")
async def list_sessions():
    """List all active sessions"""
    sessions = []
    for session_id, session in vnc_service.sessions.items():
        sessions.append({
            "session_id": session_id,
            "status": session.status,
            "created_at": session.created_at.isoformat(),
            "vnc_port": session.vnc_port
        })
    return {"sessions": sessions}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)