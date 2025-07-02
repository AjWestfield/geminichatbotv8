"""
Browser Agent Service - Main API with integrated streaming
"""
import os
import asyncio
import uuid
import logging
import socket
import subprocess
import signal
import sys
from typing import Dict, Optional, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from enhanced_browser_agent import EnhancedBrowserAgent
from integrated_browser_agent import integrated_agent_service
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env.local')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def is_port_in_use(port: int) -> bool:
    """Check if a port is currently in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except OSError:
            return True

def kill_processes_on_port(port: int) -> bool:
    """Kill all processes using the specified port"""
    try:
        # Find processes using the port
        result = subprocess.run(
            ['lsof', '-ti', f':{port}'],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0 and result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            logger.info(f"Found {len(pids)} processes using port {port}: {pids}")

            for pid in pids:
                if pid.strip():
                    try:
                        # Try graceful termination first
                        os.kill(int(pid), signal.SIGTERM)
                        logger.info(f"Sent SIGTERM to process {pid}")
                    except (ProcessLookupError, ValueError):
                        logger.warning(f"Process {pid} not found or invalid")

            # Wait a moment for graceful shutdown
            import time
            time.sleep(2)

            # Force kill any remaining processes
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode == 0 and result.stdout.strip():
                remaining_pids = result.stdout.strip().split('\n')
                for pid in remaining_pids:
                    if pid.strip():
                        try:
                            os.kill(int(pid), signal.SIGKILL)
                            logger.info(f"Force killed process {pid}")
                        except (ProcessLookupError, ValueError):
                            logger.warning(f"Process {pid} not found or invalid")

            return True
    except Exception as e:
        logger.error(f"Error killing processes on port {port}: {e}")
        return False

    return False

def find_available_port(start_port: int = 8001, max_attempts: int = 10) -> int:
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"No available ports found in range {start_port}-{start_port + max_attempts}")

def cleanup_and_prepare_port(preferred_port: int = 8001) -> int:
    """Clean up port conflicts and return an available port"""
    logger.info(f"Preparing port {preferred_port}...")

    if is_port_in_use(preferred_port):
        logger.warning(f"Port {preferred_port} is in use, attempting cleanup...")

        # Try to kill processes using the port
        if kill_processes_on_port(preferred_port):
            # Wait a moment and check again
            import time
            time.sleep(1)

            if not is_port_in_use(preferred_port):
                logger.info(f"Successfully freed port {preferred_port}")
                return preferred_port

        # If cleanup failed, find an alternative port
        logger.warning(f"Could not free port {preferred_port}, finding alternative...")
        alternative_port = find_available_port(preferred_port + 1)
        logger.info(f"Using alternative port {alternative_port}")
        return alternative_port

    logger.info(f"Port {preferred_port} is available")
    return preferred_port

# Initialize FastAPI app
app = FastAPI(title="Browser Agent Service", version="2.0")

# Request/Response models
class StartResearchRequest(BaseModel):
    query: str
    sessionId: Optional[str] = None
    enableStreaming: bool = True
    llm: str = "claude-sonnet-4-20250514"

class ResearchSession(BaseModel):
    sessionId: str
    query: str
    status: str
    streamUrl: Optional[str] = None
    startedAt: datetime
    result: Optional[str] = None

# Global state
research_sessions: Dict[str, ResearchSession] = {}
browser_agent = EnhancedBrowserAgent()

@app.post("/api/browser/start-integrated-research")
async def start_integrated_research(request: StartResearchRequest):
    """Start integrated research with unified browser control and streaming"""
    session_id = request.sessionId or str(uuid.uuid4())

    try:
        # Use the enhanced browser agent for integrated research
        result = await browser_agent.research_with_streaming(
            query=request.query,
            session_id=session_id,
            llm=request.llm
        )

        # Update session tracking
        session = ResearchSession(
            sessionId=session_id,
            query=request.query,
            status="completed",
            startedAt=datetime.now(),
            streamUrl=result.get('streamUrl'),
            result=result.get('result')
        )
        research_sessions[session_id] = session

        return result

    except Exception as e:
        logger.error(f"Integrated research error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/research-progress/{session_id}")
async def research_progress_stream(websocket: WebSocket, session_id: str):
    """Stream research progress in real-time"""
    await websocket.accept()

    try:
        # Get the agent
        agent = integrated_agent_service.get_agent(session_id)
        if not agent:
            await websocket.send_json({
                "type": "error",
                "message": "No active research session"
            })
            await websocket.close()
            return

        # Stream existing history
        for action in agent.action_history:
            await websocket.send_json({
                "type": "history",
                "data": action
            })

        # Keep connection for future updates
        last_count = len(agent.action_history)
        while True:
            await asyncio.sleep(0.5)

            # Check for new actions
            current_count = len(agent.action_history)
            if current_count > last_count:
                # Send new actions
                for action in agent.action_history[last_count:]:
                    await websocket.send_json({
                        "type": "action",
                        "data": action
                    })
                last_count = current_count

            # Check if research is complete
            session = research_sessions.get(session_id)
            if session and session.status == "completed":
                await websocket.send_json({
                    "type": "complete",
                    "result": session.result
                })
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Progress stream error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })

@app.post("/api/browser/start-session")
async def start_research_session(request: StartResearchRequest):
    """Start a new browser research session with streaming"""
    session_id = request.sessionId or str(uuid.uuid4())

    # Create session record
    session = ResearchSession(
        sessionId=session_id,
        query=request.query,
        status="starting",
        startedAt=datetime.now(),
        streamUrl=f"ws://localhost:8002/ws/stream/{session_id}" if request.enableStreaming else None
    )
    research_sessions[session_id] = session

    # Start research in background
    asyncio.create_task(run_research(session_id, request.query))

    return {
        "sessionId": session_id,
        "streamUrl": session.streamUrl,
        "status": "started"
    }

async def run_research(session_id: str, query: str):
    """Run research task in background"""
    session = research_sessions.get(session_id)
    if not session:
        return

    try:
        session.status = "researching"
        result = await browser_agent.research_with_streaming(
            query=query,
            session_id=session_id
        )
        session.result = result.get('result')
        session.status = "completed"
    except Exception as e:
        session.status = "error"
        session.result = str(e)

@app.websocket("/ws/browser-agent")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for browser agent communication"""
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "research":
                # Start research with streaming
                request = StartResearchRequest(
                    query=data.get("query", ""),
                    enableStreaming=True
                )

                response = await start_research_session(request)

                await websocket.send_json({
                    "type": "research_started",
                    "data": response
                })

                # Monitor progress
                session_id = response["sessionId"]
                while True:
                    session = research_sessions.get(session_id)
                    if session and session.status in ["completed", "error"]:
                        await websocket.send_json({
                            "type": "research_complete",
                            "data": {
                                "sessionId": session_id,
                                "status": session.status,
                                "result": session.result
                            }
                        })
                        break
                    await asyncio.sleep(1)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })

