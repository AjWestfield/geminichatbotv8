#!/bin/bash

# Enhanced Browser Use Service Startup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Enhanced Browser Use Service...${NC}"

# Check if we're in the right directory
if [ ! -f "enhanced_browser_use_service.py" ]; then
    echo -e "${RED}❌ Error: enhanced_browser_use_service.py not found${NC}"
    echo -e "${YELLOW}💡 Make sure you're in the browser-agent directory${NC}"
    exit 1
fi

# Check API keys
echo -e "${BLUE}🔑 Checking API keys...${NC}"

# Load environment variables
if [ -f "../.env.local" ]; then
    source ../.env.local
fi

has_openai=false
has_anthropic=false
has_gemini=false

if [ ! -z "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}   ✅ OpenAI API Key found${NC}"
    has_openai=true
fi

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}   ✅ Anthropic API Key found${NC}"
    has_anthropic=true
fi

if [ ! -z "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}   ✅ Gemini API Key found${NC}"
    has_gemini=true
fi

if [ "$has_openai" = false ] && [ "$has_anthropic" = false ] && [ "$has_gemini" = false ]; then
    echo -e "${RED}   ❌ No API keys found${NC}"
    echo -e "${YELLOW}   💡 Please set up API keys in .env.local${NC}"
    echo -e "${YELLOW}   💡 Required: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY${NC}"
    exit 1
fi

# Check dependencies
echo -e "${BLUE}📦 Checking dependencies...${NC}"

python -c "import browser_use" 2>/dev/null && echo -e "${GREEN}   ✅ browser-use installed${NC}" || {
    echo -e "${RED}   ❌ browser-use not installed${NC}"
    echo -e "${YELLOW}   💡 Run: pip install browser-use${NC}"
    exit 1
}

python -c "import playwright" 2>/dev/null && echo -e "${GREEN}   ✅ playwright installed${NC}" || {
    echo -e "${RED}   ❌ playwright not installed${NC}"
    echo -e "${YELLOW}   💡 Run: pip install playwright && playwright install${NC}"
    exit 1
}

# Kill any existing processes on port 8001
echo -e "${BLUE}🔧 Cleaning up port 8001...${NC}"
lsof -ti:8001 | xargs -r kill -9 2>/dev/null || true

# Wait a moment
sleep 1

# Start the enhanced service
echo -e "${GREEN}🚀 Starting Enhanced Browser Use Service...${NC}"
echo -e "${BLUE}📡 API: http://localhost:8001${NC}"
echo -e "${BLUE}🤖 Browser Use: Enabled${NC}"
echo -e "${BLUE}🔗 Health: http://localhost:8001/health${NC}"
echo -e "${BLUE}🔗 Browser Use API: http://localhost:8001/api/browser-use/execute${NC}"
echo -e "${BLUE}🛑 Press Ctrl+C to stop${NC}"
echo ""

# Start the service
python enhanced_browser_use_service.py
