"""
Enhanced Browser Agent - Integrates custom browser AI with streaming capabilities
"""
import asyncio
import logging
from typing import Optional, Dict, Any
import aiohttp
from integrated_browser_agent import integrated_agent_service

logger = logging.getLogger(__name__)

class EnhancedBrowserAgent:
    """Browser agent with integrated streaming support"""
    
    def __init__(self, stream_service_url="http://localhost:8002"):
        self.stream_service_url = stream_service_url
        self.integrated_agent = integrated_agent_service
        
    async def research_with_streaming(
        self, 
        query: str, 
        session_id: str,
        llm=None,
        start_url: str = "https://www.google.com"
    ) -> Dict[str, Any]:
        """Run research task with browser streaming enabled"""
        
        try:
            # 1. Ensure browser session exists with streaming
            async with aiohttp.ClientSession() as session:
                # Check if session exists
                async with session.get(
                    f"{self.stream_service_url}/api/browser/sessions"
                ) as resp:
                    sessions_data = await resp.json()
                    session_exists = any(s['sessionId'] == session_id for s in sessions_data.get('sessions', []))
                
                # Create session if it doesn't exist
                if not session_exists:
                    async with session.post(
                        f"{self.stream_service_url}/api/browser/create-session",
                        json={"sessionId": session_id, "url": start_url}
                    ) as resp:
                        result = await resp.json()
                        logger.info(f"Created streaming session: {result}")
            
            # 2. Start integrated research (AI + streaming)
            research_result = await self.integrated_agent.start_research_session(
                session_id=session_id,
                query=query,
                llm=llm
            )
            
            return research_result
            
        except Exception as e:
            logger.error(f"Research error: {e}")
            raise
    
    async def stop_session(self, session_id: str):
        """Stop a browser session"""
        await self.integrated_agent.stop_session(session_id)
        
        # Also stop streaming session
        async with aiohttp.ClientSession() as session:
            async with session.delete(
                f"{self.stream_service_url}/api/browser/session/{session_id}"
            ) as resp:
                result = await resp.json()
                logger.info(f"Stopped session: {result}")
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get status of a research session"""
        agent = self.integrated_agent.get_agent(session_id)
        
        if agent:
            return {
                "active": True,
                "actionCount": len(agent.action_history),
                "lastAction": agent.action_history[-1] if agent.action_history else None
            }
        else:
            return {"active": False}

# Example usage
async def main():
    """Example of using the enhanced browser agent"""
    agent = EnhancedBrowserAgent()
    
    session_id = "test-integrated-session"
    query = "What are the latest developments in AI for December 2024?"
    
    try:
        # Start research with streaming
        result = await agent.research_with_streaming(
            query=query,
            session_id=session_id
        )
        
        print(f"Research completed: {result}")
        
    finally:
        # Clean up
        await agent.stop_session(session_id)

if __name__ == "__main__":
    asyncio.run(main())
