"""
Final integration test - Deep Research with Embedded Browser View
"""
import asyncio
import aiohttp
import json
import time

async def test_complete_integration():
    """Test the complete deep research flow"""
    
    print("🚀 Testing Complete Deep Research Integration")
    print("=" * 50)
    
    session_id = f"deep-research-{int(time.time())}"
    query = "What are the latest AI developments in December 2024?"
    
    async with aiohttp.ClientSession() as session:
        # 1. Test browser streaming service
        print("\n1️⃣ Testing Browser Streaming Service...")
        async with session.get("http://localhost:8002/api/browser/sessions") as resp:
            if resp.status == 200:
                print("   ✅ Browser streaming service is running")
            else:
                print("   ❌ Browser streaming service is NOT running")
                return
                
        # 2. Test agent service
        print("\n2️⃣ Testing Agent Service...")
        async with session.get("http://localhost:8001/health") as resp:
            if resp.status == 200:
                data = await resp.json()
                print(f"   ✅ Agent service is running (v{data.get('version')})")
            else:
                print("   ❌ Agent service is NOT running")
                return
                
        # 3. Start integrated research
        print(f"\n3️⃣ Starting Deep Research...")
        print(f"   📝 Query: {query}")
        print(f"   🆔 Session: {session_id}")
        
        start_time = time.time()
        async with session.post(
            "http://localhost:8001/api/browser/start-integrated-research",
            json={
                "sessionId": session_id,
                "query": query
            }
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                elapsed = time.time() - start_time
                
                print(f"\n   ✅ Research completed in {elapsed:.1f} seconds!")
                print(f"\n4️⃣ Research Results:")
                print(f"   {'-' * 40}")
                print(f"   {result.get('result', 'No results')[:200]}...")
                
                if result.get('actionHistory'):
                    print(f"\n5️⃣ AI Browser Actions ({len(result['actionHistory'])} total):")
                    for i, action in enumerate(result['actionHistory'][:5]):
                        print(f"   {i+1}. {action.get('action', 'unknown')}: {action.get('thought', '')[:60]}...")
                        
                print(f"\n6️⃣ Browser Streaming:")
                print(f"   🔗 WebSocket URL: {result.get('streamUrl')}")
                print(f"   📺 View in browser: http://localhost:3000/canvas?session={session_id}")
                
            else:
                error = await resp.text()
                print(f"   ❌ Research failed: {error}")
                
        # 4. Check frame capture
        print(f"\n7️⃣ Checking Frame Capture...")
        async with session.get("http://localhost:8002/api/browser/sessions") as resp:
            sessions_data = await resp.json()
            for s in sessions_data.get('sessions', []):
                if s['sessionId'] == session_id:
                    print(f"   📸 Frames captured: {s['frameCount']}")
                    if s['frameCount'] > 0:
                        print(f"   ✅ Browser streaming is working!")
                    else:
                        print(f"   ⚠️  No frames captured (browser might have completed too quickly)")
                        
    print("\n" + "=" * 50)
    print("✅ Integration Test Complete!")
    print("\n📝 Next Steps:")
    print("1. Open http://localhost:3000 in your browser")
    print("2. Click the microscope icon (🔬) to enable deep research")
    print("3. Type a research query")
    print("4. Click on Canvas → Browser tab to see live automation")
    print(f"\n💡 Or open: http://localhost:3000/canvas?session={session_id}")
    
    return session_id

if __name__ == "__main__":
    session_id = asyncio.run(test_complete_integration())
