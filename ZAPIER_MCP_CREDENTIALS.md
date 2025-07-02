# Zapier MCP Credentials Setup

## IMPORTANT: Update Your .env.local File

Add these lines to your `.env.local` file with the actual Zapier MCP credentials:

```env
ZAPIER_MCP_SERVER_URL=https://mcp.zapier.com/api/mcp/mcp
ZAPIER_MCP_API_KEY=YmNhYzU2NGItNjBhMS00YTg0LThkODItNWExNmViYTIwNDNjOjdmNzk2ZTYxLWY3OWQtNGY2OC1iZDQwLWJhYWE5MWE0MzI4NQ==
```

## Security Note

- Keep your API key secure and never commit it to version control
- The `.env.local` file is already in `.gitignore` for security

## Next Steps

After updating your `.env.local` file:
1. Restart your development server (`npm run dev`)
2. The Zapier MCP integration will be ready to use
3. Connect your social media accounts through Zapier's dashboard
4. Start publishing content from the Library tab!