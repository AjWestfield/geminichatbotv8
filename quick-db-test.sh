#!/bin/bash

echo "🔍 Quick Database Performance Test..."
echo ""

# Use curl to test the API directly
echo "Testing chat loading speed..."
start_time=$(date +%s%3N)
response=$(curl -s -w "\n%{time_total}" http://localhost:3000/api/chats)
end_time=$(date +%s%3N)
response_time=$(echo "$response" | tail -1)

echo "⏱️  Database response time: ${response_time}s"
echo ""

if (( $(echo "$response_time > 3" | bc -l) )); then
    echo "❌ VERY SLOW - Database optimizations NOT applied!"
    echo ""
    echo "CRITICAL: You must run the database optimization in Supabase:"
    echo "1. Go to: https://supabase.com/dashboard/project/bsocqrwrikfmymklgart/sql/new"
    echo "2. Run each of the 3 SQL scripts I provided"
    echo ""
elif (( $(echo "$response_time > 1" | bc -l) )); then
    echo "⚠️  SLOW - Performance needs improvement"
    echo ""
    echo "Try running in production mode:"
    echo "./start-production.sh"
    echo ""
else
    echo "✅ FAST - Database is optimized!"
    echo ""
    echo "If UI still feels slow, try:"
    echo "1. Clear browser cache (Cmd+Shift+R)"
    echo "2. Run in production mode: ./start-production.sh"
    echo ""
fi

echo "Other things to check:"
echo "- Open browser console (F12) and look for errors"
echo "- Check Network tab for slow requests"
echo "- Try incognito mode to rule out extensions"
