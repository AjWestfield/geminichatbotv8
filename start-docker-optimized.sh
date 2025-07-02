#!/bin/bash

# Quick Start Script for Docker Performance Setup

echo "🚀 Starting Docker Performance Setup for geminichatbotv7..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Create .env.docker if it doesn't exist
if [ ! -f .env.docker ]; then
    echo "📝 Creating .env.docker from .env.local..."
    cp .env.local .env.docker
    echo "REDIS_URL=redis://redis:6379" >> .env.docker
    echo "NODE_OPTIONS=--max-old-space-size=2048" >> .env.docker
    echo "✅ .env.docker created"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build the optimized Docker image
echo "🔨 Building optimized Docker image..."
docker-compose -f docker-compose.optimized.yml build

# Start the services
echo "🚀 Starting services..."
docker-compose -f docker-compose.optimized.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.optimized.yml ps

# Display access URLs
echo ""
echo "✅ Setup complete! Access your application at:"
echo "   - Application: http://localhost:3000"
echo "   - Nginx (optimized): http://localhost:80"
echo ""
echo "📊 Monitor performance with:"
echo "   docker stats"
echo ""
echo "📋 View logs with:"
echo "   docker-compose -f docker-compose.optimized.yml logs -f"
echo ""
echo "🛑 To stop:"
echo "   docker-compose -f docker-compose.optimized.yml down"
