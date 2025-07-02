#!/bin/bash

# Enhanced Browser Agent Service Startup Script
# This script provides robust port management and service startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="Enhanced Browser Agent Service"
PREFERRED_PORT=8001
SCRIPT_NAME="browser_agent_service.py"
MAX_PORT_ATTEMPTS=10

echo -e "${BLUE}🚀 Starting ${SERVICE_NAME}...${NC}"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on port
kill_port_processes() {
    local port=$1
    echo -e "${YELLOW}🔧 Cleaning up processes on port $port...${NC}"
    
    # Get PIDs using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}   Found processes: $pids${NC}"
        
        # Try graceful termination first
        for pid in $pids; do
            if kill -TERM $pid 2>/dev/null; then
                echo -e "${GREEN}   ✅ Sent SIGTERM to process $pid${NC}"
            fi
        done
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill any remaining processes
        local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            echo -e "${YELLOW}   🔨 Force killing remaining processes...${NC}"
            for pid in $remaining_pids; do
                if kill -9 $pid 2>/dev/null; then
                    echo -e "${GREEN}   ✅ Force killed process $pid${NC}"
                fi
            done
        fi
        
        # Final check
        sleep 1
        if check_port $port; then
            echo -e "${RED}   ❌ Failed to free port $port${NC}"
            return 1
        else
            echo -e "${GREEN}   ✅ Successfully freed port $port${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}   ✅ No processes found on port $port${NC}"
        return 0
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local max_attempts=$2
    
    for ((port=start_port; port<start_port+max_attempts; port++)); do
        if ! check_port $port; then
            echo $port
            return 0
        fi
    done
    
    return 1
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "$SCRIPT_NAME" ]; then
        echo -e "${RED}❌ Error: $SCRIPT_NAME not found in current directory${NC}"
        echo -e "${YELLOW}💡 Make sure you're in the browser-agent directory${NC}"
        exit 1
    fi
    
    # Check if preferred port is available
    if check_port $PREFERRED_PORT; then
        echo -e "${YELLOW}⚠️  Port $PREFERRED_PORT is in use${NC}"
        
        # Try to clean up the port
        if kill_port_processes $PREFERRED_PORT; then
            port=$PREFERRED_PORT
        else
            # Find alternative port
            echo -e "${YELLOW}🔍 Finding alternative port...${NC}"
            port=$(find_available_port $((PREFERRED_PORT + 1)) $MAX_PORT_ATTEMPTS)
            
            if [ $? -ne 0 ]; then
                echo -e "${RED}❌ No available ports found in range $((PREFERRED_PORT + 1))-$((PREFERRED_PORT + MAX_PORT_ATTEMPTS))${NC}"
                exit 1
            fi
            
            echo -e "${GREEN}✅ Using alternative port: $port${NC}"
        fi
    else
        port=$PREFERRED_PORT
        echo -e "${GREEN}✅ Port $PREFERRED_PORT is available${NC}"
    fi
    
    # Start the service
    echo -e "${BLUE}🚀 Starting $SERVICE_NAME on port $port...${NC}"
    echo -e "${BLUE}📡 API will be available at: http://localhost:$port${NC}"
    echo -e "${BLUE}📋 Health check: http://localhost:$port/health${NC}"
    echo -e "${BLUE}🛑 Press Ctrl+C to stop the service${NC}"
    echo ""
    
    # Export the port for the Python script to use
    export BROWSER_AGENT_PORT=$port
    
    # Start the Python service
    python $SCRIPT_NAME
}

# Trap Ctrl+C and cleanup
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down $SERVICE_NAME...${NC}"
    # The Python script should handle its own cleanup
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run main function
main "$@"
