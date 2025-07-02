#!/bin/bash

# Installation script for Redis dependencies

echo "📦 Installing Redis dependencies..."

cd /Users/andersonwestfield/Desktop/geminichatbotv7

# Install ioredis for Redis connection
npm install ioredis

echo "✅ Redis dependencies installed!"
echo ""
echo "Now you can run:"
echo "./start-docker-optimized.sh"
