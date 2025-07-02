# Zapier MCP Integration Test Guide

## Quick Start

1. **Update your `.env.local` file** with the credentials from `ZAPIER_MCP_CREDENTIALS.md`

2. **Restart your development server**:
   ```bash
   npm run dev
   ```

3. **Open the test page** in your browser:
   ```
   http://localhost:3000/test-zapier-connection.html
   ```

## Testing Steps

### Step 1: Test Connection
1. Click "Test Connection & List Tools"
2. You should see:
   - "Connected to Zapier MCP" status
   - A list of available tools
   - The full JSON response

### Step 2: Discover Available Actions
1. In the "Execute Tool" section:
   - Tool Name: `list_available_actions` (or whatever tool name you discovered)
   - Parameters: `{}`
2. Click "Execute Tool"
3. This will show you what actions are available in your Zapier account

### Step 3: Test Platform Integration
1. Select a platform (e.g., Instagram)
2. Select "Check Authentication" 
3. Click "Test Platform"
4. This will check if your social media account is connected in Zapier

## What to Look For

- **Tool Names**: The actual tool names from Zapier MCP may differ from our assumptions
- **Parameters**: Each tool will have specific parameter requirements
- **Authentication**: You'll need to connect your social media accounts through Zapier's dashboard

## Troubleshooting

### Connection Failed
- Check that your `.env.local` has the correct credentials
- Ensure you've restarted the dev server after adding credentials
- Check the browser console for detailed errors

### No Tools Listed
- The Zapier MCP server might be using different tool discovery methods
- Try executing common tool names like `help`, `list_tools`, or `get_capabilities`

### Authentication Errors
- Make sure your API key is correctly copied
- The API key should be the full base64 string provided

## Next Steps

Once you've discovered the available tools:
1. We'll update the tool names in our code
2. Adjust the parameters for each platform
3. Test actual publishing functionality

The test results will help us understand how to properly integrate with Zapier MCP!