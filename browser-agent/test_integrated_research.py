"""
Test script to verify integrated browser streaming and AI control
"""
import asyncio
import aiohttp
import json

async def test_integrated_research():
    """Test the integrated research functionality"""
    
    session_id = "test-integrated-research"
    query = "What is the current weather in San Francisco?"
    
    print(f"Starting integrated research test...")
    print(f"Session ID: {session_id}")
    print(f"Query: {query}")
    
    # First, create a browser session in the streaming service
    async with aiohttp.ClientSession() as session:
        # Create streaming session
        print("\n1. Creating browser session with streaming...")
        async with session.post(
            "http://localhost:8002/api/browser/create-session",
            json={"sessionId": session_id, "url": "https://www.google.com"}
        ) as resp:
            result = await resp.json()
            print(f"Streaming session created: {result}")
        
        # Start integrated research
        print("\n2. Starting integrated research...")
        async with session.post(
            "http://localhost:8001/api/browser/start-integrated-research",
            json={
                "sessionId": session_id,
                "query": query
            }
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                print(f"Research result: {json.dumps(result, indent=2)}")
            else:
                error = await resp.text()
                print(f"Error: {error}")
        
        # Check session status
        print("\n3. Checking session status...")
        async with session.get(
            f"http://localhost:8001/api/browser/session/{session_id}"
        ) as resp:
            if resp.status == 200:
                status = await resp.json()
                print(f"Session status: {json.dumps(status, indent=2)}")
            else:
                print(f"Failed to get session status")

    print("\nTest complete!")
    print(f"Browser stream URL: ws://localhost:8002/ws/stream/{session_id}")
    print("You can connect to this WebSocket to see the browser in action")

if __name__ == "__main__":
    asyncio.run(test_integrated_research())
