"""
Demo: Embedded Browser Deep Research
"""
import asyncio
import aiohttp
import time
import webbrowser

async def demo_deep_research():
    """Demonstrate the embedded browser deep research feature"""
    
    print("🎉 Embedded Browser Deep Research Demo")
    print("=" * 50)
    
    # Simple query for demo
    session_id = f"demo-{int(time.time())}"
    query = "What is the weather today in San Francisco?"
    
    print(f"\n📝 Research Query: {query}")
    print(f"🆔 Session ID: {session_id}")
    
    async with aiohttp.ClientSession() as session:
        # Start the research
        print("\n🔬 Starting AI-powered browser research...")
        
        async with session.post(
            "http://localhost:8001/api/browser/start-integrated-research",
            json={
                "sessionId": session_id,
                "query": query
            }
        ) as resp:
            if resp.status == 200:
                result = await resp.json()
                
                print("\n✅ Research Complete!")
                print(f"\n📊 Result: {result.get('result', 'No result')[:200]}...")
                
                # Show browser URL
                browser_url = f"http://localhost:3000/canvas?session={session_id}"
                print(f"\n📺 View Browser Automation:")
                print(f"   {browser_url}")
                
                # Open in browser
                print("\n🌐 Opening browser view...")
                webbrowser.open(browser_url)
                
                print("\n💡 What you'll see:")
                print("   1. Canvas view will open")
                print("   2. Click on 'Browser' tab")
                print("   3. Watch AI navigate in real-time!")
                print("   4. No external browser windows!")
                
            else:
                print(f"\n❌ Error: {await resp.text()}")
                print("\n⚠️  Make sure both services are running:")
                print("   1. python browser_stream_service.py")
                print("   2. python browser_agent_service.py")

if __name__ == "__main__":
    print("\n🚀 Make sure services are running before starting demo!")
    input("Press Enter to continue...")
    
    asyncio.run(demo_deep_research())
