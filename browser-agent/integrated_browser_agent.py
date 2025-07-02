"""
Integrated Browser Agent Service - Combines streaming with AI browser control
"""
import asyncio
import logging
from typing import Optional, Dict, Any
import aiohttp
from datetime import datetime

from streaming_browser_agent import StreamingBrowserAgent

logger = logging.getLogger(__name__)

class IntegratedBrowserAgent:
    """Service that integrates browser streaming with AI agent control"""
    
    def __init__(self):
        self.active_agents: Dict[str, StreamingBrowserAgent] = {}
        self.browser_service = None  # Will be set when needed
        
    def _get_browser_service(self):
        """Get browser service instance (lazy loading)"""
        if self.browser_service is None:
            # Import here to avoid circular dependency
            from browser_stream_service import browser_service
            self.browser_service = browser_service
        return self.browser_service
        
    async def start_research_session(
        self, 
        session_id: str, 
        query: str,
        llm=None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """Start a research session with integrated streaming and AI control"""
        
        try:
            # 1. Create browser session if not exists
            browser_service = self._get_browser_service()
            
            # Ensure browser is initialized
            if browser_service.browser is None:
                logger.info("Browser not initialized, initializing now...")
                await browser_service.initialize()
            
            page = await browser_service.get_page_for_session(session_id)
            if not page:
                logger.info(f"Creating new browser session: {session_id}")
                page = await browser_service.create_session(session_id)
                
            # 2. Create AI agent with the streaming page
            # Don't pass llm parameter if it's a string - let the agent create its own
            if isinstance(llm, str) or llm is None:
                agent = StreamingBrowserAgent(page)
            else:
                agent = StreamingBrowserAgent(page, llm)
            self.active_agents[session_id] = agent
            
            # 3. Start research task
            logger.info(f"Starting research for session {session_id}: {query}")
            
            # Progress wrapper that includes streaming info
            async def enhanced_progress_callback(progress):
                # Add session info to progress
                progress['sessionId'] = session_id
                progress['streamUrl'] = f"ws://localhost:8002/ws/stream/{session_id}"
                
                if progress_callback:
                    await progress_callback(progress)
                    
                # Log progress
                logger.info(f"Progress: {progress}")
            
            # Run the research
            result = await agent.run(
                task=f"Research the following topic: {query}",
                progress_callback=enhanced_progress_callback
            )
            
            return {
                "sessionId": session_id,
                "query": query,
                "result": result,
                "actionHistory": agent.action_history,
                "streamUrl": f"ws://localhost:8002/ws/stream/{session_id}"
            }
            
        except Exception as e:
            logger.error(f"Error in research session: {e}")
            raise
    
    def get_agent(self, session_id: str) -> Optional[StreamingBrowserAgent]:
        """Get active agent for a session"""
        return self.active_agents.get(session_id)
    
    async def stop_session(self, session_id: str):
        """Stop a research session"""
        # Remove agent
        if session_id in self.active_agents:
            del self.active_agents[session_id]
            
        # Stop browser session
        browser_service = self._get_browser_service()
        await browser_service.stop_session(session_id)

# Create global instance
integrated_agent_service = IntegratedBrowserAgent()

# FastAPI endpoints to add to browser_agent_service.py
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel

class IntegratedResearchRequest(BaseModel):
    sessionId: str
    query: str
    llm: Optional[str] = "claude-sonnet-4-20250514"

async def start_integrated_research(request: IntegratedResearchRequest):
    """Start research with integrated streaming and AI control"""
    
    # This will control the same browser that's being streamed
    result = await integrated_agent_service.start_research_session(
        session_id=request.sessionId,
        query=request.query
    )
    
    return result

# WebSocket endpoint for real-time progress
async def research_progress_websocket(websocket: WebSocket, session_id: str):
    """WebSocket for real-time research progress"""
    await websocket.accept()
    
    try:
        agent = integrated_agent_service.get_agent(session_id)
        if not agent:
            await websocket.send_json({
                "type": "error",
                "message": "No active research session"
            })
            return
            
        # Send action history
        for action in agent.action_history:
            await websocket.send_json({
                "type": "action",
                "data": action
            })
            
        # Keep connection alive for future updates
        while True:
            await asyncio.sleep(1)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()
