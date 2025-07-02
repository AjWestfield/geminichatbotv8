#!/usr/bin/env python3

import sys
import os
import asyncio
sys.path.append('/Users/andersonwestfield/Desktop/geminichatbotv7/browser-agent')

# Set environment variable
os.environ['ANTHROPIC_API_KEY'] = 'test-key'

async def test_agent_run():
    try:
        from browser_use import Agent
        from langchain_anthropic import ChatAnthropic
        from browser_use_stream_bridge import BrowserUseStreamBridge
        
        # Create a mock LLM
        llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            anthropic_api_key="test-key",
            temperature=0.7
        )
        
        # Create bridge
        bridge = BrowserUseStreamBridge()
        
        # Try to create agent
        print("Creating agent...")
        agent = await bridge.create_agent(
            task="Test task",
            llm=llm
        )
        print("✓ Agent created successfully")
        
        # Check agent attributes
        print("\nAgent attributes:")
        for attr in dir(agent):
            if not attr.startswith('_'):
                print(f"  - {attr}")
                
    except Exception as e:
        print(f"\nError during agent creation: {e}")
        import traceback
        traceback.print_exc()

# Run the test
asyncio.run(test_agent_run())
