#!/bin/bash

echo "🔍 URL Download Fix Verification Script"
echo "======================================"
echo

# Check if dev server is running
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ Dev server is running on port 3000"
else
    echo "❌ Dev server is not running. Please start it with: npm run dev"
    exit 1
fi

echo
echo "📋 Test URLs ready for testing:"
echo "--------------------------------"
echo "TikTok:    https://www.tiktok.com/@pjacefilms/video/7511268853129809183"
echo "YouTube:   https://www.youtube.com/watch?v=dQw4w9WgXcQ"
echo "Instagram: https://www.instagram.com/p/C5YZ3vRsKwC/"
echo "Facebook:  https://www.facebook.com/watch/?v=1234567890"
echo

echo "🧪 To test the fix:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Open DevTools Console (F12)"
echo "3. Copy and paste each URL above into the chat input"
echo "4. Watch for any console errors"
echo

echo "✅ Success Indicators:"
echo "- Videos download without errors"
echo "- No 'Cannot access downloadedFile before initialization' errors"
echo "- Download progress shows in UI"
echo

echo "📄 Test page available at: file://$(pwd)/test-url-manual-fix.html"
echo

# Open test page in default browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open test-url-manual-fix.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open test-url-manual-fix.html 2>/dev/null || echo "Please open test-url-manual-fix.html manually"
fi

echo "📝 Fix summary available at: URL_DOWNLOAD_FIX_SUMMARY.md"