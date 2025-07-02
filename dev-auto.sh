#!/bin/bash

# Enhanced development script with automatic browser service management
# The browser service will be managed by the Next.js app automatically

echo "🚀 Starting GeminiChatbot v7 with Auto-Managed Browser Service..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Check if we need to use nvm
if [[ ! "$NODE_VERSION" =~ ^v(1[89]|2[0-9]|[3-9][0-9]) ]]; then
    echo -e "${YELLOW}⚠️  Node.js 18+ required. Current version: $NODE_VERSION${NC}"
    
    # Try to use nvm
    if [ -f "$HOME/.nvm/nvm.sh" ]; then
        echo "🔄 Switching to Node 20 using nvm..."
        source "$HOME/.nvm/nvm.sh"
        nvm use 20
        NODE_VERSION=$(node --version)
        echo "📦 Now using Node.js: $NODE_VERSION"
    else
        echo -e "${RED}❌ Please install Node.js 18+ or nvm${NC}"
        exit 1
    fi
fi

# Check if Python environment exists
if [ -d "browser-agent/venv" ]; then
    echo -e "${GREEN}✅ Python virtual environment found${NC}"
else
    echo -e "${YELLOW}⚠️  Python virtual environment not found${NC}"
    echo "   To set up browser service:"
    echo "   cd browser-agent && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    
    # The browser service will be automatically stopped by the app
    echo "Browser service will stop automatically"
    
    # Kill any remaining processes
    jobs -p | xargs -r kill 2>/dev/null
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Start Next.js with auto browser service management
echo -e "${GREEN}Starting Next.js with automatic browser service management...${NC}"
echo ""
echo "The browser service will start automatically when needed!"
echo ""

# Export environment variable to enable auto-start
export AUTO_START_BROWSER_SERVICE=true

# Start Next.js
npm run dev:nextjs-only &
NEXTJS_PID=$!

# Wait for Next.js to start
echo "⏳ Waiting for Next.js to start..."
sleep 5

# Detect the port Next.js is running on
NEXTJS_PORT=$(lsof -ti:3000 >/dev/null 2>&1 && echo "3000" || echo "3001")

# Show status
echo ""
echo -e "${GREEN}✅ Application started successfully!${NC}"
echo ""
echo "📦 Services:"
echo "   - Next.js: http://localhost:$NEXTJS_PORT"
echo "   - Browser Service: Will start automatically when using Deep Research"
echo ""
echo "🔍 Deep Research Features:"
echo "   1. Click the 🔍 icon in the chat"
echo "   2. The browser service starts automatically"
echo "   3. Type your research query"
echo "   4. Watch the AI browse in real-time"
echo ""
echo "📊 Browser Service Status:"
echo "   - Check the status indicator in the bottom-right corner"
echo "   - Green = Running, Yellow = Starting"
echo "   - Service health checks run automatically"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep the script running
wait $NEXTJS_PID
