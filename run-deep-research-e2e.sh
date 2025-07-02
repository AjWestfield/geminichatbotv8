#!/bin/bash

# E2E Test Runner for Deep Research Browser Integration
# This script starts all necessary services and runs the E2E test

echo "🧪 Running Deep Research Browser E2E Test"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    
    # Kill browser-use backend if we started it
    if [ ! -z "$BROWSER_USE_PID" ]; then
        echo "Stopping browser-use backend (PID: $BROWSER_USE_PID)..."
        kill $BROWSER_USE_PID 2>/dev/null
    fi
    
    # Kill Next.js if we started it
    if [ ! -z "$NEXTJS_PID" ]; then
        echo "Stopping Next.js (PID: $NEXTJS_PID)..."
        kill $NEXTJS_PID 2>/dev/null
    fi
    
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Step 1: Check prerequisites
echo "1️⃣  Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found. Copy .env.example to .env.local and add your API keys.${NC}"
    exit 1
fi

# Check ANTHROPIC_API_KEY
if ! grep -q "ANTHROPIC_API_KEY=" .env.local || grep -q "ANTHROPIC_API_KEY=your-" .env.local; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY not set in .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Step 2: Start browser-use backend if not running
echo -e "\n2️⃣  Checking browser-use backend..."

if check_port 8002; then
    echo -e "${GREEN}✅ Browser-use backend already running on port 8002${NC}"
else
    echo "Starting browser-use backend..."
    
    # Start in background and capture PID
    ./start-browser-use.sh > browser-use.log 2>&1 &
    BROWSER_USE_PID=$!
    
    echo "Waiting for browser-use backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8002/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Browser-use backend started (PID: $BROWSER_USE_PID)${NC}"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if ! check_port 8002; then
        echo -e "${RED}❌ Failed to start browser-use backend${NC}"
        echo "Check browser-use.log for errors"
        exit 1
    fi
fi

# Step 3: Install dependencies if needed
echo -e "\n3️⃣  Checking npm dependencies..."

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install --legacy-peer-deps
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/.cache/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    npx playwright install chromium
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"

# Step 4: Run the E2E test
echo -e "\n4️⃣  Running E2E test..."
echo "================================"

# Set environment variables
export SKIP_WEBSERVER=false
export BASE_URL=http://localhost:3000

# Run the specific test
npx playwright test tests/e2e/deep-research-browser.spec.ts --reporter=list

# Capture test result
TEST_RESULT=$?

# Step 5: Show results
echo ""
echo "================================"
if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ E2E Test Passed!${NC}"
    echo ""
    echo "The Deep Research browser integration is working correctly!"
    echo ""
    echo "You can now:"
    echo "1. Run 'npm run dev' to start the app"
    echo "2. Click the 🔍 icon to activate Deep Research"
    echo "3. Type a query and watch the AI browse!"
else
    echo -e "${RED}❌ E2E Test Failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check browser-use.log for backend errors"
    echo "2. Run 'npx playwright show-report' to see detailed test results"
    echo "3. Check if all services are running correctly"
    echo ""
    echo "Common issues:"
    echo "- Port 8002 might be blocked"
    echo "- ANTHROPIC_API_KEY might not be set correctly"
    echo "- Python dependencies might be missing"
fi

echo ""
echo "Test artifacts saved in:"
echo "- test-results/ (screenshots, videos)"
echo "- playwright-report/ (HTML report)"
echo "- browser-use.log (backend logs)"

exit $TEST_RESULT