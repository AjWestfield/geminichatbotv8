#!/bin/bash

echo "🔍 Checking what's causing the slowness..."
echo ""

# 1. Test database connection
echo "1. Testing database response time..."
node -e "
const start = Date.now();
fetch('http://localhost:3000/api/chats')
  .then(res => res.json())
  .then(() => {
    const time = Date.now() - start;
    console.log('   Database query time: ' + (time/1000).toFixed(2) + 's');
    if (time > 3000) {
      console.log('   ❌ Database is the bottleneck!');
    } else {
      console.log('   ✅ Database responding normally');
    }
  })
  .catch(err => console.log('   ❌ Error:', err.message));
"

sleep 3

# 2. Check if running in development mode
echo ""
echo "2. Checking Next.js mode..."
ps aux | grep node | grep server | head -1 | grep -q "NODE_ENV=production" && echo "   ✅ Running in production mode" || echo "   ⚠️  Running in development mode (slower)"

# 3. Check cache status
echo ""
echo "3. Checking Next.js cache..."
if [ -d ".next/cache" ]; then
    cache_size=$(du -sh .next/cache 2>/dev/null | cut -f1)
    echo "   Cache size: $cache_size"
else
    echo "   ❌ No cache directory found"
fi

echo ""
echo "📊 Diagnosis:"
echo "   If database query > 3s: Database optimization not applied"
echo "   If in dev mode: Some slowness is expected"
echo ""
echo "🔧 Quick fixes to try:"
echo "   1. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo "   2. Check browser console for errors: Cmd+Option+J (Mac) or Ctrl+Shift+J (Windows)"
echo "   3. Try incognito/private browsing mode"
