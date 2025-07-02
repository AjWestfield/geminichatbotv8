#!/bin/bash

echo "🔍 Testing Current Performance..."
echo ""

# Test 1: API Health Check
echo "1. Testing API response time..."
start_time=$(date +%s%3N)
curl -s -o /dev/null -w "   Response time: %{time_total}s\n" http://localhost:3000/api/health || echo "   ❌ API not responding"
end_time=$(date +%s%3N)

# Test 2: Check memory usage
echo ""
echo "2. Checking Node.js memory usage..."
ps aux | grep -E "node.*server" | grep -v grep | awk '{print "   Memory: " $4 "% CPU: " $3 "%"}'

# Test 3: Check port availability
echo ""
echo "3. Checking port status..."
lsof -i :3000 | grep LISTEN && echo "   ✅ Server is listening on port 3000" || echo "   ❌ No server on port 3000"

echo ""
echo "📊 Performance Summary:"
echo "   - If response time > 1s: Performance issue confirmed"
echo "   - If memory > 10%: High memory usage"
echo "   - If no server listening: Server crashed"
echo ""
echo "To fix performance issues:"
echo "1. Stop current server: pkill -f 'node.*server'"
echo "2. Run optimized server: ./start-optimized.sh"
