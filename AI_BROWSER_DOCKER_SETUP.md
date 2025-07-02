# AI Browser Agent - Docker Setup Guide

## 🚀 Quick Start (Recommended)

The easiest way to run the AI Browser Agent is using Docker. This ensures all dependencies are properly installed and configured.

### Prerequisites
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop/))
- At least 4GB of free RAM
- Ports 3000, 5900, 6080, and 8003 available

### Step 1: Configure Environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and add your API keys (at minimum GEMINI_API_KEY)
nano .env.local
```

### Step 2: Start with Docker
```bash
# For production mode (optimized build):
./start-with-docker.sh

# For development mode (with hot reload):
./dev-with-docker.sh
```

### Step 3: Access the Application
- **Main App**: http://localhost:3000
- **AI Browser Agent**: http://localhost:3000/ai-browser-agent
- **VNC Web Client**: http://localhost:6080 (direct browser view)

## 🔧 What Gets Installed

Docker automatically sets up:
- **Next.js Application** - The main web interface
- **VNC Browser Service** - Headless Chrome with VNC streaming
- **All Dependencies** - Xvfb, x11vnc, Playwright, Python packages
- **Networking** - Proper communication between services

## 📁 Docker Commands

### Basic Operations
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Clean up resources
./docker-cleanup.sh
```

### Development Commands
```bash
# Start only VNC browser service (for local Next.js dev)
docker-compose -f docker-compose.dev.yml up vnc-browser

# Rebuild after changes
docker-compose build --no-cache

# Enter container shell
docker-compose exec vnc-browser /bin/bash
```

## 🛠️ Troubleshooting

### Port Already in Use
If you see "port is already in use" errors:
```bash
# Check what's using the port
lsof -i :3000  # or :5900, :6080, :8003

# Kill the process
kill -9 <PID>
```

### Services Not Starting
```bash
# Check service logs
docker-compose logs vnc-browser

# Verify Docker is running
docker ps

# Reset everything
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Browser Not Visible
1. Ensure VNC service is running: `docker-compose ps`
2. Check VNC is accessible: http://localhost:6080
3. Try direct VNC connection: `vnc://localhost:5900`

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   Next.js App   │────▶│  VNC Browser     │────▶│   Chromium      │
│   (Port 3000)   │     │  Service (8003)  │     │   (Xvfb :99)    │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       │                         │
         ▼                       ▼                         ▼
   [User Browser]          [API Calls]              [VNC Stream]
                                │                         │
                                ▼                         ▼
                          [AI Agent]                [noVNC:6080]
```

## 🔐 Security Notes

- Each browser session runs in an isolated container
- No credentials are stored by the system
- VNC connections are local-only by default
- Sessions auto-terminate after timeout

## 📊 Resource Usage

- **CPU**: ~2-4 cores when active
- **RAM**: ~2-4GB per browser session
- **Disk**: ~2GB for Docker images
- **Network**: Minimal (local only)

## 🚦 Testing Your Setup

Run the test script to verify everything is working:
```bash
./test-docker-setup.sh
```

Then test the AI browser:
```bash
node test-ai-browser-agent.js
```

## 🎯 Example Tasks

Once running, try these in the AI Browser Agent:

1. **Simple Search**: "Search for today's weather"
2. **Research**: "Find the top 5 AI news stories today"
3. **Comparison**: "Compare prices for MacBook Pro on different sites"
4. **Data Extraction**: "Get the main headlines from CNN"

## 📚 Additional Resources

- [Main Documentation](BROWSER_AGENT_VNC_SETUP.md)
- [Implementation Details](AI_BROWSER_AGENT_IMPLEMENTATION_SUMMARY.md)
- [Docker Documentation](https://docs.docker.com/)

---

**Note**: The Docker setup is the recommended approach as it ensures consistent behavior across all platforms and handles all dependencies automatically.