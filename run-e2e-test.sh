#!/bin/bash

echo "🧪 Running E2E tests for chat loading performance..."
echo ""

# Clean build
echo "1. Cleaning build directories..."
rm -rf .next node_modules/.cache

# Start dev server in background
echo -e "\n2. Starting dev server..."
npm run dev > dev-server.log 2>&1 &
DEV_PID=$!

# Wait for server to be ready
echo "   Waiting for server to start..."
MAX_ATTEMPTS=30
ATTEMPTS=0

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Dev server is ready!"
        break
    fi
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    echo -n "."
done

if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo "   ❌ Dev server failed to start"
    echo "   Check dev-server.log for errors"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

# Run E2E tests
echo -e "\n3. Running E2E tests..."
npx playwright test tests/e2e/chat-loading-performance.spec.ts --reporter=line

# Capture exit code
TEST_EXIT_CODE=$?

# Clean up
echo -e "\n4. Cleaning up..."
kill $DEV_PID 2>/dev/null

# Show results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed. Check the output above."
fi

echo -e "\nDev server logs:"
tail -20 dev-server.log

exit $TEST_EXIT_CODE