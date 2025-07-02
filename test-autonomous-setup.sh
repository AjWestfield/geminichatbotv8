#!/bin/bash

echo "🔍 Testing Autonomous Task Execution Setup"
echo "=========================================="
echo ""

# Check if the app is running
echo "✓ Checking if app is running on port 3006..."
if lsof -i :3006 | grep -q LISTEN; then
    echo "  ✅ App is running on port 3006"
else
    echo "  ❌ App is NOT running on port 3006"
    echo "  Run: npm run dev"
    exit 1
fi

echo ""
echo "✓ Checking implementation files..."

# Check files
files=(
    "lib/agent-tasks/autonomous-executor.ts"
    "lib/agent-tasks/task-store.ts"
    "app/api/chat/task-middleware.ts"
    "lib/simple-task-executor.ts"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file MISSING"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo ""
    echo "❌ Some implementation files are missing!"
    exit 1
fi

echo ""
echo "✅ All implementation files are present"

echo ""
echo "📋 TESTING INSTRUCTIONS:"
echo ""
echo "1. Open your browser to: http://localhost:3006"
echo ""
echo "2. Open browser console (F12) to watch for logs"
echo ""
echo "3. Copy and paste this exact prompt:"
echo ""
echo "---BEGIN PROMPT---"
cat << 'EOF'
I need you to help me with a multi-step project:

1. Search the web for "latest artificial intelligence breakthroughs 2025"
2. Generate an image of a futuristic AI robot based on the trends
3. Create a short animation of the robot

Please create a task list and execute each step systematically.
EOF
echo "---END PROMPT---"
echo ""
echo "4. EXPECTED BEHAVIOR:"
echo "   ✓ AI creates task list with 3 tasks"
echo "   ✓ Tasks appear in Agent Task Display"
echo "   ✓ 'Approve & Execute' button appears"
echo "   ✓ Click button to start autonomous execution"
echo ""
echo "5. WATCH CONSOLE FOR:"
echo "   - [Chat API] Created X tasks from AI response"
echo "   - [TaskMiddleware] Creating X tasks"
echo "   - [Autonomous Executor] Starting execution"
echo "   - [Autonomous Executor] Task X: in-progress"
echo "   - [Autonomous Executor] Task X: completed"
echo ""
echo "6. VERIFY:"
echo "   ✓ Tasks execute sequentially"
echo "   ✓ Progress messages appear in chat"
echo "   ✓ Real results are generated"
echo ""
echo "🎯 The system should execute all tasks automatically after approval!"
echo ""
