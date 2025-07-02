#!/bin/bash

echo "🚀 Starting PRODUCTION mode server with all optimizations..."
echo ""

# Kill existing server
pkill -f "node.*server" || true
sleep 2

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"
export NEXT_TELEMETRY_DISABLED=1

# Build for production (first time only)
if [ ! -d ".next/standalone" ]; then
    echo "📦 Building for production (this will take a few minutes)..."
    npm run build
fi

# Start production server
echo "✅ Starting production server..."
echo "   - Production mode: FAST"
echo "   - Memory: 2GB"
echo "   - Optimizations: ENABLED"
echo ""

# Use the built standalone server if available
if [ -f ".next/standalone/server.js" ]; then
    cd .next/standalone
    node server.js
else
    # Fallback to optimized server
    node server-optimized.mjs
fi
