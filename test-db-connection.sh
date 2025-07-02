#!/bin/bash

echo "=== Testing Gemini Chatbot v7 Database Connection ==="
echo ""

# Test the database connection endpoint
echo "1. Testing database connection..."
curl -s http://localhost:3001/api/test-db | jq . || echo "Failed to test database connection"

echo ""
echo "2. Testing persistence status..."
curl -s http://localhost:3001/api/check-persistence | jq . || echo "Failed to check persistence"

echo ""
echo "3. Testing chat list..."
curl -s http://localhost:3001/api/chats | jq . || echo "Failed to get chats"

echo ""
echo "4. Environment variables check..."
if [ -f .env.local ]; then
    echo "✓ .env.local file exists"
    echo "Checking for required variables..."
    grep -q "SUPABASE_URL=" .env.local && echo "✓ SUPABASE_URL is set" || echo "✗ SUPABASE_URL is missing"
    grep -q "SUPABASE_API_KEY=" .env.local && echo "✓ SUPABASE_API_KEY is set" || echo "✗ SUPABASE_API_KEY is missing"
else
    echo "✗ .env.local file not found!"
fi

echo ""
echo "=== Test Complete ===
