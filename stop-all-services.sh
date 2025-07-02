#!/bin/bash

# Script to stop all services cleanly

echo "🛑 Stopping all services..."

# Kill any Next.js processes
echo "Stopping Next.js processes..."
pkill -f "next-server" || true
pkill -f "next dev" || true


# Kill any Node processes on common ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3100 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped"
