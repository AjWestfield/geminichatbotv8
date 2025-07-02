#!/bin/bash

echo "🚀 Applying Instagram Video Thumbnail Fixes..."
echo ""

# Change to project directory
cd "$(dirname "$0")/.."

# Run the fix scripts
echo "📝 Applying chat interface fixes..."
node fixes/fix-instagram-thumbnail-display.mjs

echo ""
echo "🎨 Enhancing Instagram preview components..."
node fixes/enhance-instagram-preview.mjs

echo ""
echo "✅ All fixes applied!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Test with an Instagram video URL"
echo "3. Check the console for detailed thumbnail logs"
echo "4. Visit http://localhost:3001/test-instagram-thumbnail for testing"
echo ""
echo "📝 Full documentation available at: INSTAGRAM_VIDEO_THUMBNAIL_FIX.md"
