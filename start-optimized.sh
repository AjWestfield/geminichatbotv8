#!/bin/bash

echo "🚀 Starting geminichatbotv7 with optimizations..."

# Set Node.js optimizations
export NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"

# Set production-like optimizations
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Clear Next.js cache for fresh start
echo "Clearing cache..."
rm -rf .next/cache

# Kill any existing server
pkill -f "node.*server" || true

# Start optimized server
echo "Starting optimized server..."
node server-optimized.mjs
