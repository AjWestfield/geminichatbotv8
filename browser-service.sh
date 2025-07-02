#!/bin/bash

# Browser-Use Service Manager
# Ensures the browser-use service is always running

ACTION=${1:-status}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Paths
PID_FILE="browser-use.pid"
LOG_FILE="logs/browser-use.log"
SERVICE_SCRIPT="start-browser-use-background.sh"

# Function to check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        fi
    fi
    
    # Also check if something is on port 8002
    if lsof -Pi :8002 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

# Function to get service PID
get_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    else
        lsof -t -i:8002 2>/dev/null | head -1
    fi
}

case "$ACTION" in
    start)
        if is_running; then
            echo -e "${YELLOW}Browser-use service is already running${NC}"
            exit 0
        fi
        
        echo "Starting browser-use service..."
        ./$SERVICE_SCRIPT
        ;;
        
    stop)
        if ! is_running; then
            echo -e "${YELLOW}Browser-use service is not running${NC}"
            exit 0
        fi
        
        PID=$(get_pid)
        echo "Stopping browser-use service (PID: $PID)..."
        kill $PID
        rm -f $PID_FILE
        echo -e "${GREEN}✅ Service stopped${NC}"
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if is_running; then
            PID=$(get_pid)
            echo -e "${GREEN}✅ Browser-use service is running (PID: $PID)${NC}"
            echo "   Port: 8002"
            echo "   Logs: $LOG_FILE"
            echo "   API: http://localhost:8002"
            echo "   Docs: http://localhost:8002/docs"
        else
            echo -e "${RED}❌ Browser-use service is not running${NC}"
            echo "   Start with: $0 start"
        fi
        ;;
        
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo "No log file found at $LOG_FILE"
        fi
        ;;
        
    enable)
        # Add to shell profile for auto-start
        SHELL_PROFILE=""
        if [ -f "$HOME/.zshrc" ]; then
            SHELL_PROFILE="$HOME/.zshrc"
        elif [ -f "$HOME/.bashrc" ]; then
            SHELL_PROFILE="$HOME/.bashrc"
        fi
        
        if [ ! -z "$SHELL_PROFILE" ]; then
            echo "" >> "$SHELL_PROFILE"
            echo "# Auto-start browser-use service for geminichatbotv7" >> "$SHELL_PROFILE"
            echo "cd $PWD && ./browser-service.sh start > /dev/null 2>&1" >> "$SHELL_PROFILE"
            echo -e "${GREEN}✅ Browser-use will auto-start on new terminal sessions${NC}"
            echo "   Added to: $SHELL_PROFILE"
        else
            echo -e "${RED}Could not find shell profile to modify${NC}"
        fi
        ;;
        
    disable)
        # Remove from shell profile
        if [ -f "$HOME/.zshrc" ]; then
            sed -i '' '/# Auto-start browser-use service/,+1d' "$HOME/.zshrc"
        fi
        if [ -f "$HOME/.bashrc" ]; then
            sed -i '' '/# Auto-start browser-use service/,+1d' "$HOME/.bashrc"
        fi
        echo -e "${GREEN}✅ Auto-start disabled${NC}"
        ;;
        
    *)
        echo "Browser-Use Service Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the browser-use service"
        echo "  stop     - Stop the browser-use service"
        echo "  restart  - Restart the browser-use service"
        echo "  status   - Check if service is running"
        echo "  logs     - Follow the service logs"
        echo "  enable   - Enable auto-start on terminal open"
        echo "  disable  - Disable auto-start"
        exit 1
        ;;
esac