@app.get("/api/browser/session/{session_id}")
async def get_session_status(session_id: str):
    """Get status of a research session"""
    session = research_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "sessionId": session.sessionId,
        "query": session.query,
        "status": session.status,
        "startedAt": session.startedAt.isoformat(),
        "streamUrl": session.streamUrl,
        "result": session.result
    }

@app.get("/api/browser/sessions")
async def list_all_sessions():
    """List all research sessions"""
    return {
        "sessions": [
            {
                "sessionId": s.sessionId,
                "query": s.query,
                "status": s.status,
                "startedAt": s.startedAt.isoformat()
            }
            for s in research_sessions.values()
        ]
    }

class ExecuteActionRequest(BaseModel):
    session_id: str
    action: Dict[str, Any]

class CommandRequest(BaseModel):
    session_id: str
    command: str
    type: str = "natural-language"
    stream: bool = True

@app.post("/api/execute")
async def execute_browser_action(request: ExecuteActionRequest):
    """Execute a browser action for the frontend browser agent service"""
    try:
        session_id = request.session_id
        action = request.action

        logger.info(f"Executing action for session {session_id}: {action}")

        # For now, we'll simulate action execution
        # In a full implementation, this would integrate with the browser automation
        action_type = action.get('type', 'unknown')

        if action_type == 'navigate':
            url = action.get('value', 'https://www.google.com')
            result = {
                "success": True,
                "action": action_type,
                "url": url,
                "message": f"Navigated to {url}"
            }
        elif action_type == 'click':
            target = action.get('target', 'unknown')
            result = {
                "success": True,
                "action": action_type,
                "target": target,
                "message": f"Clicked on {target}"
            }
        elif action_type == 'type':
            value = action.get('value', '')
            target = action.get('target', 'input field')
            result = {
                "success": True,
                "action": action_type,
                "value": value,
                "target": target,
                "message": f"Typed '{value}' into {target}"
            }
        elif action_type == 'wait':
            duration = action.get('value', '1000')
            result = {
                "success": True,
                "action": action_type,
                "duration": duration,
                "message": f"Waited for {duration}ms"
            }
        elif action_type == 'extract':
            target = action.get('target', 'page content')
            result = {
                "success": True,
                "action": action_type,
                "target": target,
                "message": f"Extracted content from {target}",
                "data": "Sample extracted content"
            }
        elif action_type == 'screenshot':
            result = {
                "success": True,
                "action": action_type,
                "message": "Screenshot captured",
                "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            }
        else:
            result = {
                "success": False,
                "error": f"Unsupported action type: {action_type}"
            }

        return result

    except Exception as e:
        logger.error(f"Error executing action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/command")
async def process_browser_command(request: CommandRequest):
    """Process a natural language browser command and stream the response"""
    try:
        session_id = request.session_id
        command = request.command
        command_type = request.type

        logger.info(f"Processing command for session {session_id}: {command}")

        # For now, we'll simulate command processing with streaming response
        # In a full implementation, this would integrate with the browser automation and AI

        import json
        import asyncio

        async def generate_response():
            # Simulate processing steps
            steps = [
                {"type": "status", "message": "Processing command...", "step": 1, "total": 4},
                {"type": "action", "message": f"Parsing command: '{command}'", "step": 2, "total": 4},
                {"type": "action", "message": "Executing browser actions...", "step": 3, "total": 4},
                {"type": "result", "message": f"Command '{command}' completed successfully", "step": 4, "total": 4, "data": {"success": True, "command": command}}
            ]

            for step in steps:
                # Format as Server-Sent Events
                yield f"data: {json.dumps(step)}\n\n"
                await asyncio.sleep(1)  # Simulate processing time

            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )

    except Exception as e:
        logger.error(f"Error processing command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "browser-agent",
        "timestamp": datetime.now().isoformat(),
        "sessions_active": len(research_sessions)
    }

