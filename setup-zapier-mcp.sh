#!/bin/bash

# Setup script for Zapier MCP integration
echo "🔧 Setting up Zapier MCP integration..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# Check if Zapier credentials are already set
if grep -q "ZAPIER_MCP_API_KEY=YmNh" .env.local; then
    echo "✅ Zapier MCP credentials already configured"
else
    echo "📝 Adding Zapier MCP credentials to .env.local..."
    
    # Backup current .env.local
    cp .env.local .env.local.backup
    
    # Add Zapier credentials if not present
    if ! grep -q "ZAPIER_MCP_SERVER_URL=" .env.local; then
        echo "" >> .env.local
        echo "# Zapier MCP Configuration" >> .env.local
        echo "ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/api/mcp/mcp" >> .env.local
        echo "ZAPIER_MCP_API_KEY=YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==" >> .env.local
    else
        # Update existing entries
        sed -i.bak 's|ZAPIER_MCP_SERVER_URL=.*|ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/api/mcp/mcp|' .env.local
        sed -i.bak 's|ZAPIER_MCP_API_KEY=.*|ZAPIER_MCP_API_KEY=YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==|' .env.local
    fi
    
    echo "✅ Credentials added to .env.local"
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo "1. Run the test script: node test-zapier-mcp.js"
echo "2. Or start the dev server and visit: http://localhost:3000/api/content-library/test-zapier"
echo "3. Check the console output for connection status"
echo ""
echo "📚 Documentation:"
echo "- Zapier MCP: https://mcp.zapier.com"
echo "- Your credentials are now in .env.local"