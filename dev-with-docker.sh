#!/bin/bash

echo "🚀 Starting Gemini Chatbot v7 in Development Mode with Docker..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local and add your API keys"
    echo ""
fi

# Export environment variables from .env.local
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build VNC browser service
echo "🔨 Building VNC Browser Service..."
docker-compose -f docker-compose.dev.yml build vnc-browser

# Start services
echo ""
echo "🚀 Starting services in development mode..."
docker-compose -f docker-compose.dev.yml up -d vnc-browser

# Wait for VNC service to be ready
echo ""
echo "⏳ Waiting for VNC Browser Service to start..."
for i in {1..30}; do
    if curl -s http://localhost:8003/api/vnc-browser/sessions > /dev/null 2>&1; then
        echo "✅ VNC Browser Service is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  VNC Browser Service is taking longer than expected to start"
        echo "   Check logs with: docker-compose -f docker-compose.dev.yml logs vnc-browser"
    fi
    sleep 1
done

# Start Next.js in development mode (outside Docker for better DX)
echo ""
echo "🔧 Starting Next.js in development mode..."
echo ""
echo "📊 Service URLs:"
echo "   🌐 Main App: http://localhost:3000"
echo "   🤖 AI Browser Agent: http://localhost:3000/ai-browser-agent" 
echo "   🖥️  VNC Web Client: http://localhost:6080"
echo "   📡 VNC Direct: vnc://localhost:5900"
echo ""
echo "📋 VNC Browser Service commands:"
echo "   docker-compose -f docker-compose.dev.yml logs -f vnc-browser    # View logs"
echo "   docker-compose -f docker-compose.dev.yml restart vnc-browser    # Restart"
echo "   docker-compose -f docker-compose.dev.yml down                  # Stop all"
echo ""
echo "🔥 Starting Next.js with hot reload..."
echo ""

# Set VNC service URL for Next.js
export VNC_BROWSER_SERVICE_URL=http://localhost:8003

# Run Next.js in foreground
npm run dev