#!/bin/bash

echo "🔍 Verifying chat loading fixes..."
echo ""

# Check if the app is running
echo "1. Checking if app is running on port 3000..."
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:3000
echo ""

# Test the chat API
echo "2. Testing chat list API..."
RESPONSE=$(curl -s http://localhost:3000/api/chats)
if [ $? -eq 0 ]; then
    CHAT_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
    echo "   ✅ API responded successfully"
    echo "   Found $CHAT_COUNT chats"
    
    # Check if any chats have image_thumbnails
    if echo "$RESPONSE" | grep -q '"image_thumbnails"'; then
        echo "   ✅ image_thumbnails field is present!"
    else
        echo "   ❌ image_thumbnails field is missing"
    fi
else
    echo "   ❌ Failed to reach API"
fi

echo ""
echo "3. Manual verification steps:"
echo "   a) Open http://localhost:3000"
echo "   b) Hover over a chat in the sidebar"
echo "   c) You should see:"
echo "      - Chat title"
echo "      - Created/updated dates"  
echo "      - Message and image counts"
echo "      - Up to 6 image thumbnails (if the chat has images)"
echo ""
echo "   d) Click on a chat"
echo "   e) It should load without errors"
echo ""
echo "4. Debug tool: http://localhost:3000/test-chat-loading.html"
echo ""
echo "If issues persist, check the browser console for errors."