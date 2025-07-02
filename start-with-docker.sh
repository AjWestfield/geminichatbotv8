#!/bin/bash

echo "🚀 Starting Gemini Chatbot v7 with AI Browser Agent..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
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
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check service health
echo ""
echo "🔍 Checking service status..."

# Check Next.js app
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Next.js app is running at http://localhost:3000"
else
    echo "⚠️  Next.js app is not responding yet. It may still be starting..."
fi

# Check VNC Browser Service
if curl -s http://localhost:8003/api/vnc-browser/sessions > /dev/null; then
    echo "✅ VNC Browser Service is running"
else
    echo "⚠️  VNC Browser Service is not responding yet"
fi

echo ""
echo "📊 Service URLs:"
echo "   🌐 Main App: http://localhost:3000"
echo "   🤖 AI Browser Agent: http://localhost:3000/ai-browser-agent"
echo "   🖥️  VNC Web Client: http://localhost:6080"
echo "   📡 VNC Direct: vnc://localhost:5900"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f       # View logs"
echo "   docker-compose stop          # Stop services"
echo "   docker-compose down          # Stop and remove containers"
echo "   docker-compose restart       # Restart services"
echo ""
echo "✨ Setup complete! Open http://localhost:3000/ai-browser-agent to start using the AI Browser Agent"