if __name__ == "__main__":
    print("🚀 Starting Enhanced Browser Agent Service...")

    # Clean up and prepare port
    try:
        # Check if port is specified via environment variable (from startup script)
        env_port = os.getenv('BROWSER_AGENT_PORT')
        preferred_port = int(env_port) if env_port else 8001

        port = cleanup_and_prepare_port(preferred_port)
        print(f"📡 Main API: http://localhost:{port}")
        print("📡 Stream Service: http://localhost:8002")
        print("⚠️  Make sure to start browser_stream_service.py separately!")

        # Add CORS middleware with the actual port
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "http://localhost:3000",
                f"http://localhost:{port}",
                "http://127.0.0.1:3000",
                f"http://127.0.0.1:{port}"
            ],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        print(f"✅ Starting server on port {port}...")
        print(f"🔗 Health check: http://localhost:{port}/health")
        print(f"🔗 Execute API: http://localhost:{port}/api/execute")
        print(f"🔗 Command API: http://localhost:{port}/api/command")
        print("🛑 Press Ctrl+C to stop the service")

        uvicorn.run(app, host="0.0.0.0", port=port)

    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        print(f"❌ Error: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Check if any processes are using ports 8001-8010")
        print("2. Try running: lsof -i :8001")
        print("3. Kill conflicting processes: kill -9 <PID>")
        print("4. Use the startup script: ./start_browser_agent.sh")
        sys.exit(1)
