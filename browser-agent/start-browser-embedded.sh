#!/bin/bash

# Start the embedded browser service
echo "🖼️  Starting Embedded Browser Service..."
echo ""
echo "This mode runs the browser on the backend and streams"
echo "screenshots to display in your app's Browser tab."
echo ""

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Run setup-browser-use.sh first."
    exit 1
fi

# Check for required packages
python -c "import playwright" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing Playwright..."
    pip install playwright
    playwright install chromium --with-deps --no-shell
fi

# Start the embedded service
python browser_embedded_service.py