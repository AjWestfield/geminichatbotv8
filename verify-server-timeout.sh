#!/bin/bash

echo "=== Verifying Server Timeout Configuration ==="
echo ""
echo "Testing if server accepts requests longer than 30 seconds..."
echo ""

# Test with a long-running request using curl
echo "1. Testing /api/generate-image endpoint..."
time curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test image","model":"flux-kontext-max","size":"1024x1024"}' \
  -m 65 \
  -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  2>&1 | tail -10

echo ""
echo "2. Testing /api/chat endpoint..."
time curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"gemini-2.0-flash"}' \
  -m 65 \
  -w "\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  2>&1 | tail -10

echo ""
echo "=== RESULTS ==="
echo "If requests complete without 'Empty reply from server' at 30s, timeouts are fixed."
echo "If you see 'Empty reply' at exactly 30s, the server timeout is still active."