#!/usr/bin/env python3

import sys
import os
sys.path.append('/Users/andersonwestfield/Desktop/geminichatbotv7/browser-agent')

# Set environment variable
os.environ['ANTHROPIC_API_KEY'] = 'test-key'

try:
    # Import the problematic modules
    from browser_use import Agent
    print("✓ browser_use.Agent imported")
    
    from langchain_anthropic import ChatAnthropic
    print("✓ ChatAnthropic imported")
    
    from browser_use_stream_bridge import BrowserUseStreamBridge
    print("✓ BrowserUseStreamBridge imported")
    
    # Try to instantiate
    bridge = BrowserUseStreamBridge()
    print("✓ BrowserUseStreamBridge instantiated")
    
    # Check if there's a Screenshot import issue
    try:
        from browser_use import Screenshot
        print("✓ browser_use.Screenshot exists")
    except ImportError:
        print("✗ browser_use.Screenshot does not exist")
        
    # Check the browser_use module structure
    import browser_use
    print("\nbrowser_use module contents:")
    for attr in dir(browser_use):
        if not attr.startswith('_'):
            print(f"  - {attr}")
            
except Exception as e:
    print(f"\nError: {e}")
    import traceback
    traceback.print_exc()
