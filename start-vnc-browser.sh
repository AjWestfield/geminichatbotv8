#!/bin/bash

echo "Starting VNC Browser Service..."

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "Running in Docker container"
    cd /app
    supervisord -c /etc/supervisor/conf.d/supervisord.conf
else
    echo "Running locally"
    
    # Check for required dependencies
    if ! command -v Xvfb &> /dev/null; then
        echo "Error: Xvfb not found. Please install it:"
        echo "  Ubuntu/Debian: sudo apt-get install xvfb"
        echo "  macOS: brew install --cask xquartz"
        exit 1
    fi
    
    if ! command -v x11vnc &> /dev/null; then
        echo "Error: x11vnc not found. Please install it:"
        echo "  Ubuntu/Debian: sudo apt-get install x11vnc"
        echo "  macOS: brew install x11vnc"
        exit 1
    fi
    
    # Install Python dependencies if needed
    cd browser-agent
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    echo "Installing dependencies..."
    pip install -r requirements.txt 2>/dev/null || {
        echo "Creating requirements.txt..."
        cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
playwright==1.40.0
Pillow==10.1.0
numpy==1.26.2
python-dotenv==1.0.0
websockets==12.0
EOF
        pip install -r requirements.txt
    }
    
    # Install Playwright browsers
    echo "Installing Playwright browsers..."
    playwright install chromium --with-deps
    
    # Start the VNC browser service
    echo "Starting VNC Browser Service on port 8003..."
    python vnc_browser_service.py
fi