#!/bin/bash

echo "🧹 Cleaning up Docker resources..."
echo ""

# Stop all containers
echo "📦 Stopping containers..."
docker-compose down
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.vnc.yml down

# Remove dangling images
echo ""
echo "🖼️  Removing dangling images..."
docker image prune -f

# Remove unused volumes
echo ""
echo "💾 Removing unused volumes..."
docker volume prune -f

# Show disk usage
echo ""
echo "📊 Docker disk usage:"
docker system df

echo ""
echo "✅ Cleanup complete!"