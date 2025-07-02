# Zapier MCP Integration Guide

## Overview
This guide explains how to set up and use the Zapier Model Context Protocol (MCP) integration in your Gemini Chatbot v7 application.

## Setup Instructions

### 1. Quick Setup
Run the setup script to automatically configure your environment:
```bash
./setup-zapier-mcp.sh
```

### 2. Manual Setup
If you prefer to set up manually, add these to your `.env.local`:
```env
ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/api/mcp/mcp
ZAPIER_MCP_API_KEY=YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==
```

## Testing the Connection

### Option 1: Command Line Test
```bash
node test-zapier-mcp.js
```

### Option 2: Web UI Test
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Visit: http://localhost:3000/api/content-library/test-zapier

### Option 3: Using the API
```bash
curl http://localhost:3000/api/content-library/test-zapier
```

## Understanding the Authentication

The Zapier MCP uses a base64-encoded token that contains:
- Client ID: `bcac564b-60a1-4a84-8d82-5a16eba2043c`
- Client Secret: `7f796e61-f79d-4f68-bd40-baaa91a43285`

This token is sent in the Authorization header with the "Bearer" prefix.

## Troubleshooting

### Common Issues

1. **401 Unauthorized Error**
   - Ensure the API key is correctly set in `.env.local`
   - The key should be the exact base64 string without any modifications
   - Check that the Authorization header includes "Bearer" prefix

2. **404 Not Found Error**
   - Verify the server URL is correct: `https://mcp.zapier.com/api/mcp/mcp`
   - Ensure you're using the correct endpoint path

3. **Connection Timeout**
   - Check your internet connection
   - Verify that your firewall isn't blocking the connection
   - Try the command-line test script for more detailed error messages

4. **Method Not Found**
   - The MCP protocol version might be incompatible
   - Check the console logs for the exact error message

### Debug Steps

1. **Check Environment Variables**
   ```bash
   npm run check-api-keys
   ```

2. **Test Direct HTTP Connection**
   ```bash
   node test-zapier-mcp.js
   ```

3. **Check Server Logs**
   When running the dev server, watch the console for detailed error messages

4. **Verify MCP Server Status**
   Visit the test endpoint to see the full connection status and available tools

## How It Works

1. **Authentication Flow**
   - The client sends the base64 token in the Authorization header
   - Zapier validates the token and establishes the MCP connection
   - The connection uses HTTP streaming for real-time communication

2. **Available Features**
   - List available Zapier actions
   - Publish content to social media platforms
   - Trigger Zapier workflows
   - Check authentication status for connected platforms

3. **Supported Platforms**
   - Instagram
   - YouTube
   - Facebook
   - TikTok
   - X (Twitter)
   - LinkedIn
   - And 8,000+ other apps through Zapier

## Next Steps

Once connected, you can:
1. Use the Content Library to publish generated content
2. Set up automated workflows with Zapier
3. Connect additional platforms through the Zapier dashboard

## Support

- Zapier MCP Documentation: https://mcp.zapier.com
- Zapier Support: https://zapier.com/support
- Model Context Protocol: https://modelcontextprotocol.io