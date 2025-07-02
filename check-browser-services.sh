#!/bin/bash

# Check Browser Services Status

echo "🔍 Checking Browser Services Status..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Browser Agent Service (port 8001)
if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Browser Agent Service (8001): Running${NC}"
    curl -s http://localhost:8001/health | python3 -m json.tool
else
    echo -e "${RED}❌ Browser Agent Service (8001): Not running${NC}"
fi

echo ""

# Check Browser Stream Service (port 8002)
if curl -s -f http://localhost:8002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Browser Stream Service (8002): Running${NC}"
    curl -s http://localhost:8002/health | python3 -m json.tool
else
    echo -e "${RED}❌ Browser Stream Service (8002): Not running${NC}"
fi

echo ""

# Check for Python processes
echo "Python processes:"
ps aux | grep -E "browser_(agent|stream)_service.py" | grep -v grep || echo "  None found"

echo ""
echo "To start services, run: ./start-browser-services.sh"
