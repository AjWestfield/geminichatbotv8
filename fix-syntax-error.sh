#!/bin/bash

echo "🔧 Fixing FilePreviewModal Syntax Error"
echo "===================================="
echo ""

echo "1️⃣ Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "2️⃣ Checking for syntax issues..."
npx tsc --noEmit components/file-preview-modal.tsx || true

echo ""
echo "3️⃣ Restarting development server..."
echo "Please restart your dev server with: npm run dev"
echo ""

echo "✅ Cache cleared!"
echo ""
echo "If the error persists:"
echo "1. Check for invisible characters in the file"
echo "2. Ensure all imports are correct"
echo "3. Try: npm run dev:clean"