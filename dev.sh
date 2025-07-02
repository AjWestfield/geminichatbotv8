#!/bin/bash

# Development start script for geminichatbotv7
# Ensures Node 20 is used

echo "🚀 Starting GeminiChatbot v7..."

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js 20
nvm use 20

echo ""
echo "🌐 Starting development server..."
npm run dev
