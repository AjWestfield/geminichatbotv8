# Zapier MCP Setup Verification Guide

## Current Issue

The Zapier MCP is returning a 401 Unauthorized error with the message "Missing or invalid authorization header". This indicates that the API key might be incorrect or the authentication format has changed.

## Steps to Verify and Fix

### 1. Get Your Unique Zapier MCP Credentials

Visit the Zapier MCP dashboard to get your personal credentials:
1. Go to https://mcp.zapier.com
2. Sign in with your Zapier account
3. You'll receive:
   - A unique MCP endpoint URL (might be different from the generic one)
   - A personal API key/token

### 2. Update Your Credentials

Update your `.env.local` file with the credentials from Zapier:
```env
ZAPIER_MCP_SERVER_URL=<your-unique-mcp-endpoint-url>
ZAPIER_MCP_API_KEY=<your-personal-api-key>
```

### 3. Verify the Authentication Format

The current implementation sends the API key without the "Bearer" prefix, which should be correct for Zapier MCP. However, if Zapier has updated their authentication:

- Check if they now require "Bearer" prefix
- Check if they use a different header name (e.g., "X-API-Key")
- Verify if the API key needs to be base64 encoded

### 4. Test the Connection

After updating credentials, test with:
```bash
source .env.local && export ZAPIER_MCP_SERVER_URL ZAPIER_MCP_API_KEY && node test-zapier-simple.mjs
```

### 5. Connect Your Social Media Accounts

Once the MCP connection works, ensure your social media accounts are connected:
1. Go to https://zapier.com/app/connections
2. Connect:
   - Facebook (both LMG and Aj and Selena pages)
   - Instagram (Aj and Selena account)
   - YouTube (Aj and Selena channel)
3. Grant all necessary permissions

## Alternative Solutions

If the issue persists:

### Option 1: Use Zapier's OAuth Flow
Some MCP servers require OAuth authentication instead of API keys. Check if Zapier MCP has an OAuth setup process.

### Option 2: Contact Zapier Support
The API key format or authentication method might have changed. Contact Zapier support for:
- Current authentication requirements
- Correct API endpoint URL
- Any special headers or parameters needed

### Option 3: Use Standard Zapier API
If MCP continues to have issues, consider using Zapier's standard REST API with webhooks instead of the MCP protocol.

## Code Fix Applied

I've already updated the MCP client to handle Zapier's authentication correctly:
- No "Bearer" prefix for Zapier MCP
- Proper parameter adaptation for tool calls
- Type conversion (numbers to strings) as needed

Once you have the correct credentials, the integration should work properly.