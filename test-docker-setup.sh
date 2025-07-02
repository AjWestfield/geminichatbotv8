#!/bin/bash

echo "🧪 Testing Docker Setup for AI Browser Agent..."
echo ""

# Check Docker
echo "1️⃣ Checking Docker installation..."
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    echo "✅ Docker installed: $docker_version"
else
    echo "❌ Docker not installed"
    exit 1
fi

# Check Docker Compose
echo ""
echo "2️⃣ Checking Docker Compose..."
if docker compose version &> /dev/null; then
    compose_version=$(docker compose version)
    echo "✅ Docker Compose installed: $compose_version"
elif command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version)
    echo "✅ Docker Compose installed: $compose_version"
else
    echo "❌ Docker Compose not installed"
    exit 1
fi

# Check environment file
echo ""
echo "3️⃣ Checking environment configuration..."
if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    
    # Check for required keys
    if grep -q "GEMINI_API_KEY=" .env.local; then
        echo "✅ GEMINI_API_KEY configured"
    else
        echo "⚠️  GEMINI_API_KEY not set (AI features won't work)"
    fi
else
    echo "❌ .env.local not found"
    echo "   Run: cp .env.example .env.local"
    echo "   Then add your API keys"
fi

# Check ports
echo ""
echo "4️⃣ Checking port availability..."
ports=(3000 5900 6080 8003)
all_clear=true

for port in "${ports[@]}"; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is in use"
        all_clear=false
    else
        echo "✅ Port $port is available"
    fi
done

# Summary
echo ""
echo "📊 Summary:"
echo "═══════════"
if [ "$all_clear" = true ] && [ -f .env.local ]; then
    echo "✅ System is ready for Docker deployment!"
    echo ""
    echo "🚀 To start:"
    echo "   Production mode: ./start-with-docker.sh"
    echo "   Development mode: ./dev-with-docker.sh"
else
    echo "⚠️  Please fix the issues above before starting"
fi

echo ""
echo "📚 Docker commands reference:"
echo "   docker-compose ps                    # List running containers"
echo "   docker-compose logs -f               # View logs"
echo "   docker-compose down                  # Stop all services"
echo "   ./docker-cleanup.sh                  # Clean up Docker resources"