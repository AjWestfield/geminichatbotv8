#!/bin/bash

echo "🧪 Running Video Analyze/Reverse Engineer E2E Tests"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if the app is running
echo "Checking if the app is running on port 3000..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ App is running on port 3000${NC}"
else
    echo -e "${RED}❌ App is not running on port 3000${NC}"
    echo ""
    echo "Please start your development server first:"
    echo "  npm run dev"
    echo "  or"
    echo "  ./start.sh"
    echo ""
    exit 1
fi

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo -e "${YELLOW}⚠️  Playwright not found. Installing...${NC}"
    npm install -D @playwright/test
    npx playwright install chromium
fi

# Create test results directory if it doesn't exist
mkdir -p test-results

# Run the E2E tests
echo ""
echo "Running E2E tests..."
echo ""

# Run with headed mode so we can see what's happening
npx playwright test tests/e2e/video-analyze-fix.spec.ts --headed --reporter=list

# Check test results
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All E2E tests passed!${NC}"
    echo ""
    echo "Screenshots saved to:"
    echo "  - test-results/video-analyze-success.png"
    echo "  - test-results/video-reverse-engineer-success.png"
    echo ""
    echo "The video analyze and reverse engineer functionality is working correctly!"
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Check the test output above for details."
    echo "Screenshots may have been saved to the test-results directory."
    echo ""
    echo "Common issues:"
    echo "  1. Make sure you've restarted the dev server after applying fixes"
    echo "  2. Check that the app compiled without errors"
    echo "  3. Ensure you have internet connection for downloading videos"
fi
