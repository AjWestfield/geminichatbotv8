#!/bin/bash

echo "🚀 Running Video Fix E2E Tests (Headless)"
echo "========================================"
echo ""

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Error: App is not running on http://localhost:3000"
    echo "Please start your dev server first with: npm run dev"
    exit 1
fi

echo "✅ App is running on port 3000"
echo ""

# Run the tests in headless mode
echo "Running E2E tests in headless mode..."
npx playwright test tests/e2e/video-analyze-fix.spec.ts --reporter=line

# Store exit code
TEST_RESULT=$?

echo ""
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ SUCCESS! All video E2E tests passed!"
    echo ""
    echo "The video analyze and reverse engineer functionality is working correctly."
    echo "Screenshots saved to test-results/"
else
    echo "❌ FAILED: Some tests did not pass"
    echo ""
    echo "Please check the error output above."
    echo "You can run './run-video-e2e-tests.sh' to see tests in headed mode."
fi

exit $TEST_RESULT
