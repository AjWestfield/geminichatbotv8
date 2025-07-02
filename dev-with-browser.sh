#!/bin/bash

# Development script for GeminiChatbot v7

echo "🚀 Starting GeminiChatbot v7..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill Next.js
    if [ ! -z "$NEXTJS_PID" ]; then
        echo "Stopping Next.js (PID: $NEXTJS_PID)..."
        kill $NEXTJS_PID
    fi
    
    exit
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# Start Next.js
echo "Starting Next.js application..."
echo ""

# Start Next.js and capture its PID
npm run dev:nextjs-only &
NEXTJS_PID=$!

# Wait for Next.js to start
echo "Waiting for Next.js to start..."
NEXTJS_PORT=""
for i in {1..30}; do
    for port in 3000 3001 3100 3200; do
        if curl -s http://localhost:$port > /dev/null 2>&1; then
            NEXTJS_PORT=$port
            break 2
        fi
    done
    sleep 1
    echo -n "."
done
echo ""

# Success message
echo ""
if [ -z "$NEXTJS_PORT" ]; then
    echo -e "${YELLOW}⚠️  Warning: Could not detect Next.js port${NC}"
    echo "Please check the Next.js output above for the correct port"
else
    echo -e "${GREEN}✅ Application started successfully!${NC}"
    echo ""
    echo "📦 Services running:"
    echo "   - Next.js: http://localhost:$NEXTJS_PORT"
fi
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Keep the script running
wait $NEXTJS_PID