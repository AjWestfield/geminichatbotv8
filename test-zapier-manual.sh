#!/bin/bash

echo "================================"
echo " Zapier MCP Manual Test Script"
echo "================================"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -E "ZAPIER_MCP_SERVER_URL|ZAPIER_MCP_API_KEY" | xargs)
fi

echo "1. Testing raw MCP connection with curl..."
echo "URL: $ZAPIER_MCP_SERVER_URL"
echo "API Key: ${ZAPIER_MCP_API_KEY:0:20}..."
echo ""

echo "Sending initialize request..."
curl -X POST "$ZAPIER_MCP_SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $ZAPIER_MCP_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "1.0",
      "capabilities": {}
    },
    "id": 1
  }' \
  --max-time 10 \
  -v 2>&1 | grep -E "< HTTP|< |{" | head -20

echo ""
echo "2. Testing via API endpoints..."
echo ""

# Test generic MCP client
echo "Testing generic MCP client..."
curl -s http://localhost:3000/api/test-zapier 2>/dev/null | jq '.success, .error' 2>/dev/null || echo "Server not running"

echo ""

# Test Anthropic integration
echo "Testing Anthropic integration..."
curl -s http://localhost:3000/api/test-zapier-anthropic 2>/dev/null | jq '.success, .error' 2>/dev/null || echo "Server not running"

echo ""
echo "3. Quick diagnostics..."
echo ""

# Check if server is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Development server is running"
else
    echo "❌ Development server is not running (start with: npm run dev)"
fi

# Check environment variables
if [ -n "$ZAPIER_MCP_API_KEY" ]; then
    echo "✅ ZAPIER_MCP_API_KEY is set"
else
    echo "❌ ZAPIER_MCP_API_KEY is not set"
fi

if [ -n "$ZAPIER_MCP_SERVER_URL" ]; then
    echo "✅ ZAPIER_MCP_SERVER_URL is set"
else
    echo "❌ ZAPIER_MCP_SERVER_URL is not set"
fi

echo ""
echo "================================"
echo " Test Complete"
echo "================================"