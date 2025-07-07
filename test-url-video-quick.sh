#!/bin/bash

# Quick test script for URL to Video functionality

echo "🧪 URL to Video Quick Test"
echo "========================="
echo ""

# Check if server is running
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server not running. Start with: npm run dev"
    exit 1
fi

# Test YouTube API
echo ""
echo "Testing YouTube API..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/youtube-download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "quality": "auto"}' \
  | head -c 100)

if [[ $RESPONSE == *"uri"* ]]; then
    echo "✅ YouTube API working"
else
    echo "❌ YouTube API error"
    echo "Response: $RESPONSE"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open http://localhost:3000"
echo "2. Go to Settings → Video → YouTube Download"
echo "3. Enable all options"
echo "4. Copy this URL: https://www.youtube.com/watch?v=jNQXAC9IVRw"
echo "5. Paste in chat"
echo ""
echo "If it doesn't work:"
echo "- Clear browser cache/localStorage"
echo "- Check browser console for errors"
echo "- Make sure you restarted the server after the fix"
