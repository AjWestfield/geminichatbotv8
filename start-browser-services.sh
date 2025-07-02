#!/bin/bash

# Start Browser Services for Research Feature

echo "🚀 Starting Browser Services for Research Feature..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "browser-agent" ]; then
    echo -e "${RED}Error: browser-agent directory not found!${NC}"
    echo "Please run this script from the geminichatbotv7 directory."
    exit 1
fi

cd browser-agent

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import playwright" 2>/dev/null; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    playwright install chromium
fi

# Kill any existing services on ports 8001 and 8002
echo -e "${YELLOW}Checking for existing services...${NC}"
lsof -ti:8001 | xargs -r kill -9 2>/dev/null
lsof -ti:8002 | xargs -r kill -9 2>/dev/null

# Start services in background
echo -e "${GREEN}Starting Browser Agent Service on port 8001...${NC}"
python browser_agent_service.py > agent.log 2>&1 &
AGENT_PID=$!

echo -e "${GREEN}Starting Browser Stream Service on port 8002...${NC}"
python browser_stream_service.py > stream.log 2>&1 &
STREAM_PID=$!

# Wait a moment for services to start
sleep 3

# Check if services are running
if kill -0 $AGENT_PID 2>/dev/null && kill -0 $STREAM_PID 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✅ Both services started successfully!${NC}"
    echo ""
    echo "Browser Agent Service: http://localhost:8001 (PID: $AGENT_PID)"
    echo "Browser Stream Service: ws://localhost:8002 (PID: $STREAM_PID)"
    echo ""
    echo "Logs are available at:"
    echo "  - browser-agent/agent.log"
    echo "  - browser-agent/stream.log"
    echo ""
    echo -e "${YELLOW}To stop services, run:${NC}"
    echo "  kill $AGENT_PID $STREAM_PID"
    echo ""
    echo -e "${GREEN}You can now use the Research feature in your app!${NC}"
else
    echo -e "${RED}❌ Failed to start services. Check the log files for errors.${NC}"
    exit 1
fi
