#!/bin/bash

echo "🚀 Starting Chromium Browser Backend Services"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.11 or higher.${NC}"
    exit 1
fi

# Navigate to browser-agent directory
cd browser-agent

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Setting up...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    playwright install chromium
    playwright install-deps chromium
else
    source venv/bin/activate
fi

# Check for API keys
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
    # Try to load from .env.local
    if [ -f "../.env.local" ]; then
        export $(grep -E '^(ANTHROPIC_API_KEY|OPENAI_API_KEY)=' ../.env.local | xargs)
    fi
    
    if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}❌ No API keys found!${NC}"
        echo "Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env.local file"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Environment ready${NC}"
echo ""

# Function to check if port is in use
check_port() {
    lsof -i :$1 &> /dev/null
    return $?
}

# Kill existing processes on ports
if check_port 8001; then
    echo "Killing existing process on port 8001..."
    lsof -ti:8001 | xargs kill -9 2>/dev/null
    sleep 1
fi

if check_port 8002; then
    echo "Killing existing process on port 8002..."
    lsof -ti:8002 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Start services in background
echo "Starting Browser Stream Service (port 8002)..."
python browser_stream_service.py &
STREAM_PID=$!

echo "Starting Browser Agent Service (port 8001)..."
python browser_agent_service.py &
AGENT_PID=$!

echo ""
echo -e "${GREEN}✅ Browser backend services started!${NC}"
echo ""
echo "Service URLs:"
echo "  - Browser Agent API: http://localhost:8001"
echo "  - Browser Stream WebSocket: ws://localhost:8002"
echo ""
echo "Process IDs:"
echo "  - Stream Service: $STREAM_PID"
echo "  - Agent Service: $AGENT_PID"
echo ""
echo "To stop services, press Ctrl+C or run:"
echo "  kill $STREAM_PID $AGENT_PID"
echo ""
echo -e "${YELLOW}Monitoring logs...${NC}"

# Function to handle cleanup
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $STREAM_PID $AGENT_PID 2>/dev/null
    exit 0
}

# Set up trap for clean shutdown
trap cleanup INT TERM

# Wait for processes
wait