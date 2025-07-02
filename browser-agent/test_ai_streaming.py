"""
Simple test to verify AI browser control with streaming
"""
import asyncio
import aiohttp
import json
import time

async def test_ai_research_with_streaming():
    """Test AI research while monitoring browser stream"""
    
    session_id = f"test-ai-{int(time.time())}"
    query = "What is 2 + 2?"  # Simple query for testing
    
    print(f"Starting AI research test with streaming...")
    print(f"Session ID: {session_id}")
    print(f"Query: {query}")
    
    async with aiohttp.ClientSession() as session:
        # 1. Start integrated research (this creates browser session and starts AI)
        print("\n1. Starting integrated research with AI control...")
        async with session.post(
            "http://localhost:8001/api/browser/start-integrated-research",
            json={
                "sessionId": session_id,
                "query": query
            }
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                print(f"Research started successfully!")
                print(f"Stream URL: {result.get('streamUrl')}")
                print(f"\nAI Research Result: {result.get('result')}")
                
                # Print action history
                if result.get('actionHistory'):
                    print(f"\nAI Actions taken ({len(result['actionHistory'])} total):")
                    for i, action in enumerate(result['actionHistory'][:5]):  # First 5 actions
                        print(f"  {i+1}. {action.get('action')}: {action.get('thought', 'No thought')}")
            else:
                error = await resp.text()
                print(f"Error: {error}")
                return
                
        # 2. Check browser sessions to verify streaming is active
        print("\n2. Checking browser streaming sessions...")
        async with session.get("http://localhost:8002/api/browser/sessions") as resp:
            sessions = await resp.json()
            for s in sessions.get('sessions', []):
                if s['sessionId'] == session_id:
                    print(f"  - Session {session_id}: {s['frameCount']} frames captured")
                    
    print(f"\n✅ Test complete!")
    print(f"📺 To see the browser in action, open test-browser-stream.html")
    print(f"   and change the sessionId to: {session_id}")
    return session_id

if __name__ == "__main__":
    session_id = asyncio.run(test_ai_research_with_streaming())
    print(f"\nSession ID for viewing: {session_id}")
