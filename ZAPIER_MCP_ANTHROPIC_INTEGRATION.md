# Zapier MCP Integration with Anthropic API

## Overview

Zapier MCP is designed to work with Anthropic's Messages API using the `mcp_servers` parameter. This allows Claude to directly access Zapier tools for social media management.

## Current Setup

Your environment is configured with:
```env
ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/api/mcp/mcp
ZAPIER_MCP_API_KEY=YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==
ANTHROPIC_API_KEY=<your-anthropic-api-key>
```

## How Zapier MCP Works with Anthropic

According to the Zapier documentation, the integration works by:

1. **Direct API Integration**: Anthropic's Messages API connects directly to Zapier MCP
2. **Authentication**: Uses Bearer token authentication with the provided API key
3. **Protocol**: Uses MCP (Model Context Protocol) over HTTP with streaming support
4. **Headers Required**:
   - `Authorization: Bearer <api-key>`
   - `Accept: application/json, text/event-stream`
   - `Content-Type: application/json`

## Example Usage with Anthropic SDK

```javascript
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: "What tools do you have available?",
    },
  ],
  mcp_servers: [
    {
      type: "url",
      url: "https://mcp.zapier.com/api/mcp/mcp",
      name: "zapier",
      authorization_token: "YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==",
    },
  ],
  betas: ["mcp-client-2025-04-04"],
});
```

## Integration Challenges

### Current Architecture
Your chatbot uses a generic MCP client that connects to various MCP servers. However, Zapier MCP is specifically designed for Anthropic's Messages API with the `mcp_servers` parameter.

### Options for Integration

#### Option 1: Direct Anthropic Integration (Recommended)
When the chatbot detects Claude model usage AND Zapier MCP requests:
1. Use Anthropic SDK directly with `mcp_servers` parameter
2. This ensures proper authentication and protocol handling

#### Option 2: Fix Generic MCP Client
Update the generic MCP client to properly handle Zapier's requirements:
- Correct authentication headers
- Proper streaming support
- Handle MCP protocol messages correctly

## Testing Zapier MCP

### Quick Test with curl
```bash
curl -X POST https://mcp.zapier.com/api/mcp/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "1.0",
      "capabilities": {}
    },
    "id": 1
  }'
```

### Using the Test Endpoint
Visit: http://localhost:3000/api/test-zapier

## Next Steps

1. **Verify Zapier Account Setup**
   - Ensure your social media accounts are connected at https://zapier.com/app/connections
   - Check that the API key is still valid at https://mcp.zapier.com

2. **Consider Integration Approach**
   - For Claude requests: Use Anthropic SDK with mcp_servers
   - For other models: Continue debugging the generic MCP client

3. **Debug Connection Issues**
   - Check server logs for detailed error messages
   - Test with Anthropic SDK directly to verify credentials