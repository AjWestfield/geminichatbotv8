#!/bin/bash

echo "🚀 Setting up Browser-use Agent for Deep Research"
echo "================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
cd browser-agent
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
playwright install chromium
playwright install-deps chromium

# Check for API keys
echo ""
echo "🔑 Checking API keys..."
if [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: No API keys found!"
    echo "   Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env.local file"
    echo "   The browser agent needs at least one LLM API key to function."
else
    echo "✅ API keys detected"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the browser agent service:"
echo "  cd browser-agent"
echo "  source venv/bin/activate"
echo "  python browser_agent_service.py"
echo ""
echo "Or using Docker:"
echo "  docker-compose -f docker-compose.browser.yml up browser-agent"
echo ""
